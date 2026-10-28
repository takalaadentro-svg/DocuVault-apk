package com.digivault.repositories;

import com.digivault.models.DocumentRecord;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRepository extends MongoRepository<DocumentRecord, String> {

    List<DocumentRecord> findByUserId(String userId);

    @Query("{ 'userId': ?0, '$or': [ { 'isFamilyVault': ?1 }, { 'familyVault': ?1 }, { 'is_family_vault': ?1 } ] }")
    List<DocumentRecord> findByUserIdAndIsFamilyVault(String userId, boolean isFamilyVault);

    @Query("{ 'userId': { '$in': ?0 }, '$or': [ { 'isFamilyVault': ?1 }, { 'familyVault': ?1 }, { 'is_family_vault': ?1 } ] }")
    List<DocumentRecord> findByUserIdInAndIsFamilyVault(List<String> userIds, boolean isFamilyVault);

    @Query("{ 'userId': ?0, 'isEmergencyEligible': ?1 }")
    List<DocumentRecord> findByUserIdAndIsEmergencyEligible(String userId, boolean isEmergencyEligible);

    List<DocumentRecord> findByUserIdAndExpiryDateNotNull(String userId);

    List<DocumentRecord> findByExpiryDateNotNull();

    List<DocumentRecord> findByUserIdAndCategory(String userId, String category);

    List<DocumentRecord> findByUserIdAndExpiryDateBetween(String userId, Date start, Date end);

    List<DocumentRecord> findByExpiryDateBetween(Date start, Date end);

    List<DocumentRecord> findByUserIdAndSha256Hash(String userId, String sha256Hash);

    Optional<DocumentRecord> findFirstBySha256Hash(String sha256Hash);

    List<DocumentRecord> findByUserIdAndCollectionName(String userId, String collectionName);

    @Query("{ 'userId': ?0, '$or': [ {'title': {$regex: ?1, $options: 'i'}}, {'ocrText': {$regex: ?1, $options: 'i'}}, {'notes': {$regex: ?1, $options: 'i'}}, {'issuer': {$regex: ?1, $options: 'i'}}, {'category': {$regex: ?1, $options: 'i'}}, {'holderName': {$regex: ?1, $options: 'i'}}, {'docNumber': {$regex: ?1, $options: 'i'}} ] }")
    List<DocumentRecord> searchDocuments(String userId, String regexPattern);
}
