package com.digivault.models;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;

/**
 * Document Version Entity for preserving historical document versions,
 * allowing rollback and audit inspection.
 */
@Document(collection = "document_versions")
public class DocumentVersion {

    @Id
    private String id;

    @Indexed
    private String documentId;

    @Indexed
    private String userId;

    private int versionNumber;
    private String title;
    private String originalFilename;
    private String storedFilename;
    private long fileSize;
    private String sha256Hash;
    private String changeSummary;
    private String ocrText;

    @CreatedDate
    private Date createdAt = new Date();

    public DocumentVersion() {}

    public DocumentVersion(String documentId, String userId, int versionNumber, String title,
                           String originalFilename, String storedFilename, long fileSize,
                           String sha256Hash, String changeSummary, String ocrText) {
        this.documentId = documentId;
        this.userId = userId;
        this.versionNumber = versionNumber;
        this.title = title;
        this.originalFilename = originalFilename;
        this.storedFilename = storedFilename;
        this.fileSize = fileSize;
        this.sha256Hash = sha256Hash;
        this.changeSummary = changeSummary;
        this.ocrText = ocrText;
        this.createdAt = new Date();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getDocumentId() { return documentId; }
    public void setDocumentId(String documentId) { this.documentId = documentId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public int getVersionNumber() { return versionNumber; }
    public void setVersionNumber(int versionNumber) { this.versionNumber = versionNumber; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getOriginalFilename() { return originalFilename; }
    public void setOriginalFilename(String originalFilename) { this.originalFilename = originalFilename; }

    public String getStoredFilename() { return storedFilename; }
    public void setStoredFilename(String storedFilename) { this.storedFilename = storedFilename; }

    public long getFileSize() { return fileSize; }
    public void setFileSize(long fileSize) { this.fileSize = fileSize; }

    public String getSha256Hash() { return sha256Hash; }
    public void setSha256Hash(String sha256Hash) { this.sha256Hash = sha256Hash; }

    public String getChangeSummary() { return changeSummary; }
    public void setChangeSummary(String changeSummary) { this.changeSummary = changeSummary; }

    public String getOcrText() { return ocrText; }
    public void setOcrText(String ocrText) { this.ocrText = ocrText; }

    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
}
