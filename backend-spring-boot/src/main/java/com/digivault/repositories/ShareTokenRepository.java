package com.digivault.repositories;

import com.digivault.models.ShareToken;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShareTokenRepository extends MongoRepository<ShareToken, String> {
    Optional<ShareToken> findByToken(String token);
    List<ShareToken> findByDocumentId(String documentId);
}
