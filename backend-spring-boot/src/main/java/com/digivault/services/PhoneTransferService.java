package com.digivault.services;

import com.digivault.models.DocumentRecord;
import com.digivault.models.User;
import com.digivault.payload.DocumentDto.PhoneTransferPairingResponse;
import com.digivault.repositories.DocumentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Phone-to-Phone Direct Vault Transfer Service - DocuVault 2.0
 * Facilitates device-to-device migration using short-lived 6-digit codes and checksums.
 */
@Service
public class PhoneTransferService {

    @Autowired
    private DocumentRepository documentRepository;

    private static class TransferSession {
        String transferCode;
        String sourceUserId;
        Date expiresAt;
        int documentCount;
        boolean claimed;

        TransferSession(String transferCode, String sourceUserId, Date expiresAt, int documentCount) {
            this.transferCode = transferCode;
            this.sourceUserId = sourceUserId;
            this.expiresAt = expiresAt;
            this.documentCount = documentCount;
            this.claimed = false;
        }
    }

    private final Map<String, TransferSession> activeSessions = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    public PhoneTransferPairingResponse generateTransferCode(User user) {
        List<DocumentRecord> docs = documentRepository.findByUserId(user.getId());

        int num = 100000 + random.nextInt(900000);
        String code = "DV-" + num;

        long tenMinutesMillis = 10 * 60 * 1000L;
        Date expiresAt = new Date(System.currentTimeMillis() + tenMinutesMillis);

        TransferSession session = new TransferSession(code, user.getId(), expiresAt, docs.size());
        activeSessions.put(code, session);

        String qrData = "docuvault://transfer?code=" + code + "&docs=" + docs.size();

        return new PhoneTransferPairingResponse(code, 600L, qrData, docs.size());
    }

    public Map<String, Object> claimTransferCode(User recipientUser, String code) {
        Map<String, Object> resp = new HashMap<>();
        String normalizedCode = code != null ? code.trim().toUpperCase() : "";

        TransferSession session = activeSessions.get(normalizedCode);
        if (session == null) {
            resp.put("success", false);
            resp.put("message", "Invalid or expired transfer code. Please generate a new code on the source device.");
            return resp;
        }

        if (new Date().after(session.expiresAt)) {
            activeSessions.remove(normalizedCode);
            resp.put("success", false);
            resp.put("message", "Transfer code has expired (10-minute window). Please generate a fresh code.");
            return resp;
        }

        if (session.claimed) {
            resp.put("success", false);
            resp.put("message", "This transfer code has already been claimed.");
            return resp;
        }

        // Transfer records to recipient
        List<DocumentRecord> sourceDocs = documentRepository.findByUserId(session.sourceUserId);
        int transferredCount = 0;

        for (DocumentRecord src : sourceDocs) {
            // Check if already in recipient vault
            List<DocumentRecord> existing = documentRepository.findByUserIdAndSha256Hash(recipientUser.getId(), src.getSha256Hash());
            if (existing.isEmpty()) {
                DocumentRecord copy = new DocumentRecord();
                copy.setUserId(recipientUser.getId());
                copy.setTitle(src.getTitle() + " (Transferred)");
                copy.setCategory(src.getCategory());
                copy.setDocType(src.getDocType());
                copy.setSubtype(src.getSubtype());
                copy.setIssuer(src.getIssuer());
                copy.setHolderName(src.getHolderName());
                copy.setDocNumber(src.getDocNumber());
                copy.setDob(src.getDob());
                copy.setOriginalFilename(src.getOriginalFilename());
                copy.setStoredFilename(src.getStoredFilename());
                copy.setFilePath(src.getFilePath());
                copy.setFileSize(src.getFileSize());
                copy.setMimeType(src.getMimeType());
                copy.setSha256Hash(src.getSha256Hash());
                copy.setOcrText(src.getOcrText());
                copy.setOcrConfidence(src.getOcrConfidence());
                copy.setExpiryDate(src.getExpiryDate());
                copy.setIssueDate(src.getIssueDate());
                copy.setNotes(src.getNotes());
                copy.setCreatedAt(new Date());

                documentRepository.save(copy);
                transferredCount++;
            }
        }

        session.claimed = true;
        activeSessions.remove(normalizedCode);

        resp.put("success", true);
        resp.put("transferredCount", transferredCount);
        resp.put("message", "Successfully migrated " + transferredCount + " encrypted documents to your vault.");
        return resp;
    }
}
