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

        if (docs.isEmpty()) {
            return new DocumentChatResponse(
                    "You do not have any uploaded documents yet. Upload your documents to chat and query them.",
                    Collections.emptyList(),
                    false
            );
        }

        // Tokenize question keywords (filter out stopwords)
        Set<String> stopwords = new HashSet<>(Arrays.asList(
                "what", "is", "my", "the", "a", "an", "in", "of", "to", "for", "on", "with", "show", "me", "find",
                "tell", "when", "does", "expire", "where", "how", "number", "card"
        ));

        List<String> queryTokens = Arrays.stream(question.toLowerCase().split("[^a-zA-Z0-9]+"))
                .filter(t -> t.length() > 2 && !stopwords.contains(t))
                .collect(Collectors.toList());

        List<ScoredExcerpt> scoredExcerpts = new ArrayList<>();

        for (DocumentRecord doc : docs) {
            String combinedText = (doc.getTitle() + " " + (doc.getOcrText() != null ? doc.getOcrText() : "") + " "
                    + (doc.getNotes() != null ? doc.getNotes() : "") + " "
                    + (doc.getHolderName() != null ? doc.getHolderName() : "") + " "
                    + (doc.getDocNumber() != null ? doc.getDocNumber() : "")).toLowerCase();

            // Split OCR text into paragraphs/passages
            String rawText = doc.getOcrText() != null && !doc.getOcrText().isEmpty() ? doc.getOcrText() : doc.getTitle();
            String[] passages = rawText.split("\\n+|\\.\\s+");

            for (String p : passages) {
                String passageClean = p.trim();
                if (passageClean.length() < 10) continue;

                int matchScore = 0;
                String lowerP = passageClean.toLowerCase();
                for (String token : queryTokens) {
                    if (lowerP.contains(token)) {
                        matchScore += 2;
                    }
                }

                // Boost if doc title or category matches
                if (queryTokens.stream().anyMatch(t -> doc.getTitle().toLowerCase().contains(t))) {
                    matchScore += 3;
                }

                if (matchScore > 0) {
                    scoredExcerpts.add(new ScoredExcerpt(doc, passageClean, matchScore));
                }
            }

            // Also check structured fields for specific intent (e.g. expiry, dob, doc number)
            checkStructuredFields(doc, question.toLowerCase(), scoredExcerpts);
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
                double conf = Math.min(0.98, 0.65 + (se.score * 0.05));
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

    private void checkStructuredFields(DocumentRecord doc, String qLower, List<ScoredExcerpt> scoredExcerpts) {
        if ((qLower.contains("expire") || qLower.contains("validity") || qLower.contains("renewal")) && doc.getExpiryDate() != null) {
            scoredExcerpts.add(new ScoredExcerpt(doc, "Document expires on " + doc.getExpiryDate().toString(), 8));
        }
        if ((qLower.contains("dob") || qLower.contains("birth")) && doc.getDob() != null) {
            scoredExcerpts.add(new ScoredExcerpt(doc, "Date of Birth recorded as " + doc.getDob(), 8));
        }
        if ((qLower.contains("number") || qLower.contains("id") || qLower.contains("code")) && doc.getDocNumber() != null) {
            scoredExcerpts.add(new ScoredExcerpt(doc, "Document identification number: " + doc.getDocNumber(), 8));
        }
        if ((qLower.contains("name") || qLower.contains("holder")) && doc.getHolderName() != null) {
            scoredExcerpts.add(new ScoredExcerpt(doc, "Document holder name: " + doc.getHolderName(), 8));
        }
    }

    private String generateAnswer(String question, DocumentRecord doc, String excerpt) {
        String q = question.toLowerCase();
        if (q.contains("expire") || q.contains("valid")) {
            if (doc.getExpiryDate() != null) {
                return String.format("According to your '%s', it expires on %s.", doc.getTitle(), doc.getExpiryDate().toString());
            }
        }
        if (q.contains("number") || q.contains("id")) {
            if (doc.getDocNumber() != null) {
                return String.format("Your %s number is %s (from '%s').",
                        doc.getSubtype() != null ? doc.getSubtype() : doc.getTitle(), doc.getDocNumber(), doc.getTitle());
            }
        }
        if (q.contains("name") || q.contains("holder")) {
            if (doc.getHolderName() != null) {
                return String.format("The name recorded on '%s' is %s.", doc.getTitle(), doc.getHolderName());
            }
        }

        return String.format("Based on '%s' (Category: %s): \"%s\"", doc.getTitle(), doc.getCategory(), excerpt);
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
