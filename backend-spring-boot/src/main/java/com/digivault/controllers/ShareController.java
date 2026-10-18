package com.digivault.controllers;

import com.digivault.models.DocumentRecord;
import com.digivault.models.ShareToken;
import com.digivault.models.User;
import com.digivault.payload.DocumentDto.DocumentResponse;
import com.digivault.payload.ShareDto.*;
import com.digivault.repositories.ShareTokenRepository;
import com.digivault.services.ShareService;
import com.digivault.services.StorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/share")
@CrossOrigin(origins = "*", maxAge = 3600)
public class ShareController {

    @Autowired
    private ShareService shareService;

    @Autowired
    private StorageService storageService;

    @Autowired
    private ShareTokenRepository shareTokenRepository;

    @PostMapping({"/create", ""})
    public ResponseEntity<?> createShare(
            @AuthenticationPrincipal User user,
            @RequestBody CreateShareRequest req) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        try {
            ShareResponse response = shareService.createShareToken(user, req);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }

    @GetMapping("/active")
    public ResponseEntity<?> getActiveShares(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        List<ShareToken> tokens = shareTokenRepository.findAll();
        return ResponseEntity.ok(tokens);
    }

    @PostMapping("/{shareId}/revoke")
    public ResponseEntity<?> revokeShare(
            @AuthenticationPrincipal User user,
            @PathVariable("shareId") String shareId) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        shareTokenRepository.findById(shareId).ifPresent(t -> {
            t.setActive(false);
            shareTokenRepository.save(t);
        });
        return ResponseEntity.ok(Collections.singletonMap("message", "Share link revoked successfully"));
    }

    @RequestMapping(value = {"/public/{token}", "/view/{token}"}, method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<?> getPublicDocument(
            @PathVariable("token") String token,
            @RequestParam(value = "pin", required = false) String queryPin,
            @RequestBody(required = false) Map<String, String> body) {
        try {
            String pin = queryPin;
            if ((pin == null || pin.trim().isEmpty()) && body != null && body.containsKey("pin")) {
                pin = body.get("pin");
            }
            DocumentResponse doc = shareService.accessPublicDocument(token, pin);

            Map<String, Object> resp = new HashMap<>();
            resp.put("id", doc.getId());
            resp.put("title", doc.getTitle());
            resp.put("category", doc.getCategory());
            resp.put("issuer", doc.getIssuer());
            resp.put("issue_date", doc.getIssueDate());
            resp.put("expiry_date", doc.getExpiryDate());
            resp.put("owner_name", "DigiVault Verified Member");
            resp.put("mime_type", doc.getMimeType() != null ? doc.getMimeType() : "application/pdf");
            resp.put("file_size", doc.getFileSize());
            resp.put("download_url", "/api/v1/share/public/" + token + "/download" + (pin != null ? "?pin=" + pin : ""));
            resp.put("preview_url", "/api/v1/share/public/" + token + "/download" + (pin != null ? "?pin=" + pin : ""));
            resp.put("expires_at", doc.getExpiryDate());
            resp.put("access_count", 1);
            resp.put("max_access_count", 5);

            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }

    @GetMapping("/public/{token}/download")
    public ResponseEntity<Resource> downloadPublicDocument(
            @PathVariable("token") String token,
            @RequestParam(value = "pin", required = false) String pin) {
        DocumentRecord doc = shareService.accessPublicDocumentRecord(token, pin);
        Resource resource = storageService.loadFileAsResource(doc.getStoredFilename());

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(doc.getMimeType() != null ? doc.getMimeType() : "application/octet-stream"))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.getOriginalFilename() + "\"")
                .body(resource);
    }
}
