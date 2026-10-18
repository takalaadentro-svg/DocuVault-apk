package com.digivault.services;

import com.digivault.payload.DocumentDto.OcrScanResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * OCR Integration Service - DocuVault 2.0
 * Connects Spring Boot to the Python EasyOCR REST Microservice.
 * Enriched with Structured Entity Extraction, Quality/Blur Analysis,
 * and robust local fallback extraction.
 */
@Service
public class OcrIntegrationService {

    private static final Logger logger = LoggerFactory.getLogger(OcrIntegrationService.class);

    @Value("${digivault.ocr.service-url:http://localhost:5001/extract-ocr}")
    private String ocrServiceUrl;

    @Value("${digivault.ocr.fallback-enabled:true}")
    private boolean fallbackEnabled;

    @Autowired
    private CategorySuggestionService categorySuggestionService;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Process document file for OCR text extraction, structured entity parsing,
     * blur assessment, and category suggestion.
     */
    public OcrScanResponse extractTextAndSuggestCategory(MultipartFile file) {
        String extractedText = "";
        double confidence = 0.85;
        boolean isBlurred = false;
        double blurScore = 120.0;
        String holderName = null;
        String docNumber = null;
        String dob = null;
        String issueDate = null;
        String expiryDate = null;

        String sha256 = calculateSha256(file);

        try {
            // Attempt to call Python EasyOCR Microservice
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            ByteArrayResource fileResource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename();
                }
            };

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", fileResource);

            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(ocrServiceUrl, requestEntity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode jsonNode = objectMapper.readTree(response.getBody());
                if (jsonNode.has("extracted_text")) {
                    extractedText = jsonNode.get("extracted_text").asText();
                }
                if (jsonNode.has("confidence")) {
                    confidence = jsonNode.get("confidence").asDouble();
                }
                if (jsonNode.has("is_blurry")) {
                    isBlurred = jsonNode.get("is_blurry").asBoolean();
                }
                if (jsonNode.has("blur_score")) {
                    blurScore = jsonNode.get("blur_score").asDouble();
                }
                if (jsonNode.has("structured_fields")) {
                    JsonNode sf = jsonNode.get("structured_fields");
                    if (sf.hasNonNull("holder_name")) holderName = sf.get("holder_name").asText();
                    if (sf.hasNonNull("doc_number")) docNumber = sf.get("doc_number").asText();
                    if (sf.hasNonNull("dob")) dob = sf.get("dob").asText();
                    if (sf.hasNonNull("issue_date")) issueDate = sf.get("issue_date").asText();
                    if (sf.hasNonNull("expiry_date")) expiryDate = sf.get("expiry_date").asText();
                }
            }
        } catch (Exception ex) {
            logger.warn("Python EasyOCR microservice unavailable at {}: {}. Using local fallback text extraction.", ocrServiceUrl, ex.getMessage());
            if (fallbackEnabled) {
                extractedText = fallbackExtract(file);
            }
        }

        // Run local fallback entity extraction if Python fields were empty
        if (docNumber == null || holderName == null || dob == null) {
            EntityResult fallbackEntities = extractEntitiesLocally(extractedText);
            if (docNumber == null) docNumber = fallbackEntities.docNumber;
            if (holderName == null) holderName = fallbackEntities.holderName;
            if (dob == null) dob = fallbackEntities.dob;
            if (issueDate == null) issueDate = fallbackEntities.issueDate;
            if (expiryDate == null) expiryDate = fallbackEntities.expiryDate;
        }

        // Rule-based category suggestion from OCR text and original filename
        CategorySuggestionService.SuggestionResult suggestion =
                categorySuggestionService.suggestCategory(extractedText, file.getOriginalFilename());

        OcrScanResponse res = new OcrScanResponse(
                extractedText,
                suggestion.getCategory(),
                suggestion.getDocType(),
                suggestion.getConfidence()
        );
        res.setSubtype(suggestion.getSubtype());
        res.setSha256Hash(sha256);
        res.setFileSize(file.getSize());
        res.setBlurred(isBlurred);
        res.setBlurScore(blurScore);
        res.setHolderName(holderName);
        res.setDocNumber(docNumber);
        res.setDob(dob);
        res.setIssueDate(issueDate);
        res.setExpiryDate(expiryDate);

        return res;
    }

    private String calculateSha256(MultipartFile file) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(file.getBytes());
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception e) {
            return "hash-gen-error";
        }
    }

    private static class EntityResult {
        String docNumber;
        String holderName;
        String dob;
        String issueDate;
        String expiryDate;
    }

    private EntityResult extractEntitiesLocally(String text) {
        EntityResult er = new EntityResult();
        if (text == null || text.trim().isEmpty()) return er;

        // Aadhaar: 12 digits or 4 4 4
        Matcher aadhaar = Pattern.compile("\\b(\\d{4}\\s\\d{4}\\s\\d{4})\\b").matcher(text);
        if (aadhaar.find()) er.docNumber = aadhaar.group(1);

        // PAN: 5 letters 4 digits 1 letter
        if (er.docNumber == null) {
            Matcher pan = Pattern.compile("\\b([A-Z]{5}[0-9]{4}[A-Z])\\b").matcher(text);
            if (pan.find()) er.docNumber = pan.group(1);
        }

        // Passport: 1 letter + 7 digits
        if (er.docNumber == null) {
            Matcher passport = Pattern.compile("\\b([A-Z][0-9]{7})\\b").matcher(text);
            if (passport.find()) er.docNumber = passport.group(1);
        }

        // Dates
        Matcher dates = Pattern.compile("\\b(0[1-9]|[12][0-9]|3[01])[-/.](0[1-9]|1[012])[-/.](19|20)\\d\\d\\b").matcher(text);
        while (dates.find()) {
            String d = dates.group();
            int idx = text.indexOf(d);
            String snippet = text.substring(Math.max(0, idx - 25), Math.min(text.length(), idx + 25)).toLowerCase();
            if (snippet.contains("birth") || snippet.contains("dob") || snippet.contains("born")) {
                if (er.dob == null) er.dob = d;
            } else if (snippet.contains("valid") || snippet.contains("expiry") || snippet.contains("expires")) {
                if (er.expiryDate == null) er.expiryDate = d;
            } else if (snippet.contains("issue") || snippet.contains("issued")) {
                if (er.issueDate == null) er.issueDate = d;
            }
        }

        // Holder Name heuristic
        Matcher nameMatcher = Pattern.compile("(?:Name|Holder|Mr\\.|Ms\\.)\\s*[:.-]?\\s*([A-Z][a-zA-Z\\s]{3,24})").matcher(text);
        if (nameMatcher.find()) {
            er.holderName = nameMatcher.group(1).trim();
        }

        return er;
    }

    /**
     * Fallback text extractor for text files or simple PDFs
     */
    private String fallbackExtract(MultipartFile file) {
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        try {
            byte[] bytes = file.getBytes();
            if (filename.endsWith(".txt") || filename.endsWith(".csv") || filename.endsWith(".json")) {
                return new String(bytes, StandardCharsets.UTF_8);
            }
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) {
                if (b >= 32 && b <= 126) {
                    sb.append((char) b);
                } else if (b == '\n' || b == '\r') {
                    sb.append(' ');
                }
            }
            String rawAscii = sb.toString();
            if (rawAscii.length() > 500) {
                return rawAscii.substring(0, 500);
            }
            return rawAscii;
        } catch (Exception e) {
            return "OCR extraction pending for " + filename;
        }
    }
}
