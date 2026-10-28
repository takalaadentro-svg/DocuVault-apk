package com.digivault.repositories;

import com.digivault.models.FamilyMember;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FamilyMemberRepository extends MongoRepository<FamilyMember, String> {
    List<FamilyMember> findByFamilyGroupId(String familyGroupId);
    List<FamilyMember> findByUserId(String userId);
    Optional<FamilyMember> findByFamilyGroupIdAndUserId(String familyGroupId, String userId);
    void deleteByFamilyGroupIdAndUserId(String familyGroupId, String userId);
    void deleteByFamilyGroupId(String familyGroupId);
}
