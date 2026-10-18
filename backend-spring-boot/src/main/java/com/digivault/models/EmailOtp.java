package com.digivault.models;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;

/**
 * MongoDB Entity for Email One-Time Passwords (OTP)
 */
@Document(collection = "email_otps")
public class EmailOtp {

    @Id
    private String id;

    @Indexed
    private String email;

    private String otp;
    private String purpose = "REGISTRATION"; // REGISTRATION, PASSWORD_RESET, SENSITIVE_ACTION
    private Date expiresAt;
    private boolean used = false;

    @CreatedDate
    private Date createdAt = new Date();

    public EmailOtp() {}

    public EmailOtp(String email, String otp, String purpose, Date expiresAt) {
        this.email = email;
        this.otp = otp;
        this.purpose = purpose != null ? purpose : "REGISTRATION";
        this.expiresAt = expiresAt;
        this.used = false;
        this.createdAt = new Date();
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getOtp() { return otp; }
    public void setOtp(String otp) { this.otp = otp; }

    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }

    public Date getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Date expiresAt) { this.expiresAt = expiresAt; }

    public boolean isUsed() { return used; }
    public void setUsed(boolean used) { this.used = used; }

    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
}
