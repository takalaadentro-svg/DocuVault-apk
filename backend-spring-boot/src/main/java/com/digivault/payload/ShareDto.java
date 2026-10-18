package com.digivault.payload;

import java.util.Date;

public class ShareDto {

    public static class CreateShareRequest {
        private String documentId;
        private Integer expiresInHours = 24;
        private Integer maxViews = 5;
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

    public static class VerifySharePinRequest {
        private String pin;

        public VerifySharePinRequest() {}

        public String getPin() { return pin; }
        public void setPin(String pin) { this.pin = pin; }
    }

    public static class ShareResponse {
        private String token;
        private String shareUrl;
        private String qrCodeBase64;
        private Date expiresAt;
        private int maxViews;
        private boolean isPinProtected;

        public ShareResponse() {}

        public String getToken() { return token; }
        public void setToken(String token) { this.token = token; }

        public String getShareUrl() { return shareUrl; }
        public void setShareUrl(String shareUrl) { this.shareUrl = shareUrl; }

        public String getQrCodeBase64() { return qrCodeBase64; }
        public void setQrCodeBase64(String qrCodeBase64) { this.qrCodeBase64 = qrCodeBase64; }

        public Date getExpiresAt() { return expiresAt; }
        public void setExpiresAt(Date expiresAt) { this.expiresAt = expiresAt; }

        public int getMaxViews() { return maxViews; }
        public void setMaxViews(int maxViews) { this.maxViews = maxViews; }

        public boolean isPinProtected() { return isPinProtected; }
        public void setPinProtected(boolean pinProtected) { isPinProtected = pinProtected; }
    }
}
