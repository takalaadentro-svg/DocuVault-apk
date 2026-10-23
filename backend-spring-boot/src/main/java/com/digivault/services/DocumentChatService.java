package com.digivault.services;

import com.digivault.models.DocumentRecord;
import com.digivault.models.User;
import com.digivault.payload.DocumentDto.DocumentChatCitation;
import com.digivault.payload.DocumentDto.DocumentChatRequest;
import com.digivault.payload.DocumentDto.DocumentChatResponse;
import com.digivault.repositories.DocumentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Document Chat Service (RAG - Retrieval Augmented Generation)
 * Searches user's authorized documents for relevant OCR passages,
 * synthesizes answers, generates citations, and reports missing information safely.
 */
@Service
public class DocumentChatService {

    @Autowired
    private DocumentRepository documentRepository;

    public DocumentChatResponse askQuestion(User user, DocumentChatRequest request) {
        String question = request.getQuestion();
        if (question == null || question.trim().isEmpty()) {
            return new DocumentChatResponse("Please provide a question about your documents.", Collections.emptyList(), false);
        }

        // Get user documents
        List<DocumentRecord> docs;
        if (request.getDocumentId() != null && !request.getDocumentId().isEmpty()) {
            Optional<DocumentRecord> single = documentRepository.findById(request.getDocumentId());
            if (single.isPresent() && single.get().getUserId().equals(user.getId())) {
                docs = Collections.singletonList(single.get());
            } else {
                return new DocumentChatResponse("Specified document was not found or access is not authorized.", Collections.emptyList(), false);
            }
        } else {
            docs = documentRepository.findByUserId(user.getId());
        }

        if (docs == null || docs.isEmpty()) {
            return new DocumentChatResponse(
                    "You do not have any uploaded documents in your vault yet. Upload your documents (e.g. Aadhaar, Passport, Insurance) to query them.",
                    Collections.emptyList(),
                    false
            );
        }

        String qLower = question.toLowerCase();

        // 1. List / Overview intent
        if (qLower.contains("what document") || qLower.contains("list document") || qLower.contains("all document") || qLower.contains("how many document")) {
            StringBuilder sb = new StringBuilder("You currently have " + docs.size() + " documents registered in your vault:\n");
            for (int i = 0; i < docs.size(); i++) {
                DocumentRecord d = docs.get(i);
                sb.append(i + 1).append(". **").append(d.getTitle()).append("** (").append(d.getCategory() != null ? d.getCategory() : "General").append(")");
                if (d.getDocNumber() != null) sb.append(" [ID: ").append(d.getDocNumber()).append("]");
                if (d.getExpiryDate() != null) sb.append(" (Expires: ").append(d.getExpiryDate().toString()).append(")");
                sb.append("\n");
            }
            List<DocumentChatCitation> citations = new ArrayList<>();
            for (int i = 0; i < Math.min(3, docs.size()); i++) {
                DocumentRecord d = docs.get(i);
                citations.add(new DocumentChatCitation(d.getId(), d.getTitle(), d.getCategory() != null ? d.getCategory() : "General", d.getTitle(), 0.99));
            }
            return new DocumentChatResponse(sb.toString(), citations, true);
        }

        // Tokenize question keywords (filter standard grammatical stopwords, preserving domain keywords)
        Set<String> stopwords = new HashSet<>(Arrays.asList(
                "what", "is", "my", "the", "a", "an", "in", "of", "to", "for", "on", "with", "show", "me", "find",
                "tell", "when", "does", "where", "how", "who", "which", "are", "can", "you", "about"
        ));

        List<String> queryTokens = Arrays.stream(qLower.split("[^a-zA-Z0-9]+"))
                .filter(t -> t.length() > 2 && !stopwords.contains(t))
                .collect(Collectors.toList());

        if (queryTokens.isEmpty()) {
            queryTokens = Arrays.stream(qLower.split("[^a-zA-Z0-9]+"))
                    .filter(t -> t.length() > 2)
                    .collect(Collectors.toList());
        }

        List<ScoredExcerpt> scoredExcerpts = new ArrayList<>();

        for (DocumentRecord doc : docs) {
            String titleLower = doc.getTitle() != null ? doc.getTitle().toLowerCase() : "";
            boolean titleMatchesQuery = queryTokens.stream().anyMatch(t -> titleLower.contains(t));

            // Split OCR text into paragraphs/passages
            String rawText = doc.getOcrText() != null && !doc.getOcrText().isEmpty() ? doc.getOcrText() : doc.getTitle();
            String[] passages = rawText.split("\\n+|\\.\\s+");

            for (String p : passages) {
                String passageClean = p.trim();
                if (passageClean.length() < 3) continue;

                int matchScore = 0;
                String lowerP = passageClean.toLowerCase();
                for (String token : queryTokens) {
                    if (lowerP.contains(token)) {
                        matchScore += 3;
                    }
                }

                if (titleMatchesQuery) {
                    matchScore += 5;
                }

                if (matchScore > 0) {
                    scoredExcerpts.add(new ScoredExcerpt(doc, passageClean, matchScore));
                }
            }

            // Structured fields matching
            checkStructuredFields(doc, qLower, titleMatchesQuery, scoredExcerpts);
        }

        if (scoredExcerpts.isEmpty()) {
            return new DocumentChatResponse(
                    "I searched through your " + docs.size() + " documents, but could not find information regarding '"
                            + question + "'. The requested details are not present in the indexed document text.",
                    Collections.emptyList(),
                    false
            );
        }

        // Sort descending by score
        scoredExcerpts.sort((a, b) -> Integer.compare(b.score, a.score));

        // Top 3 distinct citations
        Map<String, DocumentChatCitation> citationMap = new LinkedHashMap<>();
        for (ScoredExcerpt se : scoredExcerpts) {
            String key = se.doc.getId();
            if (!citationMap.containsKey(key) && citationMap.size() < 3) {
                double conf = Math.min(0.98, 0.70 + (se.score * 0.04));
                citationMap.put(key, new DocumentChatCitation(
                        se.doc.getId(),
                        se.doc.getTitle(),
                        se.doc.getCategory(),
                        se.excerpt.length() > 200 ? se.excerpt.substring(0, 200) + "..." : se.excerpt,
                        conf
                ));
            }
        }

        // Synthesize answer from top hit
        ScoredExcerpt top = scoredExcerpts.get(0);
        String synthesizedAnswer = generateAnswer(question, top.doc, top.excerpt);

        return new DocumentChatResponse(synthesizedAnswer, new ArrayList<>(citationMap.values()), true);
    }

    private void checkStructuredFields(DocumentRecord doc, String qLower, boolean titleMatches, List<ScoredExcerpt> scoredExcerpts) {
        int boost = titleMatches ? 10 : 4;

        if ((qLower.contains("expire") || qLower.contains("validity") || qLower.contains("renewal") || qLower.contains("expiry")) && doc.getExpiryDate() != null) {
            scoredExcerpts.add(new ScoredExcerpt(doc, "Official Expiry Date: " + doc.getExpiryDate().toString(), boost + 5));
        }
        if ((qLower.contains("dob") || qLower.contains("birth") || qLower.contains("born")) && doc.getDob() != null && !doc.getDob().trim().isEmpty()) {
            scoredExcerpts.add(new ScoredExcerpt(doc, "Date of Birth: " + doc.getDob(), boost + 5));
        }
        if ((qLower.contains("number") || qLower.contains("id") || qLower.contains("code") || qLower.contains("card")) && doc.getDocNumber() != null && !doc.getDocNumber().trim().isEmpty()) {
            scoredExcerpts.add(new ScoredExcerpt(doc, "Identification Number: " + doc.getDocNumber(), boost + 6));
        }
        if ((qLower.contains("name") || qLower.contains("holder") || qLower.contains("who")) && doc.getHolderName() != null && !doc.getHolderName().trim().isEmpty()) {
            scoredExcerpts.add(new ScoredExcerpt(doc, "Registered Holder: " + doc.getHolderName(), boost + 4));
        }
    }

    private String generateAnswer(String question, DocumentRecord doc, String excerpt) {
        String q = question.toLowerCase();
        if (q.contains("expire") || q.contains("valid") || q.contains("renewal")) {
            if (doc.getExpiryDate() != null) {
                return String.format("According to your official '%s', it expires on %s.", doc.getTitle(), doc.getExpiryDate().toString());
            }
        }
        if (q.contains("number") || q.contains("id") || q.contains("code")) {
            if (doc.getDocNumber() != null && !doc.getDocNumber().trim().isEmpty()) {
                return String.format("Your %s number is %s (from '%s').",
                        doc.getSubtype() != null ? doc.getSubtype() : doc.getTitle(), doc.getDocNumber(), doc.getTitle());
            }
        }
        if (q.contains("name") || q.contains("holder")) {
            if (doc.getHolderName() != null && !doc.getHolderName().trim().isEmpty()) {
                return String.format("The name recorded on '%s' is %s.", doc.getTitle(), doc.getHolderName());
            }
        }
        if (q.contains("dob") || q.contains("birth")) {
            if (doc.getDob() != null && !doc.getDob().trim().isEmpty()) {
                return String.format("The Date of Birth recorded on '%s' is %s.", doc.getTitle(), doc.getDob());
            }
        }

        return String.format("Based on '%s' (Category: %s): "%s"", doc.getTitle(), doc.getCategory() != null ? doc.getCategory() : "General", excerpt);
    }

    private static class ScoredExcerpt {
        DocumentRecord doc;
        String excerpt;
        int score;

        ScoredExcerpt(DocumentRecord doc, String excerpt, int score) {
            this.doc = doc;
            this.excerpt = excerpt;
            this.score = score;
        }
    }
}
