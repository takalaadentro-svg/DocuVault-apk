package com.digivault.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;

@Document(collection = "family_members")
@CompoundIndex(name = "group_user_unique", def = "{'familyGroupId': 1, 'userId': 1}", unique = true)
public class FamilyMember {

    @Id
    private String id;
    private String familyGroupId;
    private String userId;
    private String role = "MEMBER"; // ADMIN, MEMBER
    private String status = "ACTIVE"; // ACTIVE, PENDING
    private Date joinedAt = new Date();

    public FamilyMember() {}

    public FamilyMember(String familyGroupId, String userId, String role) {
        this.familyGroupId = familyGroupId;
        this.userId = userId;
        this.role = role;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getFamilyGroupId() { return familyGroupId; }
    public void setFamilyGroupId(String familyGroupId) { this.familyGroupId = familyGroupId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Date getJoinedAt() { return joinedAt; }
    public void setJoinedAt(Date joinedAt) { this.joinedAt = joinedAt; }
}
