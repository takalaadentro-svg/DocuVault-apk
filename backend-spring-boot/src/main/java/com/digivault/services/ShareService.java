package com.digivault.services;

import com.digivault.models.AuditLog;
import com.digivault.models.DocumentRecord;
import com.digivault.models.ShareToken;
import com.digivault.models.User;
import com.digivault.payload.DocumentDto.DocumentResponse;
import com.digivault.payload.ShareDto.*;
import com.digivault.repositories.AuditLogRepository;
import com.digivault.repositories.DocumentRepository;
import com.digivault.repositories.ShareTokenRepository;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.Calendar;
import java.util.Date;
import java.util.Optional;

@Service
public class ShareService {

    private static final Logger logger = LoggerFactory.getLogger(ShareService.class);

    @Autowired
    private ShareTokenRepository shareTokenRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private DocumentService documentService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private AuditLogRepository auditLogRepository;

    public ShareResponse createShareToken(User user, CreateShareRequest req) {
        DocumentRecord doc = documentService.findAndAuthorize(user, req.getDocumentId());

        String token = java.util.UUID.randomUUID().toString().replace("-", "");
        Calendar cal = Calendar.getInstance();
        int hours = req.getExpiresInHours() != null ? req.getExpiresInHours() : 24;
        cal.add(Calendar.HOUR_OF_DAY, hours);

        ShareToken shareToken = new ShareToken();
        shareToken.setDocumentId(doc.getId());
        shareToken.setToken(token);
        shareToken.setExpiresAt(cal.getTime());
        shareToken.setMaxViews(req.getMaxViews() != null ? req.getMaxViews() : 5);
        shareToken.setViewCount(0);
        shareToken.setActive(true);

        if (req.getPin() != null && !req.getPin().trim().isEmpty()) {
            shareToken.setPinHash(passwordEncoder.encode(req.getPin().trim()));
        }

        shareTokenRepository.save(shareToken);

        String shareUrl = "http://localhost:5173/share/" + token;
        String qrBase64 = generateQrCodeBase64(shareUrl, 250, 250);

        ShareResponse response = new ShareResponse();
        response.setToken(token);
        response.setShareUrl(shareUrl);
        response.setQrCodeBase64(qrBase64);
        response.setExpiresAt(shareToken.getExpiresAt());
        response.setMaxViews(shareToken.getMaxViews());
        response.setPinProtected(shareToken.getPinHash() != null);

        return response;
    }

    public DocumentRecord accessPublicDocumentRecord(String token, String pin) {
        Optional<ShareToken> tokenOpt = shareTokenRepository.findByToken(token);
        if (!tokenOpt.isPresent()) {
            throw new RuntimeException("Invalid or non-existent share link.");
        }

        ShareToken shareToken = tokenOpt.get();
        if (!shareToken.isActive()) {
            throw new RuntimeException("This share link is no longer active.");
        }

        Date now = new Date();
        if (shareToken.getExpiresAt() != null && now.after(shareToken.getExpiresAt())) {
            shareToken.setActive(false);
            shareTokenRepository.save(shareToken);
            throw new RuntimeException("This share link has expired.");
        }

        if (shareToken.getMaxViews() > 0 && shareToken.getViewCount() >= shareToken.getMaxViews()) {
            shareToken.setActive(false);
            shareTokenRepository.save(shareToken);
            throw new RuntimeException("Maximum view limit exceeded for this share link.");
        }

        if (shareToken.getPinHash() != null) {
            if (pin == null || pin.trim().isEmpty() || !passwordEncoder.matches(pin.trim(), shareToken.getPinHash())) {
                throw new RuntimeException("PIN verification failed: Invalid PIN for secured share link.");
            }
        }

        // Increment view count
        shareToken.setViewCount(shareToken.getViewCount() + 1);
        if (shareToken.getMaxViews() > 0 && shareToken.getViewCount() >= shareToken.getMaxViews()) {
            shareToken.setActive(false);
        }
        shareTokenRepository.save(shareToken);

        DocumentRecord doc = documentRepository.findById(shareToken.getDocumentId())
                .orElseThrow(() -> new RuntimeException("Shared document not found"));

        AuditLog log = new AuditLog("ANONYMOUS", "PUBLIC_SHARE_ACCESS", doc.getId(), "127.0.0.1", "Public Web Viewer");
        auditLogRepository.save(log);

        return doc;
    }

    public DocumentResponse accessPublicDocument(String token, String pin) {
        DocumentRecord doc = accessPublicDocumentRecord(token, pin);
        return documentService.toResponse(doc);
    }

    public String generateQrCodeBase64(String content, int width, int height) {
        try {
            QRCodeWriter qrCodeWriter = new QRCodeWriter();
            BitMatrix bitMatrix = qrCodeWriter.encode(content, BarcodeFormat.QR_CODE, width, height);

            ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", outputStream);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(outputStream.toByteArray());
        } catch (Exception e) {
            logger.error("Failed to generate QR Code", e);
            return null;
        }
    }
}
