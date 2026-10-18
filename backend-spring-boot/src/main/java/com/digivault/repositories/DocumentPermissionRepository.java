package com.digivault.repositories;

import com.digivault.models.DocumentPermission;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentPermissionRepository extends MongoRepository<DocumentPermission, String> {
    List<DocumentPermission> findByDocumentId(String documentId);
    List<DocumentPermission> findByUserId(String userId);
    Optional<DocumentPermission> findByDocumentIdAndUserId(String documentId, String userId);
    void deleteByDocumentIdAndUserId(String documentId, String userId);
}
