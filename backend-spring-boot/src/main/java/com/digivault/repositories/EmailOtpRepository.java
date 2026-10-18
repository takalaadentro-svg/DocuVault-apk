package com.digivault.repositories;

import com.digivault.models.EmailOtp;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmailOtpRepository extends MongoRepository<EmailOtp, String> {
    Optional<EmailOtp> findTopByEmailAndPurposeAndUsedFalseOrderByCreatedAtDesc(String email, String purpose);
    List<EmailOtp> findByEmail(String email);
    void deleteByEmail(String email);
}
