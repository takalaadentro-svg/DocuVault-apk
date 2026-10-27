package com.digivault.controllers;

import com.digivault.models.DocumentRecord;
import com.digivault.models.ShareToken;
import com.digivault.models.User;
import com.digivault.payload.DocumentDto.DocumentResponse;
import com.digivault.payload.ShareDto.*;
import com.digivault.repositories.DocumentRepository;
import com.digivault.repositories.ShareTokenRepository;
import com.digivault.services.ShareService;
import com.digivault.services.StorageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Base64;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

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

    @Autowired
    private DocumentRepository documentRepository;

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
        List<DocumentRecord> userDocs = documentRepository.findByUserId(user.getId());
        if (userDocs == null || userDocs.isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        List<String> docIds = userDocs.stream().map(DocumentRecord::getId).collect(Collectors.toList());
        List<ShareToken> tokens = shareTokenRepository.findByDocumentIdIn(docIds);
        return ResponseEntity.ok(tokens != null ? tokens : Collections.emptyList());
    }

    @PostMapping("/{shareId}/revoke")
    public ResponseEntity<?> revokeShare(
            @AuthenticationPrincipal User user,
            @PathVariable("shareId") String shareId) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        Optional<ShareToken> tokenOpt = shareTokenRepository.findById(shareId);
        if (tokenOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        ShareToken token = tokenOpt.get();
        // Verify document belongs to current user
        Optional<DocumentRecord> docOpt = documentRepository.findById(token.getDocumentId());
        if (docOpt.isEmpty() || !docOpt.get().getUserId().equals(user.getId())) {
            return ResponseEntity.status(403).body(Collections.singletonMap("detail", "Forbidden: You do not own this shared document"));
        }
        token.setActive(false);
        shareTokenRepository.save(token);
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
            resp.put("preview_url", "/api/v1/share/public/" + token + "/preview" + (pin != null ? "?pin=" + pin : ""));
            resp.put("expires_at", doc.getExpiryDate());
            resp.put("access_count", 1);
            resp.put("max_access_count", 5);

            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }

    private MediaType resolveMediaType(DocumentRecord doc) {
        if (doc.getMimeType() != null && !doc.getMimeType().isBlank()
                && !doc.getMimeType().equalsIgnoreCase("application/octet-stream")) {
            try {
                return MediaType.parseMediaType(doc.getMimeType());
            } catch (Exception ignored) {}
        }
        String name = (doc.getOriginalFilename() != null ? doc.getOriginalFilename() : "").toLowerCase();
        if (name.endsWith(".pdf")) return MediaType.APPLICATION_PDF;
        if (name.endsWith(".png")) return MediaType.IMAGE_PNG;
        if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return MediaType.IMAGE_JPEG;
        if (name.endsWith(".webp")) return MediaType.parseMediaType("image/webp");
        if (name.endsWith(".gif")) return MediaType.IMAGE_GIF;
        if (name.endsWith(".svg")) return MediaType.parseMediaType("image/svg+xml");
        if (name.endsWith(".txt")) return MediaType.TEXT_PLAIN;
        return MediaType.APPLICATION_OCTET_STREAM;
    }

    private Resource resolveDocumentResource(DocumentRecord doc) {
        try {
            Resource resource = storageService.loadFileAsResource(doc.getStoredFilename());
            if (resource != null && resource.exists() && resource.isReadable()) {
                return resource;
            }
        } catch (Exception ex) {
            // Local file wiped on ephemeral host - attempt database restore
        }

        if (doc.getBase64Data() != null && !doc.getBase64Data().isBlank()) {
            try {
                byte[] bytes = Base64.getDecoder().decode(doc.getBase64Data());
                storageService.restoreFile(doc.getStoredFilename(), bytes);
                return new ByteArrayResource(bytes);
            } catch (Exception e) {
                // fall through
            }
        }

        return storageService.loadFileAsResource(doc.getStoredFilename());
    }

    @GetMapping("/public/{token}/download")
    public ResponseEntity<Resource> downloadPublicDocument(
            @PathVariable("token") String token,
            @RequestParam(value = "pin", required = false) String pin) {
        DocumentRecord doc = shareService.accessPublicDocumentRecord(token, pin);
        Resource resource = resolveDocumentResource(doc);
        MediaType mediaType = resolveMediaType(doc);

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.getOriginalFilename() + "\"")
                .body(resource);
    }

    @GetMapping("/public/{token}/preview")
    public ResponseEntity<Resource> previewPublicDocument(
            @PathVariable("token") String token,
            @RequestParam(value = "pin", required = false) String pin) {
        DocumentRecord doc = shareService.accessPublicDocumentRecord(token, pin);
        Resource resource = resolveDocumentResource(doc);
        MediaType mediaType = resolveMediaType(doc);

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + doc.getOriginalFilename() + "\"")
                .body(resource);
    }
}
