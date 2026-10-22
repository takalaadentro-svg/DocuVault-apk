package com.digivault.services;

import java.util.concurrent.CompletableFuture;

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

    @Autowired
    private EmailService emailService;

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(FamilyService.class);

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
        FamilyInvitation saved = familyInvitationRepository.save(invitation);
        CompletableFuture.runAsync(() -> {
            try {
                emailService.sendFamilyInvitationEmail(
                        inviteeEmail.trim().toLowerCase(),
                        user.getFullName(),
                        details.getName(),
                        token,
                        cal.getTime()
                );
            } catch (Exception ex) {
                logger.warn("Could not dispatch invitation email: {}", ex.getMessage());
            }
        });
        return saved;
    }

    public List<Map<String, Object>> getPendingInvitations(User user) {
        List<FamilyInvitation> list = familyInvitationRepository.findByInviteeEmail(user.getEmail());
        List<Map<String, Object>> response = new ArrayList<>();
        for (FamilyInvitation inv : list) {
            if ("PENDING".equalsIgnoreCase(inv.getStatus())) {
                Map<String, Object> map = new HashMap<>();
                map.put("id", inv.getId());
                map.put("token", inv.getToken());
                map.put("family_id", inv.getFamilyGroupId());
                map.put("invitee_email", inv.getInviteeEmail());
                map.put("status", inv.getStatus());
                map.put("created_at", inv.getCreatedAt());
                map.put("role", "MEMBER");

                familyGroupRepository.findById(inv.getFamilyGroupId()).ifPresent(g -> {
                    map.put("family_name", g.getName());
                });

                userRepository.findById(inv.getInviterId()).ifPresent(u -> {
                    map.put("inviter_name", u.getFullName());
                });

                response.add(map);
            }
        }
        return response;
    }

    public boolean acceptInvitation(User user, String tokenOrId) {
        Optional<FamilyInvitation> invOpt = familyInvitationRepository.findByToken(tokenOrId);
        if (!invOpt.isPresent()) {
            invOpt = familyInvitationRepository.findById(tokenOrId);
        }
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

    public boolean declineInvitation(User user, String tokenOrId) {
        Optional<FamilyInvitation> invOpt = familyInvitationRepository.findByToken(tokenOrId);
        if (!invOpt.isPresent()) {
            invOpt = familyInvitationRepository.findById(tokenOrId);
        }
        if (!invOpt.isPresent()) {
            throw new RuntimeException("Invalid invitation token");
        }
        FamilyInvitation invitation = invOpt.get();
        invitation.setStatus("DECLINED");
        familyInvitationRepository.save(invitation);
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
