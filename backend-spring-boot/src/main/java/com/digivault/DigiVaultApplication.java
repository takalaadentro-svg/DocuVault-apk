package com.digivault;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * DigiVault Application Main Entrypoint
 * Academic & Architectural Specification:
 * - Spring Boot 2.7.x / Java Backend
 * - MongoDB Atlas
 * - Spring Security with JWT & BCrypt
 * - Spring Scheduler for Expiry Notifications
 * - SHA-256 Cryptographic Document DNA
 */
@SpringBootApplication
@EnableScheduling
@EnableAsync
@EnableMongoAuditing
public class DigiVaultApplication {

    public static void main(String[] args) {
        SpringApplication.run(DigiVaultApplication.class, args);
    }
}
