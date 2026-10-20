package com.digivault.services;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.annotation.PostConstruct;
import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * Firebase Cloud Messaging (FCM) Push Notification Service
 * Dispatches real-time background and foreground push notifications
 * using Firebase Admin SDK (HTTP v1 API).
 */
@Service
public class FcmService {

    private static final Logger logger = LoggerFactory.getLogger(FcmService.class);

    @Value("${digivault.firebase.credentials-path:${FIREBASE_CREDENTIALS_PATH:}}")
    private String credentialsPath;

    @Value("${digivault.firebase.credentials-json:${FIREBASE_SERVICE_ACCOUNT_JSON:}}")
    private String credentialsJson;

    private boolean initialized = false;

    @PostConstruct
    public void init() {
        try {
            if (!FirebaseApp.getApps().isEmpty()) {
                this.initialized = true;
                logger.info("FirebaseApp is already initialized.");
                return;
            }

            InputStream serviceAccountStream = null;

            if (StringUtils.hasText(credentialsJson)) {
                serviceAccountStream = new ByteArrayInputStream(credentialsJson.getBytes(StandardCharsets.UTF_8));
                logger.info("Initializing Firebase Admin SDK using FIREBASE_SERVICE_ACCOUNT_JSON environment variable.");
            } else if (StringUtils.hasText(credentialsPath)) {
                serviceAccountStream = new FileInputStream(credentialsPath);
                logger.info("Initializing Firebase Admin SDK using credentials file at: {}", credentialsPath);
            }

            if (serviceAccountStream != null) {
                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(serviceAccountStream))
                        .build();

                FirebaseApp.initializeApp(options);
                this.initialized = true;
                logger.info("Firebase Cloud Messaging (FCM HTTP v1) successfully initialized!");
            } else {
                logger.info("Firebase service account credentials not supplied. FCM operating in simulation mode.");
            }
        } catch (Exception e) {
            logger.warn("Could not initialize Firebase Admin SDK: {}. FCM operating in simulation mode.", e.getMessage());
            this.initialized = false;
        }
    }

    public boolean sendPushNotification(String deviceToken, String title, String body, Map<String, String> data) {
        if (!StringUtils.hasText(deviceToken)) {
            logger.warn("Cannot send push notification: deviceToken is empty.");
            return false;
        }

        if (!initialized) {
            logger.info("FCM simulated push notification: [{}] {} (Recipient device: {})", title, body, deviceToken);
            return true;
        }

        try {
            Notification notification = Notification.builder()
                    .setTitle(title)
                    .setBody(body)
                    .build();

            Message.Builder messageBuilder = Message.builder()
                    .setToken(deviceToken)
                    .setNotification(notification);

            if (data != null && !data.isEmpty()) {
                messageBuilder.putAllData(data);
            }

            String response = FirebaseMessaging.getInstance().send(messageBuilder.build());
            logger.info("Successfully dispatched FCM push notification! Message ID: {}", response);
            return true;
        } catch (Exception e) {
            logger.error("Failed to send FCM push notification to token {}: {}", deviceToken, e.getMessage());
            return false;
        }
    }

    public boolean isInitialized() {
        return initialized;
    }
}
