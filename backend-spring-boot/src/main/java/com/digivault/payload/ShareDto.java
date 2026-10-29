package com.digivault.payload;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Date;

public class ShareDto {

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class CreateShareRequest {
        @JsonProperty("document_id")
        @JsonAlias({"documentId", "document_id", "doc_id", "docId"})
        private String documentId;

        @JsonProperty("expires_in_hours")
        @JsonAlias({"expiresInHours", "expires_in_hours", "expiry_hours"})
        private Integer expiresInHours = 24;

        @JsonProperty("max_views")
        @JsonAlias({"maxViews", "max_views", "max_access_count", "maxAccessCount"})
        private Integer maxViews = 5;

        @JsonProperty("pin")
        @JsonAlias({"pin", "pinCode", "pin_code"})
        private String pin; // Optional PIN protection

        public CreateShareRequest() {}

        public String getDocumentId() { return documentId; }
        public void setDocumentId(String documentId) { this.documentId = documentId; }

        public Integer getExpiresInHours() { return expiresInHours; }
        public void setExpiresInHours(Integer expiresInHours) { this.expiresInHours = expiresInHours; }

        public Integer getMaxViews() { return maxViews; }
        public void setMaxViews(Integer maxViews) { this.maxViews = maxViews; }

        public String getPin() { return pin; }
        public void setPin(String pin) { this.pin = pin; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class VerifySharePinRequest {
        @JsonProperty("pin")
        @JsonAlias({"pin", "pinCode", "pin_code"})
        private String pin;

        public VerifySharePinRequest() {}

        public String getPin() { return pin; }
        public void setPin(String pin) { this.pin = pin; }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ShareResponse {
        @JsonProperty("id")
        @JsonAlias({"id", "share_id", "shareId"})
        private String id;

        @JsonProperty("token")
        @JsonAlias({"token"})
        private String token;

        @JsonProperty("share_url")
        @JsonAlias({"shareUrl", "share_url"})
        private String shareUrl;

        @JsonProperty("qr_code_base64")
        @JsonAlias({"qrCodeBase64", "qr_code_base64"})
        private String qrCodeBase64;

        @JsonProperty("expires_at")
        @JsonAlias({"expiresAt", "expires_at"})
        private Date expiresAt;

        @JsonProperty("max_views")
        @JsonAlias({"maxViews", "max_views"})
        private int maxViews;

        @JsonProperty("max_access_count")
        @JsonAlias({"maxAccessCount", "max_access_count"})
        private int maxAccessCount;

        @JsonProperty("access_count")
        @JsonAlias({"accessCount", "access_count", "viewCount", "view_count"})
        private int accessCount;

        @JsonProperty("is_pin_protected")
        @JsonAlias({"isPinProtected", "is_pin_protected", "require_pin", "requirePin", "pinProtected"})
        private boolean isPinProtected;

        @JsonProperty("require_pin")
        @JsonAlias({"requirePin", "require_pin"})
        private boolean requirePin;

        @JsonProperty("is_revoked")
        @JsonAlias({"isRevoked", "is_revoked"})
        private boolean isRevoked;

        @JsonProperty("document_id")
        @JsonAlias({"documentId", "document_id"})
        private String documentId;

        @JsonProperty("document_title")
        @JsonAlias({"documentTitle", "document_title"})
        private String documentTitle;

        @JsonProperty("document_category")
        @JsonAlias({"documentCategory", "document_category"})
        private String documentCategory;

        @JsonProperty("created_at")
        @JsonAlias({"createdAt", "created_at"})
        private Date createdAt;

        public ShareResponse() {}

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getToken() { return token; }
        public void setToken(String token) { this.token = token; }

        public String getShareUrl() { return shareUrl; }
        public void setShareUrl(String shareUrl) { this.shareUrl = shareUrl; }

        public String getQrCodeBase64() { return qrCodeBase64; }
        public void setQrCodeBase64(String qrCodeBase64) { this.qrCodeBase64 = qrCodeBase64; }

        public Date getExpiresAt() { return expiresAt; }
        public void setExpiresAt(Date expiresAt) { this.expiresAt = expiresAt; }

        public int getMaxViews() { return maxViews; }
        public void setMaxViews(int maxViews) { 
            this.maxViews = maxViews; 
            this.maxAccessCount = maxViews;
        }

        public int getMaxAccessCount() { return maxAccessCount > 0 ? maxAccessCount : maxViews; }
        public void setMaxAccessCount(int maxAccessCount) {
            this.maxAccessCount = maxAccessCount;
            this.maxViews = maxAccessCount;
        }

        public int getAccessCount() { return accessCount; }
        public void setAccessCount(int accessCount) { this.accessCount = accessCount; }

        public boolean isPinProtected() { return isPinProtected; }
        public void setPinProtected(boolean pinProtected) { 
            isPinProtected = pinProtected; 
            this.requirePin = pinProtected;
        }

        public boolean isRequirePin() { return requirePin || isPinProtected; }
        public void setRequirePin(boolean requirePin) {
            this.requirePin = requirePin;
            this.isPinProtected = requirePin;
        }

        public boolean isRevoked() { return isRevoked; }
        public void setRevoked(boolean revoked) { isRevoked = revoked; }

        public String getDocumentId() { return documentId; }
        public void setDocumentId(String documentId) { this.documentId = documentId; }

        public String getDocumentTitle() { return documentTitle; }
        public void setDocumentTitle(String documentTitle) { this.documentTitle = documentTitle; }

        public String getDocumentCategory() { return documentCategory; }
        public void setDocumentCategory(String documentCategory) { this.documentCategory = documentCategory; }

        public Date getCreatedAt() { return createdAt; }
        public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
    }
}
