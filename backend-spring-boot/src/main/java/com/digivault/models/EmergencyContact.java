package com.digivault.models;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;

@Document(collection = "emergency_contacts")
public class EmergencyContact {

    @Id
    private String id;

    @Indexed
    private String userId;

    @JsonProperty("name")
    private String name;

    @JsonProperty("relationship")
    @JsonAlias({"relationship_type", "relationshipType"})
    private String relationship;

    @JsonProperty("phone")
    @JsonAlias({"phone_number", "phoneNumber", "mobile"})
    private String phone;

    @JsonProperty("email")
    private String email;

    @JsonProperty("can_access_emergency_docs")
    @JsonAlias({"canAccessEmergencyDocs", "can_access_medical"})
    private boolean canAccessEmergencyDocs = true;

    @CreatedDate
    private Date createdAt = new Date();

    public EmergencyContact() {}

    public EmergencyContact(String userId, String name, String relationship, String phone, String email) {
        this.userId = userId;
        this.name = name;
        this.relationship = relationship;
        this.phone = phone;
        this.email = email;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getRelationship() { return relationship; }
    public void setRelationship(String relationship) { this.relationship = relationship; }

    @JsonProperty("relationship_type")
    public String getRelationshipType() { return relationship; }
    public void setRelationshipType(String relationshipType) { this.relationship = relationshipType; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    @JsonProperty("phone_number")
    public String getPhoneNumber() { return phone; }
    public void setPhoneNumber(String phoneNumber) { this.phone = phoneNumber; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public boolean isCanAccessEmergencyDocs() { return canAccessEmergencyDocs; }
    public void setCanAccessEmergencyDocs(boolean canAccessEmergencyDocs) { this.canAccessEmergencyDocs = canAccessEmergencyDocs; }

    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
}

