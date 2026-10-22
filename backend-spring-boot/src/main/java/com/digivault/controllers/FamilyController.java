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

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/family")
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

    @GetMapping
    public ResponseEntity<?> getFamilyGroup(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        return ResponseEntity.ok(Collections.singletonList(familyService.getOrCreateFamilyGroup(user)));
    }

    @PostMapping
    public ResponseEntity<?> createFamilyGroup(
            @AuthenticationPrincipal User user,
            @RequestBody CreateGroupRequest req) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        return ResponseEntity.ok(familyService.getOrCreateFamilyGroup(user));
    }

    @PostMapping({"/{familyId}/invite", "/invite"})
    public ResponseEntity<?> inviteMember(
            @AuthenticationPrincipal User user,
            @PathVariable(value = "familyId", required = false) String familyId,
            @RequestBody Map<String, String> body) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        String email = body.getOrDefault("invitee_email", body.get("email"));
        try {
            FamilyInvitation inv = familyService.inviteMember(user, email);
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

    @DeleteMapping("/members/{memberUserId}")
    public ResponseEntity<?> removeMember(
            @AuthenticationPrincipal User user,
            @PathVariable("memberUserId") String memberUserId) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        try {
            familyService.removeMember(user, memberUserId);
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
        List<DocumentRecord> docs = documentRepository.findByUserIdAndIsFamilyVault(user.getId(), true);
        List<DocumentResponse> responses = docs.stream().map(documentService::toResponse).collect(Collectors.toList());
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
}
