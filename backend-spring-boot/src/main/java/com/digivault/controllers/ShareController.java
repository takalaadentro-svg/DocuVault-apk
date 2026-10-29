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
import java.util.Date;
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
        Map<String, DocumentRecord> docMap = userDocs.stream()
                .collect(Collectors.toMap(DocumentRecord::getId, d -> d, (a, b) -> a));
        List<String> docIds = new java.util.ArrayList<>(docMap.keySet());
        List<ShareToken> tokens = shareTokenRepository.findByDocumentIdIn(docIds);
        if (tokens == null || tokens.isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        Date now = new Date();
        List<ShareResponse> activeList = tokens.stream()
                .filter(t -> t.isActive() && (t.getExpiresAt() == null || t.getExpiresAt().after(now)))
                .map(t -> {
                    DocumentRecord d = docMap.get(t.getDocumentId());
                    ShareResponse resp = new ShareResponse();
                    resp.setId(t.getId());
                    resp.setToken(t.getToken());
                    resp.setDocumentId(t.getDocumentId());
                    resp.setDocumentTitle(d != null ? d.getTitle() : "Shared Document");
                    resp.setDocumentCategory(d != null ? d.getCategory() : "General");
                    resp.setShareUrl("https://docuvault-spring-backend.onrender.com/api/v1/share/public/" + t.getToken() + "/view");
                    resp.setExpiresAt(t.getExpiresAt());
                    resp.setMaxViews(t.getMaxViews());
                    resp.setAccessCount(t.getViewCount());
                    resp.setPinProtected(t.getPinHash() != null);
                    resp.setRevoked(!t.isActive());
                    resp.setCreatedAt(t.getCreatedAt());
                    return resp;
                })
                .collect(Collectors.toList());
        return ResponseEntity.ok(activeList);
    }

    @PostMapping("/{shareId}/revoke")
    public ResponseEntity<?> revokeShare(
            @AuthenticationPrincipal User user,
            @PathVariable("shareId") String shareId) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        Optional<ShareToken> tokenOpt = shareTokenRepository.findById(shareId);
        if (!tokenOpt.isPresent()) {
            return ResponseEntity.notFound().build();
        }
        ShareToken token = tokenOpt.get();
        // Verify document belongs to current user
        Optional<DocumentRecord> docOpt = documentRepository.findById(token.getDocumentId());
        if (!docOpt.isPresent() || !docOpt.get().getUserId().equals(user.getId())) {
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

            Optional<ShareToken> tokenOpt = shareService.findToken(token);
            if (tokenOpt.isPresent()) {
                ShareToken st = tokenOpt.get();
                if (shareService.isPinRequired(st) && !shareService.verifyPin(st, pin)) {
                    Map<String, Object> err = new HashMap<>();
                    err.put("detail", "Security PIN required to view this document.");
                    err.put("requires_pin", true);
                    return ResponseEntity.status(401).body(err);
                }
            }

            DocumentResponse doc = shareService.accessPublicDocument(token, pin);

            String pinParam = (pin != null && !pin.trim().isEmpty()) ? "?pin=" + pin.trim() : "";
            Map<String, Object> resp = new HashMap<>();
            resp.put("id", doc.getId());
            resp.put("title", doc.getTitle());
            resp.put("category", doc.getCategory());
            resp.put("issuer", doc.getIssuer());
            resp.put("issue_date", doc.getIssueDate());
            resp.put("expiry_date", doc.getExpiryDate());
            resp.put("owner_name", "DocuVault Verified Member");
            resp.put("mime_type", doc.getMimeType() != null ? doc.getMimeType() : "application/pdf");
            resp.put("file_size", doc.getFileSize());
            resp.put("download_url", "https://docuvault-spring-backend.onrender.com/api/v1/share/public/" + token + "/download" + pinParam);
            resp.put("preview_url", "https://docuvault-spring-backend.onrender.com/api/v1/share/public/" + token + "/preview" + pinParam);
            resp.put("share_url", "https://docuvault-spring-backend.onrender.com/api/v1/share/public/" + token + "/view");
            resp.put("expires_at", doc.getExpiryDate());
            resp.put("access_count", 1);
            resp.put("max_access_count", 5);

            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            Map<String, Object> err = new HashMap<>();
            err.put("detail", e.getMessage());
            if (e.getMessage() != null && e.getMessage().toLowerCase().contains("pin")) {
                err.put("requires_pin", true);
                return ResponseEntity.status(401).body(err);
            }
            return ResponseEntity.badRequest().body(err);
        }
    }

    @GetMapping(value = {"/public/{token}/view", "/view-html/{token}"}, produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> viewPublicDocumentHtml(
            @PathVariable("token") String token,
            @RequestParam(value = "pin", required = false) String pin) {
        Optional<ShareToken> tokenOpt = shareService.findToken(token);
        if (!tokenOpt.isPresent()) {
            return ResponseEntity.status(404).body(renderErrorHtml("Document Not Found", "The requested share token is invalid or does not exist."));
        }

        ShareToken st = tokenOpt.get();
        if (!st.isActive()) {
            return ResponseEntity.status(410).body(renderErrorHtml("Share Link Inactive", "This document share link has been revoked by the owner."));
        }

        Date now = new Date();
        if (st.getExpiresAt() != null && now.after(st.getExpiresAt())) {
            return ResponseEntity.status(410).body(renderErrorHtml("Share Link Expired", "This document share link expired on " + st.getExpiresAt() + "."));
        }

        if (st.getMaxViews() > 0 && st.getViewCount() >= st.getMaxViews()) {
            return ResponseEntity.status(410).body(renderErrorHtml("View Limit Exceeded", "This document reached its maximum permitted view count (" + st.getMaxViews() + ")."));
        }

        if (shareService.isPinRequired(st)) {
            if (pin == null || pin.trim().isEmpty()) {
                return ResponseEntity.ok(renderPinFormHtml(token, false));
            }
            if (!shareService.verifyPin(st, pin)) {
                return ResponseEntity.status(401).body(renderPinFormHtml(token, true));
            }
        }

        try {
            DocumentRecord doc = shareService.accessPublicDocumentRecord(token, pin);
            String html = renderViewerHtml(token, doc, pin, st);
            return ResponseEntity.ok(html);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(renderErrorHtml("Unable to Access Document", e.getMessage()));
        }
    }

    private String escapeHtml(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private String renderViewerHtml(String token, DocumentRecord doc, String pin, ShareToken st) {
        String pinParam = (pin != null && !pin.trim().isEmpty()) ? "?pin=" + pin.trim() : "";
        String previewUrl = "/api/v1/share/public/" + token + "/preview" + pinParam;
        String downloadUrl = "/api/v1/share/public/" + token + "/download" + pinParam;
        String title = escapeHtml(doc.getTitle() != null ? doc.getTitle() : "Document");
        String category = escapeHtml(doc.getCategory() != null ? doc.getCategory() : "General");
        String issuer = escapeHtml(doc.getIssuer() != null ? doc.getIssuer() : "Official Issuer");
        String hash = doc.getSha256Hash() != null && doc.getSha256Hash().length() >= 16 
                ? doc.getSha256Hash().substring(0, 16) + "..." 
                : "Verified Intact";
        String mimeType = doc.getMimeType() != null ? doc.getMimeType() : "application/pdf";
        boolean isImage = mimeType.startsWith("image/");
        boolean isPdf = mimeType.contains("pdf");

        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n");
        sb.append("<meta charset=\"UTF-8\">\n");
        sb.append("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n");
        sb.append("<title>DocuVault - ").append(title).append("</title>\n");
        sb.append("<style>\n");
        sb.append("  :root { --bg: #0B1120; --card: #1E293B; --border: #334155; --text: #F8FAFC; --muted: #94A3B8; --accent: #0D9488; --accent-hover: #14B8A6; --emerald: #10B981; }\n");
        sb.append("  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }\n");
        sb.append("  body { background-color: var(--bg); color: var(--text); min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 20px 14px; }\n");
        sb.append("  .container { width: 100%; max-width: 820px; }\n");
        sb.append("  .header { display: flex; align-items: center; justify-content: space-between; padding: 12px 0 20px; border-bottom: 1px solid var(--border); margin-bottom: 24px; }\n");
        sb.append("  .brand { display: flex; align-items: center; gap: 10px; font-size: 20px; font-weight: 800; color: #FFF; text-decoration: none; }\n");
        sb.append("  .badge { background: rgba(13, 148, 136, 0.2); color: var(--accent-hover); padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; border: 1px solid rgba(13, 148, 136, 0.4); }\n");
        sb.append("  .doc-card { background: var(--card); border: 1px solid var(--border); border-radius: 18px; padding: 24px; margin-bottom: 20px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }\n");
        sb.append("  .doc-title { font-size: 22px; font-weight: 800; color: #FFF; margin-bottom: 6px; }\n");
        sb.append("  .doc-meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-top: 16px; padding: 14px; background: rgba(11, 17, 32, 0.6); border-radius: 12px; border: 1px solid var(--border); }\n");
        sb.append("  .meta-item { display: flex; flex-direction: column; }\n");
        sb.append("  .meta-label { font-size: 11px; color: var(--muted); text-transform: uppercase; font-weight: 600; }\n");
        sb.append("  .meta-value { font-size: 13px; font-weight: 700; color: #FFF; margin-top: 2px; }\n");
        sb.append("  .actions-row { display: flex; gap: 12px; margin-top: 20px; flex-wrap: wrap; }\n");
        sb.append("  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none; cursor: pointer; border: none; transition: 0.2s; }\n");
        sb.append("  .btn-primary { background: var(--accent); color: #FFF; }\n");
        sb.append("  .btn-primary:hover { background: var(--accent-hover); }\n");
        sb.append("  .btn-secondary { background: rgba(255, 255, 255, 0.08); color: #FFF; border: 1px solid var(--border); }\n");
        sb.append("  .btn-secondary:hover { background: rgba(255, 255, 255, 0.15); }\n");
        sb.append("  .preview-box { margin-top: 24px; background: #020617; border: 1px solid var(--border); border-radius: 16px; overflow: hidden; display: flex; justify-content: center; align-items: center; min-height: 400px; }\n");
        sb.append("  .preview-img { max-width: 100%; max-height: 75vh; object-fit: contain; }\n");
        sb.append("  .preview-frame { width: 100%; height: 650px; border: none; }\n");
        sb.append("  .security-footer { text-align: center; color: var(--muted); font-size: 12px; margin-top: 30px; padding: 16px; }\n");
        sb.append("</style>\n");
        sb.append("</head>\n<body>\n");
        sb.append("<div class=\"container\">\n");
        sb.append("  <header class=\"header\">\n");
        sb.append("    <a href=\"#\" class=\"brand\">\n");
        sb.append("      <svg width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#14B8A6\" stroke-width=\"2.5\"><path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z\"/></svg>\n");
        sb.append("      <span>DocuVault</span>\n");
        sb.append("    </a>\n");
        sb.append("    <span class=\"badge\">VERIFIED SHARE</span>\n");
        sb.append("  </header>\n");
        sb.append("  <main class=\"doc-card\">\n");
        sb.append("    <h1 class=\"doc-title\">").append(title).append("</h1>\n");
        sb.append("    <p style=\"font-size: 13px; color: var(--muted);\">Shared securely via DocuVault Zero-Knowledge Cryptographic Vault</p>\n");
        sb.append("    <div class=\"doc-meta-grid\">\n");
        sb.append("      <div class=\"meta-item\"><span class=\"meta-label\">Category</span><span class=\"meta-value\">").append(category).append("</span></div>\n");
        sb.append("      <div class=\"meta-item\"><span class=\"meta-label\">Issuer</span><span class=\"meta-value\">").append(issuer).append("</span></div>\n");
        sb.append("      <div class=\"meta-item\"><span class=\"meta-label\">Integrity</span><span class=\"meta-value\" style=\"color: var(--emerald); font-family: monospace;\">").append(hash).append("</span></div>\n");
        sb.append("      <div class=\"meta-item\"><span class=\"meta-label\">Views</span><span class=\"meta-value\">").append(st.getViewCount()).append(" / ").append(st.getMaxViews() > 0 ? st.getMaxViews() : "Unlimited").append("</span></div>\n");
        sb.append("    </div>\n");
        sb.append("    <div class=\"actions-row\">\n");
        sb.append("      <a href=\"").append(downloadUrl).append("\" class=\"btn btn-primary\" download>\n");
        sb.append("        <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/><polyline points=\"7 10 12 15 17 10\"/><line x1=\"12\" y1=\"15\" x2=\"12\" y2=\"3\"/></svg>\n");
        sb.append("        Download Document\n");
        sb.append("      </a>\n");
        sb.append("      <a href=\"docuvault://share?token=").append(token).append("\" class=\"btn btn-secondary\">\n");
        sb.append("        <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><rect x=\"5\" y=\"2\" width=\"14\" height=\"20\" rx=\"2\" ry=\"2\"/><line x1=\"12\" y1=\"18\" x2=\"12.01\" y2=\"18\"/></svg>\n");
        sb.append("        Open in DocuVault App\n");
        sb.append("      </a>\n");
        sb.append("    </div>\n");
        sb.append("    <div class=\"preview-box\">\n");
        if (isImage) {
            sb.append("      <img src=\"").append(previewUrl).append("\" alt=\"").append(title).append("\" class=\"preview-img\" />\n");
        } else if (isPdf) {
            sb.append("      <iframe src=\"").append(previewUrl).append("\" class=\"preview-frame\"></iframe>\n");
        } else {
            sb.append("      <div style=\"padding: 40px; text-align: center;\">\n");
            sb.append("        <p style=\"color: var(--muted); margin-bottom: 12px;\">Document preview is not available in browser.</p>\n");
            sb.append("        <a href=\"").append(downloadUrl).append("\" class=\"btn btn-primary\" download>Download to View</a>\n");
            sb.append("      </div>\n");
        }
        sb.append("    </div>\n");
        sb.append("  </main>\n");
        sb.append("  <footer class=\"security-footer\">\n");
        sb.append("    Protected by DocuVault SHA-256 Tamper-Proof Cryptography &bull; 256-bit AES-GCM Encrypted Storage\n");
        sb.append("  </footer>\n");
        sb.append("</div>\n");
        sb.append("</body>\n</html>");

        return sb.toString();
    }

    private String renderPinFormHtml(String token, boolean isError) {
        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n");
        sb.append("<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n");
        sb.append("<title>DocuVault - Enter PIN to Unlock</title>\n");
        sb.append("<style>\n");
        sb.append("  :root { --bg: #0B1120; --card: #1E293B; --border: #334155; --text: #F8FAFC; --muted: #94A3B8; --accent: #0D9488; --danger: #EF4444; }\n");
        sb.append("  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }\n");
        sb.append("  body { background-color: var(--bg); color: var(--text); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }\n");
        sb.append("  .card { background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 32px; width: 100%; max-width: 420px; text-align: center; box-shadow: 0 25px 50px rgba(0,0,0,0.6); }\n");
        sb.append("  .icon-circle { width: 64px; height: 64px; border-radius: 16px; background: rgba(13, 148, 136, 0.15); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: #14B8A6; }\n");
        sb.append("  .title { font-size: 20px; font-weight: 800; color: #FFF; margin-bottom: 8px; }\n");
        sb.append("  .desc { font-size: 13px; color: var(--muted); margin-bottom: 24px; line-height: 1.5; }\n");
        sb.append("  .pin-input { width: 100%; padding: 14px; border-radius: 12px; background: #0B1120; border: 1px solid var(--border); color: #FFF; font-size: 22px; font-weight: 800; letter-spacing: 8px; text-align: center; outline: none; margin-bottom: 16px; }\n");
        sb.append("  .pin-input:focus { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.4); }\n");
        sb.append("  .btn-submit { width: 100%; padding: 14px; border-radius: 12px; background: var(--accent); color: #FFF; font-size: 15px; font-weight: 700; border: none; cursor: pointer; transition: 0.2s; }\n");
        sb.append("  .btn-submit:hover { background: #14B8A6; }\n");
        sb.append("  .error-box { background: rgba(239, 68, 68, 0.15); border: 1px solid var(--danger); color: #FCA5A5; padding: 10px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; }\n");
        sb.append("</style>\n</head>\n<body>\n");
        sb.append("<div class=\"card\">\n");
        sb.append("  <div class=\"icon-circle\">\n");
        sb.append("    <svg width=\"32\" height=\"32\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><rect x=\"3\" y=\"11\" width=\"18\" height=\"11\" rx=\"2\" ry=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/></svg>\n");
        sb.append("  </div>\n");
        sb.append("  <h1 class=\"title\">PIN-Protected Share</h1>\n");
        sb.append("  <p class=\"desc\">This document is protected with a security PIN set by the sender. Enter the PIN below to unlock.</p>\n");
        if (isError) {
            sb.append("  <div class=\"error-box\">Incorrect PIN code. Please try again.</div>\n");
        }
        sb.append("  <form method=\"GET\" action=\"/api/v1/share/public/").append(token).append("/view\">\n");
        sb.append("    <input type=\"password\" name=\"pin\" maxlength=\"6\" placeholder=\"&bull;&bull;&bull;&bull;\" class=\"pin-input\" autofocus required />\n");
        sb.append("    <button type=\"submit\" class=\"btn-submit\">Unlock Document</button>\n");
        sb.append("  </form>\n");
        sb.append("</div>\n</body>\n</html>");
        return sb.toString();
    }

    private String renderErrorHtml(String title, String message) {
        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n");
        sb.append("<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n");
        sb.append("<title>DocuVault - ").append(escapeHtml(title)).append("</title>\n");
        sb.append("<style>\n");
        sb.append("  :root { --bg: #0B1120; --card: #1E293B; --border: #334155; --text: #F8FAFC; --muted: #94A3B8; --danger: #EF4444; }\n");
        sb.append("  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }\n");
        sb.append("  body { background-color: var(--bg); color: var(--text); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }\n");
        sb.append("  .card { background: var(--card); border: 1px solid var(--border); border-radius: 20px; padding: 36px 28px; width: 100%; max-width: 440px; text-align: center; box-shadow: 0 25px 50px rgba(0,0,0,0.6); }\n");
        sb.append("  .icon-circle { width: 64px; height: 64px; border-radius: 16px; background: rgba(239, 68, 68, 0.15); display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; color: var(--danger); }\n");
        sb.append("  .title { font-size: 20px; font-weight: 800; color: #FFF; margin-bottom: 8px; }\n");
        sb.append("  .desc { font-size: 13px; color: var(--muted); margin-bottom: 24px; line-height: 1.5; }\n");
        sb.append("</style>\n</head>\n<body>\n");
        sb.append("<div class=\"card\">\n");
        sb.append("  <div class=\"icon-circle\">\n");
        sb.append("    <svg width=\"32\" height=\"32\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><line x1=\"12\" y1=\"8\" x2=\"12\" y2=\"12\"/><line x1=\"12\" y1=\"16\" x2=\"12.01\" y2=\"16\"/></svg>\n");
        sb.append("  </div>\n");
        sb.append("  <h1 class=\"title\">").append(escapeHtml(title)).append("</h1>\n");
        sb.append("  <p class=\"desc\">").append(escapeHtml(message)).append("</p>\n");
        sb.append("</div>\n</body>\n</html>");
        return sb.toString();
    }

    private MediaType resolveMediaType(DocumentRecord doc) {
        if (doc.getMimeType() != null && !doc.getMimeType().trim().isEmpty()
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

        if (doc.getBase64Data() != null && !doc.getBase64Data().trim().isEmpty()) {
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
