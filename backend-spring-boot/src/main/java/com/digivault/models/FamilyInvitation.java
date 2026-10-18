package com.digivault.models;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;

@Document(collection = "family_invitations")
public class FamilyInvitation {

    @Id
    private String id;
    private String familyGroupId;
    private String inviterId;
    private String inviteeEmail;

    @Indexed(unique = true)
    private String token;

    private String status = "PENDING"; // PENDING, ACCEPTED, DECLINED
    private Date expiresAt;

    @CreatedDate
    private Date createdAt = new Date();

    public FamilyInvitation() {}

    public FamilyInvitation(String familyGroupId, String inviterId, String inviteeEmail, String token, Date expiresAt) {
        this.familyGroupId = familyGroupId;
        this.inviterId = inviterId;
        this.inviteeEmail = inviteeEmail;
        this.token = token;
        this.expiresAt = expiresAt;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getFamilyGroupId() { return familyGroupId; }
    public void setFamilyGroupId(String familyGroupId) { this.familyGroupId = familyGroupId; }

    public String getInviterId() { return inviterId; }
    public void setInviterId(String inviterId) { this.inviterId = inviterId; }

    public String getInviteeEmail() { return inviteeEmail; }
    public void setInviteeEmail(String inviteeEmail) { this.inviteeEmail = inviteeEmail; }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Date getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Date expiresAt) { this.expiresAt = expiresAt; }

    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
}
