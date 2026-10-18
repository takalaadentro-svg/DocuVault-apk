package com.digivault.models;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;

@Document(collection = "document_permissions")
@CompoundIndex(name = "doc_user_unique", def = "{'documentId': 1, 'userId': 1}", unique = true)
public class DocumentPermission {

    @Id
    private String id;
    private String documentId;
    private String userId;
    private String accessLevel = "VIEW"; // VIEW, DOWNLOAD, ADMIN
    private Date grantedAt = new Date();

    public DocumentPermission() {}

    public DocumentPermission(String documentId, String userId, String accessLevel) {
        this.documentId = documentId;
        this.userId = userId;
        this.accessLevel = accessLevel;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getDocumentId() { return documentId; }
    public void setDocumentId(String documentId) { this.documentId = documentId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public String getAccessLevel() { return accessLevel; }
    public void setAccessLevel(String accessLevel) { this.accessLevel = accessLevel; }

    public Date getGrantedAt() { return grantedAt; }
    public void setGrantedAt(Date grantedAt) { this.grantedAt = grantedAt; }
}
