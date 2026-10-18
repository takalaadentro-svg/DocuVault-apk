package com.digivault.models;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;

/**
 * OCR Feedback Entity for recording user-corrected OCR fields
 * to improve future parsing and track accuracy.
 */
@Document(collection = "ocr_feedback")
public class OcrFeedback {

    @Id
    private String id;

    @Indexed
    private String documentId;

    @Indexed
    private String userId;

    private String fieldName; // e.g. "holderName", "docNumber", "expiryDate", "category"
    private String ocrExtractedValue;
    private String correctedValue;
    private double originalConfidence;

    @CreatedDate
    private Date createdAt = new Date();

    public OcrFeedback() {}

    public OcrFeedback(String documentId, String userId, String fieldName,
                       String ocrExtractedValue, String correctedValue, double originalConfidence) {
        this.documentId = documentId;
        this.userId = userId;
        this.fieldName = fieldName;
        this.ocrExtractedValue = ocrExtractedValue;
        this.correctedValue = correctedValue;
        this.originalConfidence = originalConfidence;
        this.createdAt = new Date();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getDocumentId() { return documentId; }
    public void setDocumentId(String documentId) { this.documentId = documentId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getFieldName() { return fieldName; }
    public void setFieldName(String fieldName) { this.fieldName = fieldName; }

    public String getOcrExtractedValue() { return ocrExtractedValue; }
    public void setOcrExtractedValue(String ocrExtractedValue) { this.ocrExtractedValue = ocrExtractedValue; }

    public String getCorrectedValue() { return correctedValue; }
    public void setCorrectedValue(String correctedValue) { this.correctedValue = correctedValue; }

    public double getOriginalConfidence() { return originalConfidence; }
    public void setOriginalConfidence(double originalConfidence) { this.originalConfidence = originalConfidence; }

    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
}
