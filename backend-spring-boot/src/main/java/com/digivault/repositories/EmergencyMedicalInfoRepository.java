package com.digivault.repositories;

import com.digivault.models.EmergencyMedicalInfo;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmergencyMedicalInfoRepository extends MongoRepository<EmergencyMedicalInfo, String> {
    Optional<EmergencyMedicalInfo> findByUserId(String userId);
}
