package com.digivault.payload;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public class DocumentDto {

    public static class DocumentResponse {
        private String id;
        private String userId;
        private String title;
        private String category;
        private String docType;
        private String subtype;
        private String issuer;
        private String holderName;
        private String docNumber;
        private String dob;
        private String originalFilename;
        private long fileSize;
        private String mimeType;
        private String sha256Hash;
        private String ocrText;
        private double ocrConfidence = 0.85;
        private boolean isBlurred = false;
        private Date expiryDate;
        private Date issueDate;
        private String notes;
        private int version = 1;
        private String collectionName;
        private boolean isFamilyVault;
        private boolean isEmergencyEligible;
        private boolean isFavorite;
        private boolean isOfflineAvailable;
        private Date createdAt;
        private Date updatedAt;

        public DocumentResponse() {}

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getUserId() { return userId; }
        public void setUserId(String userId) { this.userId = userId; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }

        public String getDocType() { return docType; }
        public void setDocType(String docType) { this.docType = docType; }

        public String getSubtype() { return subtype; }
        public void setSubtype(String subtype) { this.subtype = subtype; }

        public String getIssuer() { return issuer; }
        public void setIssuer(String issuer) { this.issuer = issuer; }

        public String getHolderName() { return holderName; }
        public void setHolderName(String holderName) { this.holderName = holderName; }

        public String getDocNumber() { return docNumber; }
        public void setDocNumber(String docNumber) { this.docNumber = docNumber; }

        public String getDob() { return dob; }
        public void setDob(String dob) { this.dob = dob; }

        public String getOriginalFilename() { return originalFilename; }
        public void setOriginalFilename(String originalFilename) { this.originalFilename = originalFilename; }

        public long getFileSize() { return fileSize; }
        public void setFileSize(long fileSize) { this.fileSize = fileSize; }

        public String getMimeType() { return mimeType; }
        public void setMimeType(String mimeType) { this.mimeType = mimeType; }

        public String getSha256Hash() { return sha256Hash; }
        public void setSha256Hash(String sha256Hash) { this.sha256Hash = sha256Hash; }

        public String getOcrText() { return ocrText; }
        public void setOcrText(String ocrText) { this.ocrText = ocrText; }

        public double getOcrConfidence() { return ocrConfidence; }
        public void setOcrConfidence(double ocrConfidence) { this.ocrConfidence = ocrConfidence; }

        public boolean isBlurred() { return isBlurred; }
        public void setBlurred(boolean blurred) { isBlurred = blurred; }

        public Date getExpiryDate() { return expiryDate; }
        public void setExpiryDate(Date expiryDate) { this.expiryDate = expiryDate; }

        public Date getIssueDate() { return issueDate; }
        public void setIssueDate(Date issueDate) { this.issueDate = issueDate; }

        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }

        public int getVersion() { return version; }
        public void setVersion(int version) { this.version = version; }

        public String getCollectionName() { return collectionName; }
        public void setCollectionName(String collectionName) { this.collectionName = collectionName; }

        public boolean isFamilyVault() { return isFamilyVault; }
        public void setFamilyVault(boolean familyVault) { isFamilyVault = familyVault; }

        public boolean isEmergencyEligible() { return isEmergencyEligible; }
        public void setEmergencyEligible(boolean emergencyEligible) { isEmergencyEligible = emergencyEligible; }

        public boolean isFavorite() { return isFavorite; }
        public void setFavorite(boolean favorite) { isFavorite = favorite; }

        public boolean isOfflineAvailable() { return isOfflineAvailable; }
        public void setOfflineAvailable(boolean offlineAvailable) { isOfflineAvailable = offlineAvailable; }

        public Date getCreatedAt() { return createdAt; }
        public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }

        public Date getUpdatedAt() { return updatedAt; }
        public void setUpdatedAt(Date updatedAt) { this.updatedAt = updatedAt; }

        public boolean isExpired() {
            return expiryDate != null && expiryDate.before(new Date());
        }

        public boolean isIsExpired() {
            return isExpired();
        }

        public Long getDaysUntilExpiry() {
            if (expiryDate == null) return null;
            long diff = expiryDate.getTime() - System.currentTimeMillis();
            return diff / (1000L * 60 * 60 * 24);
        }

        public String getFolder() {
            return category != null ? category : "General";
        }

        public String getFilePath() {
            return originalFilename != null ? originalFilename : "document";
        }
    }

    public static class DocumentUpdateRequest {
        private String title;
        private String category;
        private String docType;
        private String subtype;
        private String issuer;
        private String holderName;
        private String docNumber;
        private String dob;
        private String notes;
        private Date expiryDate;
        private Date issueDate;
        @JsonProperty("is_family_vault")
        @JsonAlias({"isFamilyVault", "familyVault"})
        private Boolean isFamilyVault;

        @JsonProperty("is_emergency_eligible")
        @JsonAlias({"isEmergencyEligible", "emergencyEligible"})
        private Boolean isEmergencyEligible;

        @JsonProperty("is_favorite")
        @JsonAlias({"isFavorite", "favorite"})
        private Boolean isFavorite;

        @JsonProperty("is_offline_available")
        @JsonAlias({"isOfflineAvailable", "offlineAvailable"})
        private Boolean isOfflineAvailable;

        private String collectionName;

        public DocumentUpdateRequest() {}

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }

        public String getDocType() { return docType; }
        public void setDocType(String docType) { this.docType = docType; }

        public String getSubtype() { return subtype; }
        public void setSubtype(String subtype) { this.subtype = subtype; }

        public String getIssuer() { return issuer; }
        public void setIssuer(String issuer) { this.issuer = issuer; }

        public String getHolderName() { return holderName; }
        public void setHolderName(String holderName) { this.holderName = holderName; }

        public String getDocNumber() { return docNumber; }
        public void setDocNumber(String docNumber) { this.docNumber = docNumber; }

        public String getDob() { return dob; }
        public void setDob(String dob) { this.dob = dob; }

        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }

        public Date getExpiryDate() { return expiryDate; }
        public void setExpiryDate(Date expiryDate) { this.expiryDate = expiryDate; }

        public Date getIssueDate() { return issueDate; }
        public void setIssueDate(Date issueDate) { this.issueDate = issueDate; }

        public Boolean getFamilyVault() { return isFamilyVault; }
        public void setFamilyVault(Boolean familyVault) { isFamilyVault = familyVault; }

        public Boolean getEmergencyEligible() { return isEmergencyEligible; }
        public void setEmergencyEligible(Boolean emergencyEligible) { isEmergencyEligible = emergencyEligible; }
        public Boolean getIsEmergencyEligible() { return isEmergencyEligible; }
        public void setIsEmergencyEligible(Boolean val) { this.isEmergencyEligible = val; }

        public Boolean getFavorite() { return isFavorite; }
        public void setFavorite(Boolean favorite) { isFavorite = favorite; }

        public Boolean getOfflineAvailable() { return isOfflineAvailable; }
        public void setOfflineAvailable(Boolean offlineAvailable) { isOfflineAvailable = offlineAvailable; }

        public String getCollectionName() { return collectionName; }
        public void setCollectionName(String collectionName) { this.collectionName = collectionName; }
    }

    public static class DocumentDnaResponse {
        private String documentId;
        private String title;
        private String originalHash;
        private String currentHash;
        private boolean authentic;
        private String algorithm = "SHA-256";
        private Date verifiedAt = new Date();
        private String message;

        public DocumentDnaResponse() {}

        public DocumentDnaResponse(String documentId, String originalHash, String currentHash, boolean authentic, String message) {
            this.documentId = documentId;
            this.originalHash = originalHash;
            this.currentHash = currentHash;
            this.authentic = authentic;
            this.message = message;
        }

        public String getDocumentId() { return documentId; }
        public void setDocumentId(String documentId) { this.documentId = documentId; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getOriginalHash() { return originalHash; }
        public void setOriginalHash(String originalHash) { this.originalHash = originalHash; }

        public String getStoredHash() { return originalHash; }
        public void setStoredHash(String storedHash) { this.originalHash = storedHash; }

        public String getCurrentHash() { return currentHash; }
        public void setCurrentHash(String currentHash) { this.currentHash = currentHash; }

        public String getCurrentFileHash() { return currentHash; }
        public void setCurrentFileHash(String currentFileHash) { this.currentHash = currentFileHash; }

        public boolean isAuthentic() { return authentic; }
        public void setAuthentic(boolean authentic) { this.authentic = authentic; }

        public boolean isIsIntact() { return authentic; }
        public void setIsIntact(boolean isIntact) { this.authentic = isIntact; }

        public String getAlgorithm() { return algorithm; }
        public void setAlgorithm(String algorithm) { this.algorithm = algorithm; }

        public Date getVerifiedAt() { return verifiedAt; }
        public void setVerifiedAt(Date verifiedAt) { this.verifiedAt = verifiedAt; }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }

        public void setRegisteredHash(String registeredHash) { this.originalHash = registeredHash; }
        public void setStorageHash(String storageHash) { this.currentHash = storageHash; }
        public void setMatch(boolean match) { this.authentic = match; }
        public void setStatus(String status) { this.authentic = "VERIFIED_AUTHENTIC".equalsIgnoreCase(status); }

        public String getVerificationStatus() { return authentic ? "VERIFIED_AUTHENTIC" : "TAMPER_DETECTED"; }
        public String getStatus() { return getVerificationStatus(); }
    }

    public static class OcrScanResponse {
        private String extractedText;
        private String suggestedCategory;
        private String suggestedDocType;
        private String subtype;
        private double confidence;
        private List<String> matchedKeywords = new ArrayList<>();
        private String sha256Hash;
        private long fileSize;
        private boolean isBlurred = false;
        private double blurScore = 120.0;
        private String holderName;
        private String docNumber;
        private String dob;
        private String issueDate;
        private String expiryDate;

        public OcrScanResponse() {}

        public OcrScanResponse(String extractedText, String suggestedCategory, String suggestedDocType, double confidence) {
            this.extractedText = extractedText;
            this.suggestedCategory = suggestedCategory;
            this.suggestedDocType = suggestedDocType;
            this.confidence = confidence;
        }

        public String getExtractedText() { return extractedText; }
        public void setExtractedText(String extractedText) { this.extractedText = extractedText; }

        public String getSuggestedCategory() { return suggestedCategory; }
        public void setSuggestedCategory(String suggestedCategory) { this.suggestedCategory = suggestedCategory; }

        public String getSuggestedDocType() { return suggestedDocType; }
        public void setSuggestedDocType(String suggestedDocType) { this.suggestedDocType = suggestedDocType; }

        public String getSubtype() { return subtype; }
        public void setSubtype(String subtype) { this.subtype = subtype; }

        public double getConfidence() { return confidence; }
        public void setConfidence(double confidence) { this.confidence = confidence; }

        public List<String> getMatchedKeywords() { return matchedKeywords; }
        public void setMatchedKeywords(List<String> matchedKeywords) { this.matchedKeywords = matchedKeywords; }

        public String getSha256Hash() { return sha256Hash; }
        public void setSha256Hash(String sha256Hash) { this.sha256Hash = sha256Hash; }

        public long getFileSize() { return fileSize; }
        public void setFileSize(long fileSize) { this.fileSize = fileSize; }

        public boolean isBlurred() { return isBlurred; }
        public void setBlurred(boolean blurred) { isBlurred = blurred; }

        public double getBlurScore() { return blurScore; }
        public void setBlurScore(double blurScore) { this.blurScore = blurScore; }

        public String getHolderName() { return holderName; }
        public void setHolderName(String holderName) { this.holderName = holderName; }

        public String getDocNumber() { return docNumber; }
        public void setDocNumber(String docNumber) { this.docNumber = docNumber; }

        public String getDob() { return dob; }
        public void setDob(String dob) { this.dob = dob; }

        public String getIssueDate() { return issueDate; }
        public void setIssueDate(String issueDate) { this.issueDate = issueDate; }

        public String getExpiryDate() { return expiryDate; }
        public void setExpiryDate(String expiryDate) { this.expiryDate = expiryDate; }
    }

    // --- DocuVault 2.0 DTOs ---

    public static class DocumentChatRequest {
        private String question;
        private String documentId; // optional filter

        public DocumentChatRequest() {}
        public DocumentChatRequest(String question) { this.question = question; }

        public String getQuestion() { return question; }
        public void setQuestion(String question) { this.question = question; }

        public String getDocumentId() { return documentId; }
        public void setDocumentId(String documentId) { this.documentId = documentId; }
    }

    public static class DocumentChatCitation {
        private String documentId;
        private String documentTitle;
        private String category;
        private String excerpt;
        private double confidence;

        public DocumentChatCitation() {}
        public DocumentChatCitation(String documentId, String documentTitle, String category, String excerpt, double confidence) {
            this.documentId = documentId;
            this.documentTitle = documentTitle;
            this.category = category;
            this.excerpt = excerpt;
            this.confidence = confidence;
        }

        public String getDocumentId() { return documentId; }
        public void setDocumentId(String documentId) { this.documentId = documentId; }

        public String getDocumentTitle() { return documentTitle; }
        public void setDocumentTitle(String documentTitle) { this.documentTitle = documentTitle; }

        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }

        public String getExcerpt() { return excerpt; }
        public void setExcerpt(String excerpt) { this.excerpt = excerpt; }

        public double getConfidence() { return confidence; }
        public void setConfidence(double confidence) { this.confidence = confidence; }
    }

    public static class DocumentChatResponse {
        private String answer;
        private List<DocumentChatCitation> citations = new ArrayList<>();
        private boolean infoFound = true;

        public DocumentChatResponse() {}
        public DocumentChatResponse(String answer, List<DocumentChatCitation> citations, boolean infoFound) {
            this.answer = answer;
            this.citations = citations;
            this.infoFound = infoFound;
        }

        public String getAnswer() { return answer; }
        public void setAnswer(String answer) { this.answer = answer; }

        public List<DocumentChatCitation> getCitations() { return citations; }
        public void setCitations(List<DocumentChatCitation> citations) { this.citations = citations; }

        public boolean isInfoFound() { return infoFound; }
        public void setInfoFound(boolean infoFound) { this.infoFound = infoFound; }
    }

    public static class DocumentPackItem {
        private String requiredDocType;
        private String category;
        private boolean isAvailable;
        private String matchedDocumentId;
        private String matchedDocumentTitle;

        public DocumentPackItem() {}
        public DocumentPackItem(String requiredDocType, String category, boolean isAvailable, String matchedDocumentId, String matchedDocumentTitle) {
            this.requiredDocType = requiredDocType;
            this.category = category;
            this.isAvailable = isAvailable;
            this.matchedDocumentId = matchedDocumentId;
            this.matchedDocumentTitle = matchedDocumentTitle;
        }

        public String getRequiredDocType() { return requiredDocType; }
        public void setRequiredDocType(String requiredDocType) { this.requiredDocType = requiredDocType; }

        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }

        public boolean isAvailable() { return isAvailable; }
        public void setAvailable(boolean available) { isAvailable = available; }

        public String getMatchedDocumentId() { return matchedDocumentId; }
        public void setMatchedDocumentId(String matchedDocumentId) { this.matchedDocumentId = matchedDocumentId; }

        public String getMatchedDocumentTitle() { return matchedDocumentTitle; }
        public void setMatchedDocumentTitle(String matchedDocumentTitle) { this.matchedDocumentTitle = matchedDocumentTitle; }
    }

    public static class DocumentPackDto {
        private String packId;
        private String packName;
        private String purpose;
        private int totalRequired;
        private int totalAvailable;
        private int completenessPercentage;
        private List<DocumentPackItem> items = new ArrayList<>();

        public DocumentPackDto() {}

        public String getPackId() { return packId; }
        public void setPackId(String packId) { this.packId = packId; }

        public String getPackName() { return packName; }
        public void setPackName(String packName) { this.packName = packName; }

        public String getPurpose() { return purpose; }
        public void setPurpose(String purpose) { this.purpose = purpose; }

        public int getTotalRequired() { return totalRequired; }
        public void setTotalRequired(int totalRequired) { this.totalRequired = totalRequired; }

        public int getTotalAvailable() { return totalAvailable; }
        public void setTotalAvailable(int totalAvailable) { this.totalAvailable = totalAvailable; }

        public int getCompletenessPercentage() { return completenessPercentage; }
        public void setCompletenessPercentage(int completenessPercentage) { this.completenessPercentage = completenessPercentage; }

        public List<DocumentPackItem> getItems() { return items; }
        public void setItems(List<DocumentPackItem> items) { this.items = items; }
    }

    public static class ConsistencyIssue {
        private String fieldName; // "Full Name", "Date of Birth", "Address"
        private String document1Title;
        private String value1;
        private String document2Title;
        private String value2;
        private String severity; // "WARNING", "INFO"
        private String advice;

        public ConsistencyIssue() {}
        public ConsistencyIssue(String fieldName, String document1Title, String value1,
                                String document2Title, String value2, String severity, String advice) {
            this.fieldName = fieldName;
            this.document1Title = document1Title;
            this.value1 = value1;
            this.document2Title = document2Title;
            this.value2 = value2;
            this.severity = severity;
            this.advice = advice;
        }

        public String getFieldName() { return fieldName; }
        public void setFieldName(String fieldName) { this.fieldName = fieldName; }

        public String getDocument1Title() { return document1Title; }
        public void setDocument1Title(String document1Title) { this.document1Title = document1Title; }

        public String getValue1() { return value1; }
        public void setValue1(String value1) { this.value1 = value1; }

        public String getDocument2Title() { return document2Title; }
        public void setDocument2Title(String document2Title) { this.document2Title = document2Title; }

        public String getValue2() { return value2; }
        public void setValue2(String value2) { this.value2 = value2; }

        public String getSeverity() { return severity; }
        public void setSeverity(String severity) { this.severity = severity; }

        public String getAdvice() { return advice; }
        public void setAdvice(String advice) { this.advice = advice; }
    }

    public static class ConsistencyCheckResult {
        private int totalDocumentsAnalyzed;
        private boolean isConsistent;
        private List<ConsistencyIssue> issues = new ArrayList<>();
        private List<String> passedFields = new ArrayList<>();

        public ConsistencyCheckResult() {}

        public int getTotalDocumentsAnalyzed() { return totalDocumentsAnalyzed; }
        public void setTotalDocumentsAnalyzed(int totalDocumentsAnalyzed) { this.totalDocumentsAnalyzed = totalDocumentsAnalyzed; }

        public boolean isConsistent() { return isConsistent; }
        public void setConsistent(boolean consistent) { isConsistent = consistent; }

        public List<ConsistencyIssue> getIssues() { return issues; }
        public void setIssues(List<ConsistencyIssue> issues) { this.issues = issues; }

        public List<String> getPassedFields() { return passedFields; }
        public void setPassedFields(List<String> passedFields) { this.passedFields = passedFields; }
    }

    public static class DuplicateCheckResponse {
        private boolean isDuplicate;
        private String duplicateType; // "EXACT_HASH", "TEXT_SIMILARITY", "NONE"
        private double similarityScore;
        private String existingDocumentId;
        private String existingDocumentTitle;
        private String message;

        public DuplicateCheckResponse() {}

        public boolean isDuplicate() { return isDuplicate; }
        public void setDuplicate(boolean duplicate) { isDuplicate = duplicate; }

        public String getDuplicateType() { return duplicateType; }
        public void setDuplicateType(String duplicateType) { this.duplicateType = duplicateType; }

        public double getSimilarityScore() { return similarityScore; }
        public void setSimilarityScore(double similarityScore) { this.similarityScore = similarityScore; }

        public String getExistingDocumentId() { return existingDocumentId; }
        public void setExistingDocumentId(String existingDocumentId) { this.existingDocumentId = existingDocumentId; }

        public String getExistingDocumentTitle() { return existingDocumentTitle; }
        public void setExistingDocumentTitle(String existingDocumentTitle) { this.existingDocumentTitle = existingDocumentTitle; }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
    }

    public static class OcrFeedbackRequest {
        private String documentId;
        private String fieldName;
        private String ocrValue;
        private String correctedValue;

        public OcrFeedbackRequest() {}

        public String getDocumentId() { return documentId; }
        public void setDocumentId(String documentId) { this.documentId = documentId; }

        public String getFieldName() { return fieldName; }
        public void setFieldName(String fieldName) { this.fieldName = fieldName; }

        public String getOcrValue() { return ocrValue; }
        public void setOcrValue(String ocrValue) { this.ocrValue = ocrValue; }

        public String getCorrectedValue() { return correctedValue; }
        public void setCorrectedValue(String correctedValue) { this.correctedValue = correctedValue; }
    }

    public static class PhoneTransferPairingResponse {
        private String transferCode;
        private long expiresInSeconds;
        private String qrCodeData;
        private int documentCount;

        public PhoneTransferPairingResponse() {}
        public PhoneTransferPairingResponse(String transferCode, long expiresInSeconds, String qrCodeData, int documentCount) {
            this.transferCode = transferCode;
            this.expiresInSeconds = expiresInSeconds;
            this.qrCodeData = qrCodeData;
            this.documentCount = documentCount;
        }

        public String getTransferCode() { return transferCode; }
        public void setTransferCode(String transferCode) { this.transferCode = transferCode; }

        public long getExpiresInSeconds() { return expiresInSeconds; }
        public void setExpiresInSeconds(long expiresInSeconds) { this.expiresInSeconds = expiresInSeconds; }

        public String getQrCodeData() { return qrCodeData; }
        public void setQrCodeData(String qrCodeData) { this.qrCodeData = qrCodeData; }

        public int getDocumentCount() { return documentCount; }
        public void setDocumentCount(int documentCount) { this.documentCount = documentCount; }
    }
}
