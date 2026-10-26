package com.digivault.models;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.index.TextIndexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;

/**
 * MongoDB Document Entity - DocuVault 2.0
 * Features:
 * - TextIndexed for MongoDB Full-Text Search
 * - SHA-256 Document DNA hash for tamper verification
 * - OCR Extracted Text field + Structured Extraction (holderName, docNumber, dob)
 * - 8 Core Categories: Identity, Education, Medical, Finance, Travel, Employment, Property, Other
 * - Version tracking (version number)
 * - Quality score & blur flag
 * - Offline readiness & Emergency vault eligibility
 */
@Document(collection = "documents")
public class DocumentRecord {

    @Id
    private String id;

    @Indexed
    private String userId;

    @TextIndexed(weight = 4)
    private String title;

    @Indexed
    private String category; // Identity, Education, Medical, Finance, Travel, Employment, Property, Other

    @TextIndexed(weight = 3)
    private String docType;

    private String subtype; // e.g. "Aadhaar Card", "Degree Certificate", "Passport"

    @TextIndexed(weight = 2)
    private String issuer;

    /** Structured extracted fields */
    @TextIndexed(weight = 3)
    private String holderName;

    @Indexed
    private String docNumber;

    private String dob;

    private String originalFilename;
    private String storedFilename;
    private String filePath;
    private long fileSize;
    private String mimeType;

    /** Cryptographic SHA-256 Hash for Document DNA Verification */
    @Indexed
    private String sha256Hash;

    /** Full OCR Extracted text for searchability */
    @TextIndexed(weight = 1)
    private String ocrText;

    private double ocrConfidence = 0.85;

    private boolean isBlurred = false;

    private Date expiryDate;
    private Date issueDate;

    @TextIndexed(weight = 1)
    private String notes;

    /** Version number (starts at 1) */
    private int version = 1;

    /** Grouping collection e.g. Education, Travel, Insurance */
    private String collectionName;

    /** True if document belongs to Family Vault; False if Personal Vault */
    @Indexed
    private boolean isFamilyVault = false;

    /** True if document is accessible in Emergency Vault Break-Glass mode */
    @Indexed
    private boolean isEmergencyEligible = false;

    private boolean isFavorite = false;

    /** Secure offline caching flag */
    private boolean isOfflineAvailable = false;

    @CreatedDate
    private Date createdAt = new Date();

    @LastModifiedDate
    private Date updatedAt = new Date();

    public DocumentRecord() {}

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

    public String getStoredFilename() { return storedFilename; }
    public void setStoredFilename(String storedFilename) { this.storedFilename = storedFilename; }

    public String getFilePath() { return filePath; }
    public void setFilePath(String filePath) { this.filePath = filePath; }

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
    /** Resilient database backup of file payload to prevent loss on ephemeral container restarts */
    private String base64Data;

    public String getBase64Data() { return base64Data; }
    public void setBase64Data(String base64Data) { this.base64Data = base64Data; }

}
