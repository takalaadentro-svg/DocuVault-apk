package com.digivault.payload;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;

public class FamilyDto {

    public static class CreateGroupRequest {
        private String name;

        public CreateGroupRequest() {}

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
    }

    public static class InviteMemberRequest {
        private String email;

        public InviteMemberRequest() {}

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }
    }

    public static class MemberInfo {
        private String id;

        @JsonProperty("user_id")
        @JsonAlias({"userId"})
        private String userId;

        @JsonProperty("full_name")
        @JsonAlias({"fullName", "name"})
        private String fullName;

        private String email;
        private String role;
        private String status;

        @JsonProperty("joined_at")
        @JsonAlias({"joinedAt"})
        private Date joinedAt;

        public MemberInfo() {}

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getUserId() { return userId; }
        public void setUserId(String userId) { this.userId = userId; }

        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getRole() { return role; }
        public void setRole(String role) { this.role = role; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public Date getJoinedAt() { return joinedAt; }
        public void setJoinedAt(Date joinedAt) { this.joinedAt = joinedAt; }
    }

    public static class FamilyGroupDetails {
        private String id;
        private String name;

        @JsonProperty("owner_id")
        @JsonAlias({"ownerId"})
        private String ownerId;

        @JsonProperty("created_at")
        @JsonAlias({"createdAt"})
        private Date createdAt;

        private List<MemberInfo> members;
        private List<DocumentDto.DocumentResponse> documents = new ArrayList<>();

        public FamilyGroupDetails() {}

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getOwnerId() { return ownerId; }
        public void setOwnerId(String ownerId) { this.ownerId = ownerId; }

        public Date getCreatedAt() { return createdAt; }
        public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }

        public List<MemberInfo> getMembers() { return members; }
        public void setMembers(List<MemberInfo> members) { this.members = members; }

        public List<DocumentDto.DocumentResponse> getDocuments() { return documents; }
        public void setDocuments(List<DocumentDto.DocumentResponse> documents) { this.documents = documents; }
    }
}
