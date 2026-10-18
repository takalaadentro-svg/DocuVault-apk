package com.digivault.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * Firebase Cloud Messaging (FCM) Push Notification Service
 * Sends push notifications to mobile client devices (React Native)
 * for document expiry alerts, emergency access triggers, and family invitations.
 */
@Service
public class FcmService {

    private static final Logger logger = LoggerFactory.getLogger(FcmService.class);

    @Value("${digivault.fcm.server-key:}")
    private String fcmServerKey;

    @Value("${digivault.fcm.url:https://fcm.googleapis.com/fcm/send}")
    private String fcmUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public boolean sendPushNotification(String deviceToken, String title, String body, Map<String, String> data) {
        if (fcmServerKey == null || fcmServerKey.trim().isEmpty()) {
            logger.info("FCM Server Key not configured; simulated push notification: [{}] {}", title, body);
            return true;
        }

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "key=" + fcmServerKey);

            Map<String, Object> notificationPayload = new HashMap<>();
            notificationPayload.put("title", title);
            notificationPayload.put("body", body);
            notificationPayload.put("sound", "default");

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("to", deviceToken);
            requestBody.put("notification", notificationPayload);
            if (data != null) {
                requestBody.put("data", data);
            }

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            restTemplate.postForEntity(fcmUrl, entity, String.class);
            logger.info("Successfully dispatched FCM push notification to token: {}", deviceToken);
            return true;
        } catch (Exception e) {
            logger.error("Failed to send FCM push notification: {}", e.getMessage());
            return false;
        }
    }
}
