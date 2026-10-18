package com.digivault.controllers;

import com.digivault.payload.ApiResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping({"/api/v1/health", "/health"})
@CrossOrigin(origins = "*", maxAge = 3600)
public class HealthController {

    @Value("${spring.application.name:docuvault-backend}")
    private String appName;

    @Value("${digivault.storage.type:local}")
    private String storageType;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getHealth() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("service", appName);
        health.put("framework", "Spring Boot 2.7.18");
        health.put("language", "Java");
        health.put("database", "MongoDB Atlas");
        health.put("storage", storageType.toUpperCase());
        health.put("security", "Spring Security + JJWT + BCrypt");
        health.put("documentDna", "SHA-256 Hashing");
        health.put("ocrEngine", "Python EasyOCR Microservice + REST");
        health.put("timestamp", new Date());

        return ResponseEntity.ok(ApiResponse.ok("DocuVault Spring Boot Backend is operational", health));
    }
}
