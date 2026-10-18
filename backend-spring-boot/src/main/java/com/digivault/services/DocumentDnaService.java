package com.digivault.services;

import com.digivault.models.DocumentRecord;
import com.digivault.payload.DocumentDto.DocumentDnaResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.Date;

/**
 * Document DNA Service
 * Provides cryptographic SHA-256 hashing to verify document integrity
 * and detect any unauthorized file tampering or bit rot.
 */
@Service
public class DocumentDnaService {

    private static final Logger logger = LoggerFactory.getLogger(DocumentDnaService.class);

    /**
     * Compute cryptographic SHA-256 hash for byte array
     */
    public String calculateSha256(byte[] data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data);
            return bytesToHex(hash);
        } catch (Exception e) {
            logger.error("Failed to calculate SHA-256 hash", e);
            throw new RuntimeException("SHA-256 calculation failed", e);
        }
    }

    /**
     * Compute cryptographic SHA-256 hash from InputStream
     */
    public String calculateSha256(InputStream inputStream) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[8192];
            int read;
            while ((read = inputStream.read(buffer)) != -1) {
                digest.update(buffer, 0, read);
            }
            return bytesToHex(digest.digest());
        } catch (Exception e) {
            logger.error("Failed to calculate SHA-256 from stream", e);
            throw new RuntimeException("SHA-256 calculation failed", e);
        }
    }

    /**
     * Verify document integrity against stored Document DNA
     */
    public DocumentDnaResponse verifyIntegrity(DocumentRecord document, Path physicalFilePath) {
        try {
            if (!Files.exists(physicalFilePath)) {
                return new DocumentDnaResponse(
                        document.getId(),
                        document.getSha256Hash(),
                        null,
                        false,
                        "Document physical file not found on storage"
                );
            }

            byte[] fileBytes = Files.readAllBytes(physicalFilePath);
            String currentHash = calculateSha256(fileBytes);
            boolean isAuthentic = currentHash.equalsIgnoreCase(document.getSha256Hash());

            String message = isAuthentic
                    ? "Document DNA verified: Cryptographic integrity confirmed. Document is 100% authentic and untampered."
                    : "TAMPER DETECTED: Computed SHA-256 hash does not match original stored DNA hash.";

            DocumentDnaResponse response = new DocumentDnaResponse(
                    document.getId(),
                    document.getSha256Hash(),
                    currentHash,
                    isAuthentic,
                    message
            );
            response.setVerifiedAt(new Date());
            return response;
        } catch (Exception e) {
            logger.error("Error verifying document DNA for doc id: {}", document.getId(), e);
            return new DocumentDnaResponse(
                    document.getId(),
                    document.getSha256Hash(),
                    null,
                    false,
                    "Verification error: " + e.getMessage()
            );
        }
    }

    private String bytesToHex(byte[] hash) {
        StringBuilder hexString = new StringBuilder();
        for (byte b : hash) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) {
                hexString.append('0');
            }
            hexString.append(hex);
        }
        return hexString.toString();
    }
}
