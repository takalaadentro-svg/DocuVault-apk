package com.digivault.controllers;

import com.digivault.models.DocumentRecord;
import com.digivault.models.FamilyInvitation;
import com.digivault.models.User;
import com.digivault.payload.DocumentDto.DocumentResponse;
import com.digivault.payload.FamilyDto.*;
import com.digivault.repositories.DocumentRepository;
import com.digivault.repositories.FamilyInvitationRepository;
import com.digivault.services.DocumentService;
import com.digivault.services.FamilyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping({"/api/v1/family", "/api/v1/family/"})
@CrossOrigin(origins = "*", maxAge = 3600)
public class FamilyController {

    @Autowired
    private FamilyService familyService;

    @Autowired
    private FamilyInvitationRepository familyInvitationRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private DocumentService documentService;

    @Autowired
    private com.digivault.repositories.UserRepository userRepository;

    @GetMapping({"", "/"})
    public ResponseEntity<?> getFamilyGroup(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        return ResponseEntity.ok(familyService.getUserFamilyGroups(user));
    }

    @PostMapping
    public ResponseEntity<?> createFamilyGroup(
            @AuthenticationPrincipal User user,
            @RequestBody(required = false) CreateGroupRequest req) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        String name = (req != null && req.getName() != null && !req.getName().trim().isEmpty())
                ? req.getName().trim()
                : user.getFullName() + "'s Family Vault";
        return ResponseEntity.ok(familyService.createFamilyGroup(user, name));
    }

    @PostMapping({"/{familyId}/invite", "/invite"})
    public ResponseEntity<?> inviteMember(
            @AuthenticationPrincipal User user,
            @PathVariable(value = "familyId", required = false) String familyId,
            @RequestBody Map<String, String> body) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        String email = body != null ? body.getOrDefault("invitee_email", body.get("email")) : null;
        String role = body != null ? body.getOrDefault("role", "MEMBER") : "MEMBER";
        try {
            FamilyInvitation inv = familyService.inviteMember(user, familyId, email, role);
            return ResponseEntity.ok(inv);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }

    @GetMapping("/invitations")
    public ResponseEntity<?> getInvitations(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        return ResponseEntity.ok(familyService.getPendingInvitations(user));
    }

    @PostMapping({"/invitations/{invitationId}/respond", "/accept"})
    public ResponseEntity<?> respondInvitation(
            @AuthenticationPrincipal User user,
            @PathVariable(value = "invitationId", required = false) String invitationId,
            @RequestBody(required = false) Map<String, String> body) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        String token = null;
        String action = "ACCEPT";
        if (body != null) {
            token = body.get("token");
            if (body.containsKey("action")) {
                action = body.get("action");
            }
        }
        if (token == null || token.trim().isEmpty()) {
            token = invitationId;
        }

        try {
            if ("REJECT".equalsIgnoreCase(action) || "DECLINE".equalsIgnoreCase(action)) {
                familyService.declineInvitation(user, token);
                return ResponseEntity.ok(Collections.singletonMap("message", "Invitation declined"));
            }
            boolean success = familyService.acceptInvitation(user, token);
            return ResponseEntity.ok(Collections.singletonMap("message", "Invitation accepted"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }

    @PostMapping("/{familyId}/leave")
    public ResponseEntity<?> leaveFamilyGroup(
            @AuthenticationPrincipal User user,
            @PathVariable("familyId") String familyId) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        try {
            familyService.leaveFamilyGroup(user, familyId);
            return ResponseEntity.ok(Collections.singletonMap("message", "Left family vault successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }

    @DeleteMapping("/{familyId}")
    public ResponseEntity<?> deleteFamilyGroup(
            @AuthenticationPrincipal User user,
            @PathVariable("familyId") String familyId) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        try {
            familyService.deleteFamilyGroup(user, familyId);
            return ResponseEntity.ok(Collections.singletonMap("message", "Family vault deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }

    @DeleteMapping({"/{familyId}/members/{memberUserId}", "/members/{memberUserId}"})
    public ResponseEntity<?> removeMember(
            @AuthenticationPrincipal User user,
            @PathVariable(value = "familyId", required = false) String familyId,
            @PathVariable("memberUserId") String memberUserId) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        try {
            familyService.removeMember(user, familyId, memberUserId);
            return ResponseEntity.ok(Collections.singletonMap("message", "Member removed successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }

    @GetMapping("/shared-with-me")
    public ResponseEntity<?> getSharedWithMe(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        String myUid = (user.getId() != null) ? user.getId().trim() : "";
        Set<String> fellowMemberIds = familyService.getFamilyMemberUserIds(myUid);
        fellowMemberIds.removeIf(id -> id == null || id.trim().isEmpty() || id.equalsIgnoreCase(myUid));
        if (fellowMemberIds.isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        List<DocumentRecord> docs = documentRepository.findByUserIdInAndIsFamilyVault(new ArrayList<>(fellowMemberIds), true);
        List<DocumentResponse> responses = docs.stream().map(doc -> {
            DocumentResponse resp = documentService.toResponse(doc);
            if (userRepository != null && doc.getUserId() != null) {
                userRepository.findById(doc.getUserId()).ifPresent(u -> {
                    if (resp.getHolderName() == null || resp.getHolderName().trim().isEmpty()) {
                        resp.setHolderName(u.getFullName());
                    }
                    if (resp.getIssuer() == null || resp.getIssuer().trim().isEmpty() || "Personal".equalsIgnoreCase(resp.getIssuer()) || "Personal Record".equalsIgnoreCase(resp.getIssuer())) {
                        resp.setIssuer("Shared by " + u.getFullName());
                    }
                });
            }
            return resp;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/shared-by-me")
    public ResponseEntity<?> getSharedByMe(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        List<DocumentRecord> docs = documentRepository.findByUserIdAndIsFamilyVault(user.getId(), true);
        List<DocumentResponse> responses = docs.stream().map(documentService::toResponse).collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping(value = "/invite-redirect", produces = "text/html")
    public ResponseEntity<String> inviteRedirect(@RequestParam(value = "token", required = false) String token) {
        String safeToken = (token != null) ? token.replaceAll("[^a-zA-Z0-9\\-]", "") : "";
        String html = "<!DOCTYPE html>\n"
                + "<html lang=\"en\">\n"
                + "<head>\n"
                + "  <meta charset=\"utf-8\">\n"
                + "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no\">\n"
                + "  <title>Accept Family Invitation - DocuVault</title>\n"
                + "  <meta http-equiv=\"refresh\" content=\"0;url=docuvault://family?token=" + safeToken + "\">\n"
                + "  <style>\n"
                + "    * { box-sizing: border-box; margin: 0; padding: 0; }\n"
                + "    body {\n"
                + "      background-color: #0F172A;\n"
                + "      color: #F8FAFC;\n"
                + "      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;\n"
                + "      display: flex;\n"
                + "      align-items: center;\n"
                + "      justify-content: center;\n"
                + "      min-height: 100vh;\n"
                + "      padding: 24px;\n"
                + "    }\n"
                + "    .card {\n"
                + "      background: #1E293B;\n"
                + "      border: 1px solid #334155;\n"
                + "      border-radius: 24px;\n"
                + "      padding: 32px 24px;\n"
                + "      max-width: 440px;\n"
                + "      width: 100%;\n"
                + "      text-align: center;\n"
                + "      box-shadow: 0 20px 40px rgba(0,0,0,0.5);\n"
                + "    }\n"
                + "    .shield-badge {\n"
                + "      width: 64px;\n"
                + "      height: 64px;\n"
                + "      border-radius: 20px;\n"
                + "      background: linear-gradient(135deg, #0D9488, #2563EB);\n"
                + "      display: inline-flex;\n"
                + "      align-items: center;\n"
                + "      justify-content: center;\n"
                + "      font-size: 32px;\n"
                + "      margin-bottom: 20px;\n"
                + "      box-shadow: 0 8px 24px rgba(13, 148, 136, 0.4);\n"
                + "    }\n"
                + "    h1 { font-size: 24px; font-weight: 800; margin-bottom: 8px; }\n"
                + "    p { font-size: 14px; color: #94A3B8; line-height: 1.5; margin-bottom: 24px; }\n"
                + "    .btn-primary {\n"
                + "      display: block;\n"
                + "      background: linear-gradient(135deg, #0D9488, #2563EB);\n"
                + "      color: #FFFFFF;\n"
                + "      text-decoration: none;\n"
                + "      font-weight: 700;\n"
                + "      font-size: 15px;\n"
                + "      padding: 14px 20px;\n"
                + "      border-radius: 14px;\n"
                + "      margin-bottom: 12px;\n"
                + "      border: none;\n"
                + "      box-shadow: 0 4px 14px rgba(13, 148, 136, 0.4);\n"
                + "      cursor: pointer;\n"
                + "    }\n"
                + "    .btn-secondary {\n"
                + "      display: block;\n"
                + "      width: 100%;\n"
                + "      background: #0F172A;\n"
                + "      color: #2DD4BF;\n"
                + "      border: 1px solid #0D9488;\n"
                + "      text-decoration: none;\n"
                + "      font-weight: 700;\n"
                + "      font-size: 13px;\n"
                + "      padding: 12px 20px;\n"
                + "      border-radius: 14px;\n"
                + "      margin-bottom: 16px;\n"
                + "      cursor: pointer;\n"
                + "    }\n"
                + "    .token-box {\n"
                + "      background: #0F172A;\n"
                + "      border: 1px dashed #475569;\n"
                + "      border-radius: 12px;\n"
                + "      padding: 12px;\n"
                + "      margin-bottom: 20px;\n"
                + "      word-break: break-all;\n"
                + "      font-family: monospace;\n"
                + "      font-size: 13px;\n"
                + "      color: #2DD4BF;\n"
                + "    }\n"
                + "  </style>\n"
                + "</head>\n"
                + "<body>\n"
                + "  <div class=\"card\">\n"
                + "    <div class=\"shield-badge\">&#128737;</div>\n"
                + "    <h1>Docu<span style=\"color:#14B8A6\">Vault</span></h1>\n"
                + "    <p>Opening invitation in DocuVault app on your phone...</p>\n"
                + "    <div class=\"token-box\" id=\"tokenVal\">" + safeToken + "</div>\n"
                + "    <a id=\"launchBtn\" href=\"intent://family?token=" + safeToken + "#Intent;scheme=docuvault;package=com.docuvault.app;end\" class=\"btn-primary\">\n"
                + "      &#128241; Open DocuVault App\n"
                + "    </a>\n"
                + "    <button type=\"button\" onclick=\"copyToken()\" id=\"copyBtn\" class=\"btn-secondary\">\n"
                + "      &#128203; Copy Invitation Token\n"
                + "    </button>\n"
                + "    <p style=\"font-size: 12px; color: #64748B; margin-bottom: 0;\">\n"
                + "      If the app does not open automatically, open <b>DocuVault</b> on your phone, go to <b>Family Vault</b> and tap <b>Enter Token</b>.\n"
                + "    </p>\n"
                + "  </div>\n"
                + "  <script>\n"
                + "    var tok = \"" + safeToken + "\";\n"
                + "    var isAndroid = /Android/i.test(navigator.userAgent);\n"
                + "    var androidIntent = \"intent://family?token=\" + encodeURIComponent(tok) + \"#Intent;scheme=docuvault;package=com.docuvault.app;end\";\n"
                + "    var schemeUrl = \"docuvault://family?token=\" + encodeURIComponent(tok);\n"
                + "    setTimeout(function() {\n"
                + "      if (isAndroid) { window.location.href = androidIntent; }\n"
                + "      else { window.location.href = schemeUrl; }\n"
                + "    }, 80);\n"
                + "    function copyToken() {\n"
                + "      navigator.clipboard.writeText(tok).then(function() {\n"
                + "        document.getElementById('copyBtn').innerText = '✓ Token Copied to Clipboard!';\n"
                + "      }).catch(function() {\n"
                + "        alert('Token: ' + tok);\n"
                + "      });\n"
                + "    }\n"
                + "  </script>\n"
                + "</body>\n"
                + "</html>";
        return ResponseEntity.ok(html);
    }
}
