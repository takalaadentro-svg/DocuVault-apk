package com.digivault.models;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Date;

@Document(collection = "notifications")
public class Notification {

    @Id
    private String id;

    @Indexed
    private String userId;

    private String title;
    private String message;
    private String type; // EXPIRY_WARNING, FAMILY_INVITE, SECURITY_ALERT, DOCUMENT_SHARE
    private String relatedDocumentId;
    private boolean isRead = false;

    /** Multi-channel notification delivery: IN_APP, PUSH, EMAIL, SMS_WHATSAPP */
    private String channel = "IN_APP";

    /** Delivery status: QUEUED, SENT, DELIVERED, FAILED */
    private String deliveryStatus = "DELIVERED";

    private String channelCategory = "EXPIRY_ALERT"; // EXPIRY_ALERT, FAMILY_INVITE, GENERAL

    @CreatedDate
    private Date createdAt = new Date();

    public Notification() {}

    public Notification(String userId, String title, String message, String type, String relatedDocumentId) {
        this.userId = userId;
        this.title = title;
        this.message = message;
        this.type = type;
        this.relatedDocumentId = relatedDocumentId;
        this.deliveryStatus = "DELIVERED";
    }

    public Notification(String userId, String title, String message, String type, String relatedDocumentId, String channel, String deliveryStatus) {
        this.userId = userId;
        this.title = title;
        this.message = message;
        this.type = type;
        this.relatedDocumentId = relatedDocumentId;
        this.channel = channel;
        this.deliveryStatus = deliveryStatus;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    @JsonProperty("user_id")
    @JsonAlias({"userId", "user_id"})
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    @JsonProperty("related_document_id")
    @JsonAlias({"relatedDocumentId", "related_document_id"})
    public String getRelatedDocumentId() { return relatedDocumentId; }
    public void setRelatedDocumentId(String relatedDocumentId) { this.relatedDocumentId = relatedDocumentId; }

    @JsonProperty("is_read")
    @JsonAlias({"isRead", "read", "is_read"})
    public boolean isRead() { return isRead; }

    @JsonProperty("read")
    public boolean getRead() { return isRead; }

    public void setRead(boolean read) { isRead = read; }
    public void setIsRead(boolean isRead) { this.isRead = isRead; }

    public String getChannel() { return channel; }
    public void setChannel(String channel) { this.channel = channel; }

    @JsonProperty("delivery_status")
    @JsonAlias({"deliveryStatus", "delivery_status"})
    public String getDeliveryStatus() { return deliveryStatus; }
    public void setDeliveryStatus(String deliveryStatus) { this.deliveryStatus = deliveryStatus; }

    @JsonProperty("channel_category")
    @JsonAlias({"channelCategory", "channel_category"})
    public String getChannelCategory() { return channelCategory; }
    public void setChannelCategory(String channelCategory) { this.channelCategory = channelCategory; }

    @JsonProperty("created_at")
    @JsonAlias({"createdAt", "created_at"})
    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
}
