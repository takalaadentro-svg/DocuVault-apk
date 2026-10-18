package com.digivault.models;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;

@Document(collection = "share_tokens")
public class ShareToken {

    @Id
    private String id;

    @Indexed
    private String documentId;

    @Indexed(unique = true)
    private String token;

    private String pinHash; // Optional BCrypt hashed PIN for link protection
    private Date expiresAt;
    private int maxViews = 0; // 0 = unlimited
    private int viewCount = 0;
    private boolean isActive = true;

    @CreatedDate
    private Date createdAt = new Date();

    public ShareToken() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getDocumentId() { return documentId; }
    public void setDocumentId(String documentId) { this.documentId = documentId; }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getPinHash() { return pinHash; }
    public void setPinHash(String pinHash) { this.pinHash = pinHash; }

    public Date getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Date expiresAt) { this.expiresAt = expiresAt; }

    public int getMaxViews() { return maxViews; }
    public void setMaxViews(int maxViews) { this.maxViews = maxViews; }

    public int getViewCount() { return viewCount; }
    public void setViewCount(int viewCount) { this.viewCount = viewCount; }

    public boolean isActive() { return isActive; }
    public void setActive(boolean active) { isActive = active; }

    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
}
