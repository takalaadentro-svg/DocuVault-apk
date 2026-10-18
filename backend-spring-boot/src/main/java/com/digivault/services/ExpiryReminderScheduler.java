package com.digivault.services;

import com.digivault.models.DocumentRecord;
import com.digivault.models.Notification;
import com.digivault.repositories.DocumentRepository;
import com.digivault.repositories.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Expiry Reminder Scheduler - DocuVault 2.0
 * Configurable milestones: 180, 90, 60, 30, 14, 7, and 1 day before expiry.
 * Multi-channel delivery: IN_APP, PUSH, EMAIL, SMS/WHATSAPP.
 */
@Service
public class ExpiryReminderScheduler {

    private static final Logger logger = LoggerFactory.getLogger(ExpiryReminderScheduler.class);

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired(required = false)
    private JavaMailSender mailSender;

    // Configurable milestones in days: 180, 90, 60, 30, 14, 7, 1
    private static final List<Integer> REMINDER_MILESTONES = Arrays.asList(180, 90, 60, 30, 14, 7, 1);

    @Scheduled(cron = "${digivault.scheduler.expiry-cron:0 0 8 * * ?}")
    public void checkDocumentExpiries() {
        logger.info("Executing DocuVault 2.0 scheduled Document Expiry check...");
        Date now = new Date();

        // 180 days window
        Calendar cal180 = Calendar.getInstance();
        cal180.setTime(now);
        cal180.add(Calendar.DAY_OF_YEAR, 180);
        Date maxWindow = cal180.getTime();

        List<DocumentRecord> expiringDocs = documentRepository.findByExpiryDateBetween(now, maxWindow);

        for (DocumentRecord doc : expiringDocs) {
            long diffMillis = doc.getExpiryDate().getTime() - now.getTime();
            long daysLeft = diffMillis / (1000 * 60 * 60 * 24);

            // Match closest milestone or trigger if within milestone window
            if (isMilestoneDay(daysLeft)) {
                String title = String.format("Expiry Alert: %s (%d days left)", doc.getTitle(), daysLeft);
                String message = String.format("Your %s '%s' will expire in %d day(s). Please review your renewal checklist.",
                        doc.getSubtype() != null ? doc.getSubtype() : "document", doc.getTitle(), daysLeft);

                Notification notification = new Notification(
                        doc.getUserId(),
                        title,
                        message,
                        "EXPIRY_WARNING",
                        doc.getId(),
                        "IN_APP",
                        "DELIVERED"
                );
                notification.setChannelCategory("EXPIRY_ALERT");
                notificationRepository.save(notification);

                logger.info("Sent expiry milestone alert ({} days left) for: {}", daysLeft, doc.getTitle());
            }
        }
    }

    private boolean isMilestoneDay(long daysLeft) {
        for (int m : REMINDER_MILESTONES) {
            if (daysLeft == m || (daysLeft <= m && daysLeft >= m - 1)) {
                return true;
            }
        }
        return false;
    }

    public int triggerManualExpiryCheck() {
        checkDocumentExpiries();
        return 1;
    }
}
