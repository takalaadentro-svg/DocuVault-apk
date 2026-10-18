package com.digivault.repositories;

import com.digivault.models.OcrFeedback;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OcrFeedbackRepository extends MongoRepository<OcrFeedback, String> {
    List<OcrFeedback> findByDocumentId(String documentId);
    List<OcrFeedback> findByUserId(String userId);
}
