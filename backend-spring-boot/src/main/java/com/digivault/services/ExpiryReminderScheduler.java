package com.digivault.services;

import com.digivault.models.DocumentRecord;
import com.digivault.models.Notification;
import com.digivault.models.User;
import com.digivault.repositories.DocumentRepository;
import com.digivault.repositories.NotificationRepository;
import com.digivault.repositories.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.text.SimpleDateFormat;
import java.util.*;

/**
 * Expiry Reminder Scheduler - DocuVault 2.0
 * Comprehensive tracking for expired documents and upcoming milestones.
 * Multi-channel delivery: IN_APP, PUSH, EMAIL, SMS/WHATSAPP.
 */
@Service
public class ExpiryReminderScheduler {

    private static final Logger logger = LoggerFactory.getLogger(ExpiryReminderScheduler.class);

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired(required = false)
    private FcmService fcmService;

    private final SimpleDateFormat dateFormat = new SimpleDateFormat("yyyy-MM-dd");

    @Scheduled(cron = "${digivault.scheduler.expiry-cron:0 0 8 * * ?}")
    public void checkDocumentExpiries() {
        logger.info("Executing DocuVault 2.0 scheduled Document Expiry check across all users...");
        List<DocumentRecord> allDocsWithExpiry = documentRepository.findByExpiryDateNotNull();
        if (allDocsWithExpiry == null || allDocsWithExpiry.isEmpty()) {
            return;
        }

        Date now = new Date();
        for (DocumentRecord doc : allDocsWithExpiry) {
            processDocumentExpiry(doc, now);
        }
    }

    public int checkDocumentExpiriesForUser(String userId) {
        if (userId == null || userId.trim().isEmpty()) return 0;
        List<DocumentRecord> userDocs = documentRepository.findByUserIdAndExpiryDateNotNull(userId);
        if (userDocs == null || userDocs.isEmpty()) return 0;

        Date now = new Date();
        int alertCount = 0;
        for (DocumentRecord doc : userDocs) {
            if (processDocumentExpiry(doc, now)) {
                alertCount++;
            }
        }
        return alertCount;
    }

    private boolean processDocumentExpiry(DocumentRecord doc, Date now) {
        if (doc == null || doc.getExpiryDate() == null || doc.getUserId() == null) {
            return false;
        }

        long diffMillis = doc.getExpiryDate().getTime() - now.getTime();
        long daysLeft = (long) Math.ceil((double) diffMillis / (1000.0 * 60.0 * 60.0 * 24.0));
        String formattedDate = dateFormat.format(doc.getExpiryDate());

        String title;
        String message;
        String type;

        if (daysLeft < 0) {
            // Already expired
            long absDays = Math.abs(daysLeft);
            title = String.format("Critical: %s is EXPIRED", doc.getTitle());
            message = String.format("Your document '%s' expired on %s (%d day(s) ago). Immediate renewal or update is required.",
                    doc.getTitle(), formattedDate, absDays);
            type = "DOCUMENT_EXPIRED";
        } else if (daysLeft == 0) {
            // Expires today
            title = String.format("Urgent: %s expires TODAY", doc.getTitle());
            message = String.format("Your document '%s' expires today (%s)! Please renew immediately.",
                    doc.getTitle(), formattedDate);
            type = "EXPIRY_WARNING";
        } else if (daysLeft <= 7) {
            // Urgent: <= 7 days
            title = String.format("Urgent Expiry: %s (%d days left)", doc.getTitle(), daysLeft);
            message = String.format("Your document '%s' will expire in %d day(s) on %s. Please prepare renewal.",
                    doc.getTitle(), daysLeft, formattedDate);
            type = "EXPIRY_WARNING";
        } else if (daysLeft <= 30) {
            // Standard notice: <= 30 days
            title = String.format("Expiry Notice: %s (%d days left)", doc.getTitle(), daysLeft);
            message = String.format("Your document '%s' will expire in %d day(s) on %s. Check renewal checklist.",
                    doc.getTitle(), daysLeft, formattedDate);
            type = "EXPIRY_WARNING";
        } else if (daysLeft <= 90) {
            // Advance notice: <= 90 days
            title = String.format("Advance Expiry Notice: %s (%d days left)", doc.getTitle(), daysLeft);
            message = String.format("Advance reminder: Your document '%s' will expire in %d day(s) on %s.",
                    doc.getTitle(), daysLeft, formattedDate);
            type = "EXPIRY_NOTICE";
        } else {
            // Beyond 90 days - no alert needed yet
            return false;
        }

        // Deduplication: Check if an alert for this document already exists
        List<Notification> existingNotifs = notificationRepository.findByUserIdAndRelatedDocumentId(doc.getUserId(), doc.getId());
        Notification target = null;
        if (existingNotifs != null) {
            for (Notification n : existingNotifs) {
                if ("EXPIRY_ALERT".equals(n.getChannelCategory()) || n.getType().contains("EXPIR")) {
                    target = n;
                    break;
                }
            }
        }

        if (target != null) {
            // Update existing notification with fresh countdown and unread status if days changed
            target.setTitle(title);
            target.setMessage(message);
            target.setType(type);
            target.setCreatedAt(new Date());
            notificationRepository.save(target);
            logger.info("Updated existing expiry notification for '{}' ({} days left)", doc.getTitle(), daysLeft);
        } else {
            Notification notification = new Notification(
                    doc.getUserId(),
                    title,
                    message,
                    type,
                    doc.getId(),
                    "IN_APP",
                    "DELIVERED"
            );
            notification.setChannelCategory("EXPIRY_ALERT");
            notificationRepository.save(notification);
            logger.info("Created new expiry alert for '{}' ({} days left)", doc.getTitle(), daysLeft);
        }

        // Dispatch FCM Push Notification to user's registered phone
        if (fcmService != null && doc.getUserId() != null) {
            try {
                userRepository.findById(doc.getUserId()).ifPresent(u -> {
                    if (u.getFcmToken() != null && !u.getFcmToken().trim().isEmpty()) {
                        Map<String, String> data = new HashMap<>();
                        data.put("documentId", doc.getId());
                        data.put("type", "EXPIRY_ALERT");
                        fcmService.sendPushNotification(u.getFcmToken(), title, message, data);
                    }
                });
            } catch (Exception ex) {
                logger.warn("Could not dispatch FCM expiry push for user {}: {}", doc.getUserId(), ex.getMessage());
            }
        }

        return true;
    }

    public int triggerManualExpiryCheck() {
        checkDocumentExpiries();
        return 1;
    }
}
