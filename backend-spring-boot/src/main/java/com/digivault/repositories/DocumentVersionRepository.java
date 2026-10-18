package com.digivault.repositories;

import com.digivault.models.DocumentVersion;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DocumentVersionRepository extends MongoRepository<DocumentVersion, String> {
    List<DocumentVersion> findByDocumentIdOrderByVersionNumberDesc(String documentId);
    List<DocumentVersion> findByUserId(String userId);
    void deleteByDocumentId(String documentId);
}
