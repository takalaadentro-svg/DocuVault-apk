package com.digivault.controllers;

import com.digivault.models.DocumentRecord;
import com.digivault.models.DocumentVersion;
import com.digivault.models.User;
import com.digivault.payload.DocumentDto.*;
import com.digivault.services.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Base64;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/documents")
@CrossOrigin(origins = "*", maxAge = 3600)
public class DocumentController {

    @Autowired
    private DocumentService documentService;

    @Autowired
    private OcrIntegrationService ocrIntegrationService;

    @Autowired
    private StorageService storageService;

    @Autowired
    private DocumentChatService documentChatService;

    @Autowired
    private DocumentPackService documentPackService;

    @Autowired
    private ConsistencyCheckerService consistencyCheckerService;

    @Autowired
    private DuplicateDetectionService duplicateDetectionService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadDocument(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "doc_type", required = false) String docType,
            @RequestParam(value = "subtype", required = false) String subtype,
            @RequestParam(value = "issuer", required = false) String issuer,
            @RequestParam(value = "holder_name", required = false) String holderName,
            @RequestParam(value = "doc_number", required = false) String docNumber,
            @RequestParam(value = "dob", required = false) String dob,
            @RequestParam(value = "notes", required = false) String notes,
            @RequestParam(value = "ocr_text", required = false) String ocrText,
            @RequestParam(value = "is_family_vault", required = false, defaultValue = "false") Boolean isFamilyVault,
            @RequestParam(value = "is_emergency_eligible", required = false, defaultValue = "false") Boolean isEmergencyEligible,
            @RequestParam(value = "is_offline_available", required = false, defaultValue = "false") Boolean isOfflineAvailable,
            @RequestParam(value = "expiry_date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) Date expiryDate,
            @RequestParam(value = "issue_date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) Date issueDate) {

        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }

        try {
            DocumentResponse response = documentService.uploadDocument(
                    user, file, title, category, docType, subtype, issuer,
                    holderName, docNumber, dob, notes, ocrText,
                    isFamilyVault, isEmergencyEligible, isOfflineAvailable, expiryDate, issueDate
            );
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getDocuments(
            @AuthenticationPrincipal User user,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "is_family_vault", required = false) Boolean isFamilyVault,
            @RequestParam(value = "is_emergency_eligible", required = false) Boolean isEmergencyEligible,
            @RequestParam(value = "query", required = false) String query,
            @RequestParam(value = "search", required = false) String search) {

        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }

        String searchTerm = query != null ? query : search;
        if (searchTerm != null && !searchTerm.trim().isEmpty()) {
            List<DocumentResponse> results = documentService.searchDocuments(user, searchTerm);
            return ResponseEntity.ok(results);
        }

        List<DocumentResponse> docs = documentService.getDocuments(user, category, isFamilyVault, isEmergencyEligible);
        return ResponseEntity.ok(docs);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getDocumentById(
            @AuthenticationPrincipal User user,
            @PathVariable("id") String id) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        try {
            return ResponseEntity.ok(documentService.getDocumentById(user, id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateDocument(
            @AuthenticationPrincipal User user,
            @PathVariable("id") String id,
            @RequestBody Map<String, Object> body) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        try {
            ObjectMapper om = new ObjectMapper();
            DocumentUpdateRequest req = om.convertValue(body, DocumentUpdateRequest.class);

            // Resilient fallback: ensure is_family_vault and is_emergency_eligible are explicitly captured
            for (String key : Arrays.asList("is_family_vault", "isFamilyVault", "familyVault")) {
                if (body.containsKey(key) && body.get(key) != null) {
                    boolean val = Boolean.parseBoolean(String.valueOf(body.get(key)));
                    req.setIsFamilyVault(val);
                    req.setFamilyVault(val);
                    break;
                }
            }

            for (String key : Arrays.asList("is_emergency_eligible", "isEmergencyEligible", "emergencyEligible")) {
                if (body.containsKey(key) && body.get(key) != null) {
                    boolean val = Boolean.parseBoolean(String.valueOf(body.get(key)));
                    req.setIsEmergencyEligible(val);
                    req.setEmergencyEligible(val);
                    break;
                }
            }

            return ResponseEntity.ok(documentService.updateDocument(user, id, req));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDocument(
            @AuthenticationPrincipal User user,
            @PathVariable("id") String id) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        try {
            documentService.deleteDocument(user, id);
            return ResponseEntity.ok(Collections.singletonMap("message", "Document deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }

    @RequestMapping(value = "/{id}/verify-dna", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<?> verifyDocumentDna(
            @AuthenticationPrincipal User user,
            @PathVariable("id") String id) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        try {
            DocumentDnaResponse dnaResponse = documentService.verifyDocumentDna(user, id);
            DocumentRecord doc = documentService.findAndAuthorize(user, id);
            dnaResponse.setTitle(doc.getTitle());
            return ResponseEntity.ok(dnaResponse);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }

    @RequestMapping(value = {"/ocr-extract", "/ocr-scan"}, method = RequestMethod.POST, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> ocrScan(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        try {
            OcrScanResponse response = ocrIntegrationService.extractTextAndSuggestCategory(file);
            response.setFileSize(file.getSize());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }

    // --- DocuVault 2.0 Feature Endpoints ---

    @PostMapping("/chat")
    public ResponseEntity<?> chatWithDocuments(
            @AuthenticationPrincipal User user,
            @RequestBody DocumentChatRequest req) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        try {
            DocumentChatResponse resp = documentChatService.askQuestion(user, req);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }

    @GetMapping("/packs")
    public ResponseEntity<?> getDocumentPacks(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        try {
            return ResponseEntity.ok(documentPackService.getUserPacks(user));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }

    @GetMapping("/consistency-check")
    public ResponseEntity<?> checkConsistency(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        try {
            return ResponseEntity.ok(consistencyCheckerService.checkConsistency(user));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }

    @PostMapping("/check-duplicate")
    public ResponseEntity<?> checkDuplicate(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, String> body) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        try {
            String sha256 = body.get("sha256Hash");
            String ocrText = body.get("ocrText");
            String title = body.get("title");
            return ResponseEntity.ok(duplicateDetectionService.checkDuplicate(user, sha256, ocrText, title));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }

    @GetMapping("/{id}/versions")
    public ResponseEntity<?> getDocumentVersions(
            @AuthenticationPrincipal User user,
            @PathVariable("id") String id) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        try {
            List<DocumentVersion> versions = documentService.getDocumentVersions(user, id);
            return ResponseEntity.ok(versions);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }

    @PostMapping("/{id}/versions/{versionId}/restore")
    public ResponseEntity<?> restoreVersion(
            @AuthenticationPrincipal User user,
            @PathVariable("id") String id,
            @PathVariable("versionId") String versionId) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        try {
            DocumentResponse restored = documentService.restoreDocumentVersion(user, id, versionId);
            return ResponseEntity.ok(restored);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Collections.singletonMap("detail", e.getMessage()));
        }
    }

    @PostMapping("/feedback")
    public ResponseEntity<?> recordOcrFeedback(
            @AuthenticationPrincipal User user,
            @RequestBody OcrFeedbackRequest req) {
        if (user == null) {
            return ResponseEntity.status(401).body(Collections.singletonMap("detail", "Unauthorized"));
        }
        try {
            documentService.recordOcrFeedback(user, req);
            return ResponseEntity.ok(Collections.singletonMap("message", "Correction feedback recorded successfully"));
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
            // Local file wiped or inaccessible on ephemeral host - attempt database restore
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

        // Final attempt via storageService which throws clear error if still absent
        return storageService.loadFileAsResource(doc.getStoredFilename());
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> downloadDocument(
            @AuthenticationPrincipal User user,
            @PathVariable("id") String id) {
        DocumentRecord doc = documentService.findAndAuthorize(user, id);
        Resource resource = resolveDocumentResource(doc);
        MediaType mediaType = resolveMediaType(doc);

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + doc.getOriginalFilename() + "\"")
                .body(resource);
    }

    @GetMapping("/{id}/preview")
    public ResponseEntity<Resource> previewDocument(
            @AuthenticationPrincipal User user,
            @PathVariable("id") String id) {
        DocumentRecord doc = documentService.findAndAuthorize(user, id);
        Resource resource = resolveDocumentResource(doc);
        MediaType mediaType = resolveMediaType(doc);

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + doc.getOriginalFilename() + "\"")
                .body(resource);
    }
}
