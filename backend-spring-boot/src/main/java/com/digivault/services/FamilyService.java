package com.digivault.services;

import com.digivault.models.*;
import com.digivault.payload.FamilyDto.*;
import com.digivault.repositories.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class FamilyService {

    @Autowired
    private FamilyGroupRepository familyGroupRepository;

    @Autowired
    private FamilyMemberRepository familyMemberRepository;

    @Autowired
    private FamilyInvitationRepository familyInvitationRepository;

    @Autowired
    private UserRepository userRepository;

    public FamilyGroupDetails getOrCreateFamilyGroup(User user) {
        List<FamilyMember> memberships = familyMemberRepository.findByUserId(user.getId());
        FamilyGroup group;

        if (memberships.isEmpty()) {
            // Check if user is owner of any group
            List<FamilyGroup> ownedGroups = familyGroupRepository.findByOwnerId(user.getId());
            if (ownedGroups.isEmpty()) {
                group = new FamilyGroup(user.getFullName() + "'s Family Locker", user.getId());
                group = familyGroupRepository.save(group);

                FamilyMember member = new FamilyMember(group.getId(), user.getId(), "ADMIN");
                familyMemberRepository.save(member);
            } else {
                group = ownedGroups.get(0);
            }
        } else {
            String groupId = memberships.get(0).getFamilyGroupId();
            group = familyGroupRepository.findById(groupId)
                    .orElseGet(() -> {
                        FamilyGroup newGroup = new FamilyGroup(user.getFullName() + "'s Family Locker", user.getId());
                        return familyGroupRepository.save(newGroup);
                    });
        }

        return getGroupDetails(group);
    }

    public FamilyInvitation inviteMember(User user, String inviteeEmail) {
        FamilyGroupDetails details = getOrCreateFamilyGroup(user);

        // Check if already invited or member
        String token = UUID.randomUUID().toString();
        Calendar cal = Calendar.getInstance();
        cal.add(Calendar.DAY_OF_YEAR, 7); // 7 days expiration

        FamilyInvitation invitation = new FamilyInvitation(
                details.getId(),
                user.getId(),
                inviteeEmail.trim().toLowerCase(),
                token,
                cal.getTime()
        );
        return familyInvitationRepository.save(invitation);
    }

    public boolean acceptInvitation(User user, String token) {
        Optional<FamilyInvitation> invOpt = familyInvitationRepository.findByToken(token);
        if (!invOpt.isPresent()) {
            throw new RuntimeException("Invalid invitation token");
        }
        FamilyInvitation invitation = invOpt.get();
        if ("ACCEPTED".equalsIgnoreCase(invitation.getStatus())) {
            return true;
        }

        invitation.setStatus("ACCEPTED");
        familyInvitationRepository.save(invitation);

        Optional<FamilyMember> existing = familyMemberRepository.findByFamilyGroupIdAndUserId(
                invitation.getFamilyGroupId(), user.getId());

        if (!existing.isPresent()) {
            FamilyMember member = new FamilyMember(invitation.getFamilyGroupId(), user.getId(), "MEMBER");
            familyMemberRepository.save(member);
        }
        return true;
    }

    public void removeMember(User user, String memberUserId) {
        FamilyGroupDetails details = getOrCreateFamilyGroup(user);
        if (!details.getOwnerId().equals(user.getId())) {
            throw new RuntimeException("Only the family locker owner can remove members.");
        }
        familyMemberRepository.deleteByFamilyGroupIdAndUserId(details.getId(), memberUserId);
    }

    private FamilyGroupDetails getGroupDetails(FamilyGroup group) {
        FamilyGroupDetails details = new FamilyGroupDetails();
        details.setId(group.getId());
        details.setName(group.getName());
        details.setOwnerId(group.getOwnerId());
        details.setCreatedAt(group.getCreatedAt());

        List<FamilyMember> members = familyMemberRepository.findByFamilyGroupId(group.getId());
        List<MemberInfo> memberInfos = members.stream().map(m -> {
            MemberInfo info = new MemberInfo();
            info.setId(m.getId());
            info.setUserId(m.getUserId());
            info.setRole(m.getRole());
            info.setStatus(m.getStatus());
            info.setJoinedAt(m.getJoinedAt());

            userRepository.findById(m.getUserId()).ifPresent(u -> {
                info.setFullName(u.getFullName());
                info.setEmail(u.getEmail());
            });
            return info;
        }).collect(Collectors.toList());

        details.setMembers(memberInfos);
        return details;
    }
}
