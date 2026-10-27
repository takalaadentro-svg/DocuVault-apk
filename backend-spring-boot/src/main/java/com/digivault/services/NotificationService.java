package com.digivault.services;

import com.digivault.models.Notification;
import com.digivault.models.User;
import com.digivault.repositories.NotificationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired(required = false)
    private com.digivault.repositories.DocumentRepository documentRepository;

    public List<Notification> getUserNotifications(User user) {
        List<Notification> raw = notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        if (raw == null || raw.isEmpty() || documentRepository == null) {
            return raw != null ? raw : java.util.Collections.emptyList();
        }

        List<Notification> valid = new java.util.ArrayList<>();
        for (Notification n : raw) {
            if (n.getRelatedDocumentId() != null && !n.getRelatedDocumentId().trim().isEmpty()) {
                if (!documentRepository.existsById(n.getRelatedDocumentId())) {
                    try {
                        notificationRepository.deleteById(n.getId());
                    } catch (Exception ignored) {}
                    continue;
                }
            }
            valid.add(n);
        }
        return valid;
    }

    public long getUnreadCount(User user) {
        return notificationRepository.countByUserIdAndIsReadFalse(user.getId());
    }

    public void markAsRead(User user, String notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            if (n.getUserId().equals(user.getId())) {
                n.setRead(true);
                notificationRepository.save(n);
            }
        });
    }

    public void markAllAsRead(User user) {
        List<Notification> unread = notificationRepository.findByUserIdAndIsReadFalse(user.getId());
        for (Notification n : unread) {
            n.setRead(true);
        }
        notificationRepository.saveAll(unread);
    }
}
