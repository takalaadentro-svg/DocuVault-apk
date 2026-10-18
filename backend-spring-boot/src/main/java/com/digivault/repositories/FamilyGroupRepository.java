package com.digivault.repositories;

import com.digivault.models.FamilyGroup;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FamilyGroupRepository extends MongoRepository<FamilyGroup, String> {
    List<FamilyGroup> findByOwnerId(String ownerId);
}
