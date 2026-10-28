package com.digivault.repositories;

import com.digivault.models.FamilyInvitation;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FamilyInvitationRepository extends MongoRepository<FamilyInvitation, String> {
    Optional<FamilyInvitation> findByToken(String token);
    List<FamilyInvitation> findByInviteeEmail(String inviteeEmail);
    List<FamilyInvitation> findByFamilyGroupId(String familyGroupId);
    void deleteByFamilyGroupId(String familyGroupId);
}
