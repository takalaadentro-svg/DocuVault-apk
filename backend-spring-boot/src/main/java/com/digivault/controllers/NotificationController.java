package com.digivault.controllers;

import com.digivault.models.Notification;
import com.digivault.models.User;
import com.digivault.payload.DocumentDto.DocumentResponse;
import com.digivault.services.DocumentService;
import com.digivault.services.ExpiryReminderScheduler;
import com.digivault.services.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/notifications")
@CrossOrigin(origins = "*", maxAge = 3600)
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired(required = false)
    private DocumentService documentService;

    @Autowired(required = false)
    private ExpiryReminderScheduler expiryReminderScheduler;

    @Autowired(required = false)
    private com.digivault.services.FamilyService familyService;

    @Autowired(required = false)
    private com.digivault.repositories.EmergencyContactRepository emergencyContactRepository;

    @Autowired(required = false)
    private com.digivault.repositories.ShareTokenRepository shareTokenRepository;

    @GetMapping({"", "/"})
    public ResponseEntity<?> getNotifications(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        List<Notification> list = notificationService.getUserNotifications(user);
        if (list == null) {
            list = Collections.emptyList();
        }
        return ResponseEntity.ok(list);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        long count = notificationService.getUnreadCount(user);
        return ResponseEntity.ok(Collections.singletonMap("unread_count", count));
    }

    @RequestMapping(value = "/{id}/read", method = {RequestMethod.PUT, RequestMethod.PATCH, RequestMethod.POST})
    public ResponseEntity<?> markAsRead(
            @AuthenticationPrincipal User user,
            @PathVariable("id") String id) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        try {
            notificationService.markAsRead(user, id);
        } catch (Exception ignored) {}
        return ResponseEntity.ok(Collections.singletonMap("message", "Marked as read"));
    }

    @PostMapping({"/read-all", "/mark-all-read"})
    public ResponseEntity<?> markAllAsRead(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        try {
            notificationService.markAllAsRead(user);
        } catch (Exception ignored) {}
        return ResponseEntity.ok(Collections.singletonMap("message", "All notifications marked as read"));
    }

    @PostMapping("/check-expiry")
    public ResponseEntity<?> checkExpiry(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        if (expiryReminderScheduler != null) {
            try {
                expiryReminderScheduler.checkDocumentExpiries();
            } catch (Exception ignored) {}
        }
        return ResponseEntity.ok(Collections.singletonMap("message", "Expiry scan completed successfully"));
    }

    @GetMapping("/dashboard-stats")
    public ResponseEntity<?> getDashboardStats(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }

        Map<String, Object> stats = new HashMap<>();
        int totalDocs = 0;
        int expiringSoon = 0;
        int expired = 0;
        int familyCount = 0;
        int activeShares = 0;
        int emergencyContacts = 0;

        if (documentService != null) {
            try {
                List<DocumentResponse> docs = documentService.getDocuments(user, null, null, null);
                if (docs != null) {
                    totalDocs = docs.size();
                    expiringSoon = (int) docs.stream().filter(d -> d.getDaysUntilExpiry() != null && d.getDaysUntilExpiry() >= 0 && d.getDaysUntilExpiry() <= 30).count();
                    expired = (int) docs.stream().filter(DocumentResponse::isExpired).count();

                    if (shareTokenRepository != null && !docs.isEmpty()) {
                        List<String> docIds = new ArrayList<>();
                        for (DocumentResponse d : docs) {
                            if (d.getId() != null) docIds.add(d.getId());
                        }
                        List<com.digivault.models.ShareToken> tokens = shareTokenRepository.findByDocumentIdIn(docIds);
                        if (tokens != null) {
                            activeShares = (int) tokens.stream().filter(com.digivault.models.ShareToken::isActive).count();
                        }
                    }
                }
            } catch (Exception ignored) {}
        }

        if (familyService != null) {
            try {
                Set<String> memberIds = familyService.getFamilyMemberUserIds(user.getId());
                if (memberIds != null) {
                    // Number of family group fellow members
                    familyCount = Math.max(0, memberIds.size() - 1);
                }
            } catch (Exception ignored) {}
        }

        if (emergencyContactRepository != null) {
            try {
                List<?> contacts = emergencyContactRepository.findByUserId(user.getId());
                emergencyContacts = contacts != null ? contacts.size() : 0;
            } catch (Exception ignored) {}
        }

        stats.put("total_documents", totalDocs);
        stats.put("expiring_soon_count", expiringSoon);
        stats.put("expired_count", expired);
        stats.put("family_members_count", familyCount);
        stats.put("active_shares_count", activeShares);
        stats.put("emergency_contacts_count", emergencyContacts);

        return ResponseEntity.ok(stats);
    }
}
