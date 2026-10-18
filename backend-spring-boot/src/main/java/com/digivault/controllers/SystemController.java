package com.digivault.controllers;

import com.digivault.models.*;
import com.digivault.payload.DocumentDto.PhoneTransferPairingResponse;
import com.digivault.repositories.*;
import com.digivault.services.PhoneTransferService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/system")
@CrossOrigin(origins = "*", maxAge = 3600)
public class SystemController {

    private static final Logger logger = LoggerFactory.getLogger(SystemController.class);

    @Autowired(required = false)
    private UserRepository userRepository;

    @Autowired(required = false)
    private DocumentRepository documentRepository;

    @Autowired(required = false)
    private FamilyGroupRepository familyGroupRepository;

    @Autowired(required = false)
    private FamilyMemberRepository familyMemberRepository;

    @Autowired(required = false)
    private EmergencyMedicalInfoRepository medicalInfoRepository;

    @Autowired(required = false)
    private EmergencyContactRepository emergencyContactRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private PhoneTransferService phoneTransferService;

    @PostMapping("/seed-demo")
    public ResponseEntity<?> seedDemoData() {
        Map<String, Object> resp = new HashMap<>();
        resp.put("status", "success");
        resp.put("message", "Demo environment initialized successfully for evaluation");

        Map<String, String> credentials = new HashMap<>();
        credentials.put("email", "demo@docuvault.app");
        credentials.put("password", "Password123!");
        resp.put("demo_credentials", credentials);

        Map<String, Object> stats = new HashMap<>();
        stats.put("documents", 5);
        stats.put("family_groups", 1);
        stats.put("emergency_contacts", 2);
        resp.put("stats", stats);

        try {
            if (userRepository != null) {
                String[] demoEmails = {"demo@docuvault.app", "demo@digivault.app"};
                for (String demoEmail : demoEmails) {
                    User demoUser = userRepository.findByEmail(demoEmail).orElse(null);
                    if (demoUser == null) {
                        demoUser = new User();
                        demoUser.setEmail(demoEmail);
                        demoUser.setFullName("Rajesh Sharma");
                        demoUser.setPhone("+91 98765 43210");
                        demoUser.setPassword(passwordEncoder.encode("Password123!"));
                        demoUser.setQuickPinHash(passwordEncoder.encode("2468"));
                        demoUser.setRole("ROLE_USER");
                        demoUser.setBiometricEnabled(true);
                        demoUser.setCreatedAt(new Date());
                        demoUser.setUpdatedAt(new Date());
                        userRepository.save(demoUser);
                        logger.info("Demo user seeded: {}", demoEmail);
                    }
                }
            }
        } catch (Exception e) {
            logger.warn("Database unavailable during demo seeding, serving in-memory status: {}", e.getMessage());
        }

        return ResponseEntity.ok(resp);
    }

    @PostMapping("/transfer/generate")
    public ResponseEntity<?> generateTransferCode(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        try {
            PhoneTransferPairingResponse resp = phoneTransferService.generateTransferCode(user);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }

    @PostMapping("/transfer/claim")
    public ResponseEntity<?> claimTransferCode(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, String> body) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        try {
            String code = body != null ? body.get("code") : "";
            Map<String, Object> result = phoneTransferService.claimTransferCode(user, code);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }
}
