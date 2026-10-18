package com.digivault.services;

import com.digivault.models.DocumentRecord;
import com.digivault.models.User;
import com.digivault.payload.DocumentDto.DuplicateCheckResponse;
import com.digivault.repositories.DocumentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Duplicate Document Detection Service - DocuVault 2.0
 * Analyzes cryptographic SHA-256 hashes for exact matches,
 * and normalized OCR text for high similarity candidates.
 */
@Service
public class DuplicateDetectionService {

    @Autowired
    private DocumentRepository documentRepository;

    public DuplicateCheckResponse checkDuplicate(User user, String sha256Hash, String ocrText, String title) {
        DuplicateCheckResponse response = new DuplicateCheckResponse();
        response.setDuplicate(false);
        response.setDuplicateType("NONE");
        response.setSimilarityScore(0.0);
        response.setMessage("No duplicates found. Safe to save.");

        List<DocumentRecord> userDocs = documentRepository.findByUserId(user.getId());

        // 1. Exact Cryptographic Hash Match
        if (sha256Hash != null && !sha256Hash.isEmpty()) {
            for (DocumentRecord doc : userDocs) {
                if (sha256Hash.equalsIgnoreCase(doc.getSha256Hash())) {
                    response.setDuplicate(true);
                    response.setDuplicateType("EXACT_HASH");
                    response.setSimilarityScore(1.0);
                    response.setExistingDocumentId(doc.getId());
                    response.setExistingDocumentTitle(doc.getTitle());
                    response.setMessage("An identical copy of this document already exists in your vault: '" + doc.getTitle() + "'.");
                    return response;
                }
            }
        }

        // 2. High Text Similarity Match
        if (ocrText != null && ocrText.length() > 30) {
            String normNew = normalizeText(ocrText);
            Set<String> wordsNew = new HashSet<>(Arrays.asList(normNew.split("\\s+")));

            for (DocumentRecord doc : userDocs) {
                if (doc.getOcrText() != null && doc.getOcrText().length() > 30) {
                    String normDoc = normalizeText(doc.getOcrText());
                    Set<String> wordsDoc = new HashSet<>(Arrays.asList(normDoc.split("\\s+")));

                    double jaccard = calculateJaccardSimilarity(wordsNew, wordsDoc);
                    if (jaccard > 0.80) {
                        response.setDuplicate(true);
                        response.setDuplicateType("TEXT_SIMILARITY");
                        response.setSimilarityScore(Math.round(jaccard * 100.0) / 100.0);
                        response.setExistingDocumentId(doc.getId());
                        response.setExistingDocumentTitle(doc.getTitle());
                        response.setMessage("This document appears to be very similar (" + (int)(jaccard * 100) + "% match) to '"
                                + doc.getTitle() + "'. Would you like to keep both or update the existing file?");
                        return response;
                    }
                }
            }
        }

        return response;
    }

    private String normalizeText(String text) {
        return text.toLowerCase().replaceAll("[^a-z0-9\\s]", " ").replaceAll("\\s+", " ").trim();
    }

    private double calculateJaccardSimilarity(Set<String> set1, Set<String> set2) {
        if (set1.isEmpty() || set2.isEmpty()) return 0.0;
        Set<String> intersection = new HashSet<>(set1);
        intersection.retainAll(set2);

        Set<String> union = new HashSet<>(set1);
        union.addAll(set2);

        return (double) intersection.size() / union.size();
    }
}
