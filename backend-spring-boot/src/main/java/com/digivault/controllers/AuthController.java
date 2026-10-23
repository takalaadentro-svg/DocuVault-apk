package com.digivault.controllers;

import com.digivault.models.User;
import com.digivault.payload.AuthDto.*;
import com.digivault.services.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        try {
            TokenResponse tokenResponse = authService.register(req);
            return ResponseEntity.ok(tokenResponse);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@Valid @RequestBody SendOtpRequest req) {
        try {
            Map<String, Object> resp = authService.sendOtp(req.getEmail(), req.getPurpose());
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@Valid @RequestBody VerifyOtpRequest req) {
        try {
            boolean valid = authService.verifyOtp(req.getEmail(), req.getOtp(), req.getPurpose());
            Map<String, Object> resp = new HashMap<>();
            resp.put("status", "success");
            resp.put("message", "Email verified successfully");
            resp.put("verified", valid);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }


    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        try {
            TokenResponse tokenResponse = authService.login(req);
            return ResponseEntity.ok(tokenResponse);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        return ResponseEntity.ok(authService.getUserSummary(user));
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateMe(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, String> body) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        if (body.containsKey("full_name")) {
            user.setFullName(body.get("full_name"));
        }
        if (body.containsKey("phone_number")) {
            user.setPhone(body.get("phone_number"));
        }
        return ResponseEntity.ok(authService.getUserSummary(user));
    }

    @PostMapping("/quick-pin")
    public ResponseEntity<?> setQuickPin(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody QuickPinRequest req) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        try {
            authService.setQuickPin(user, req.getPin());
            Map<String, Object> resp = new HashMap<>();
            resp.put("message", "Quick PIN configured successfully");
            resp.put("has_quick_pin", true);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }

    @PostMapping("/verify-pin")
    public ResponseEntity<?> verifyQuickPin(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody QuickPinRequest req) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        try {
            boolean valid = authService.verifyQuickPin(user, req.getPin());
            if (valid) {
                Map<String, Object> resp = new HashMap<>();
                resp.put("status", "success");
                resp.put("message", "PIN verified successfully");
                return ResponseEntity.ok(resp);
            } else {
                return ResponseEntity.badRequest().body(Collections.singletonMap("detail", "Incorrect Quick PIN"));
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }

    @PostMapping("/biometric")
    public ResponseEntity<?> toggleBiometric(
            @AuthenticationPrincipal User user,
            @RequestBody BiometricToggleRequest req) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        authService.toggleBiometric(user, req.isEnabled());
        Map<String, Object> resp = new HashMap<>();
        resp.put("message", "Biometric preference updated");
        resp.put("biometric_enabled", req.isEnabled());
        return ResponseEntity.ok(resp);
    }
    @PostMapping("/fcm-token")
    public ResponseEntity<?> updateFcmToken(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, String> body) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        authService.updateFcmToken(user, body.get("token"));
        return ResponseEntity.ok(Collections.singletonMap("status", "success"));
    }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody AuthDto.ChangePasswordRequest req) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        try {
            authService.changePassword(user, req.getOldPassword(), req.getNewPassword());
            return ResponseEntity.ok(Collections.singletonMap("message", "Password updated successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }

}
