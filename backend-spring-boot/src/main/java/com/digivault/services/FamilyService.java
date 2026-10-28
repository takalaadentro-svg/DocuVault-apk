package com.digivault.services;

import java.util.concurrent.CompletableFuture;

import com.digivault.models.*;
import com.digivault.payload.DocumentDto;
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

    @Autowired(required = false)
    private NotificationRepository notificationRepository;

    @Autowired(required = false)
    private DocumentRepository documentRepository;

    @Autowired(required = false)
    @org.springframework.context.annotation.Lazy
    private DocumentService documentService;

    private static final org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(FamilyService.class);

    public List<FamilyGroupDetails> getUserFamilyGroups(User user) {
        // Auto-link and activate any pending family invitations for this user's email
        if (user.getEmail() != null && !user.getEmail().trim().isEmpty()) {
            try {
                List<FamilyInvitation> pending = familyInvitationRepository.findByInviteeEmail(user.getEmail().trim().toLowerCase());
                for (FamilyInvitation inv : pending) {
                    if ("PENDING".equalsIgnoreCase(inv.getStatus())) {
                        inv.setStatus("ACCEPTED");
                        familyInvitationRepository.save(inv);
                    }
                    if (inv.getFamilyGroupId() != null) {
                        Optional<FamilyMember> existingM = familyMemberRepository.findByFamilyGroupIdAndUserId(inv.getFamilyGroupId(), user.getId());
                        if (!existingM.isPresent()) {
                            FamilyMember m = new FamilyMember(inv.getFamilyGroupId(), user.getId(), "MEMBER");
                            m.setStatus("ACTIVE");
                            familyMemberRepository.save(m);
                        }
                    }
                }
            } catch (Exception ex) {
                logger.warn("Could not auto-link family invitations: {}", ex.getMessage());
            }
        }

        List<FamilyMember> memberships = familyMemberRepository.findByUserId(user.getId());
        List<FamilyGroupDetails> results = new ArrayList<>();
        Set<String> seenGroupIds = new HashSet<>();

        for (FamilyMember m : memberships) {
            if (m.getFamilyGroupId() != null && !seenGroupIds.contains(m.getFamilyGroupId())) {
                familyGroupRepository.findById(m.getFamilyGroupId()).ifPresent(g -> {
                    results.add(getGroupDetails(g));
                    seenGroupIds.add(g.getId());
                });
            }
        }

        List<FamilyGroup> ownedGroups = familyGroupRepository.findByOwnerId(user.getId());
        for (FamilyGroup g : ownedGroups) {
            if (g.getId() != null && !seenGroupIds.contains(g.getId())) {
                results.add(getGroupDetails(g));
                seenGroupIds.add(g.getId());
            }
        }

        if (results.isEmpty()) {
            FamilyGroup group = new FamilyGroup(user.getFullName() + "'s Family Locker", user.getId());
            group = familyGroupRepository.save(group);

            FamilyMember member = new FamilyMember(group.getId(), user.getId(), "ADMIN");
            familyMemberRepository.save(member);
            results.add(getGroupDetails(group));
        }

        // Prioritize active multi-member shared groups first, then newest
        results.sort((a, b) -> {
            int aCount = a.getMembers() != null ? a.getMembers().size() : 0;
            int bCount = b.getMembers() != null ? b.getMembers().size() : 0;
            if (aCount != bCount) {
                return Integer.compare(bCount, aCount); // higher member count first
            }
            if (a.getCreatedAt() != null && b.getCreatedAt() != null) {
                return b.getCreatedAt().compareTo(a.getCreatedAt());
            }
            return 0;
        });

        return results;
    }

    public FamilyGroupDetails getOrCreateFamilyGroup(User user) {
        List<FamilyGroupDetails> groups = getUserFamilyGroups(user);
        return groups.get(0);
    }

    public Set<String> getFamilyMemberUserIds(String userId) {
        Set<String> memberIds = new HashSet<>();
        if (userId == null || userId.trim().isEmpty()) {
            return memberIds;
        }
        memberIds.add(userId);

        Set<String> groupIds = new HashSet<>();
        List<FamilyMember> memberships = familyMemberRepository.findByUserId(userId);
        for (FamilyMember m : memberships) {
            if (m.getFamilyGroupId() != null) {
                groupIds.add(m.getFamilyGroupId());
            }
        }

        List<FamilyGroup> owned = familyGroupRepository.findByOwnerId(userId);
        for (FamilyGroup g : owned) {
            if (g.getId() != null) {
                groupIds.add(g.getId());
            }
        }

        for (String gid : groupIds) {
            List<FamilyMember> members = familyMemberRepository.findByFamilyGroupId(gid);
            for (FamilyMember m : members) {
                if (m.getUserId() != null) {
                    memberIds.add(m.getUserId());
                }
            }
            familyGroupRepository.findById(gid).ifPresent(g -> {
                if (g.getOwnerId() != null) {
                    memberIds.add(g.getOwnerId());
                }
            });
        }
        return memberIds;
    }

    public boolean areUsersInSameFamilyGroup(String userId1, String userId2) {
        if (userId1 == null || userId2 == null) {
            return false;
        }
        if (userId1.equals(userId2)) {
            return true;
        }
        return getFamilyMemberUserIds(userId1).contains(userId2);
    }

    public boolean isUserAdminOfFamilyGroupWith(String currentUserId, String targetUserId) {
        if (currentUserId == null || targetUserId == null) return false;
        if (currentUserId.equals(targetUserId)) return true;

        List<FamilyGroup> ownedGroups = familyGroupRepository.findByOwnerId(currentUserId);
        for (FamilyGroup g : ownedGroups) {
            if (g.getId() != null) {
                if (targetUserId.equals(g.getOwnerId())) return true;
                Optional<FamilyMember> m = familyMemberRepository.findByFamilyGroupIdAndUserId(g.getId(), targetUserId);
                if (m.isPresent()) return true;
            }
        }

        List<FamilyMember> adminMemberships = familyMemberRepository.findByUserId(currentUserId);
        for (FamilyMember am : adminMemberships) {
            if ("ADMIN".equalsIgnoreCase(am.getRole()) && am.getFamilyGroupId() != null) {
                Optional<FamilyMember> targetM = familyMemberRepository.findByFamilyGroupIdAndUserId(am.getFamilyGroupId(), targetUserId);
                if (targetM.isPresent()) return true;
                Optional<FamilyGroup> grp = familyGroupRepository.findById(am.getFamilyGroupId());
                if (grp.isPresent() && targetUserId.equals(grp.get().getOwnerId())) return true;
            }
        }
        return false;
    }

    public FamilyInvitation inviteMember(User user, String inviteeEmail) {
        FamilyGroupDetails details = getOrCreateFamilyGroup(user);
        String cleanEmail = inviteeEmail.trim().toLowerCase();

        String token = UUID.randomUUID().toString();
        Calendar cal = Calendar.getInstance();
        cal.add(Calendar.DAY_OF_YEAR, 7); // 7 days expiration

        FamilyInvitation invitation = new FamilyInvitation(
                details.getId(),
                user.getId(),
                cleanEmail,
                token,
                cal.getTime()
        );

        // If invitee is already a registered user, immediately add them to the family group!
        Optional<User> existingUserOpt = userRepository.findByEmail(cleanEmail);
        if (existingUserOpt.isPresent()) {
            User existingUser = existingUserOpt.get();
            invitation.setStatus("ACCEPTED");

            Optional<FamilyMember> existingMember = familyMemberRepository.findByFamilyGroupIdAndUserId(
                    details.getId(), existingUser.getId());
            if (!existingMember.isPresent()) {
                FamilyMember member = new FamilyMember(details.getId(), existingUser.getId(), "MEMBER");
                member.setStatus("ACTIVE");
                familyMemberRepository.save(member);
            }

            if (notificationRepository != null) {
                try {
                    Notification notif = new Notification(
                            existingUser.getId(),
                            "Added to Family Vault",
                            user.getFullName() + " added you to the \"" + details.getName() + "\" Family Vault. You can now view and share family documents.",
                            "FAMILY_INVITE",
                            null
                    );
                    notificationRepository.save(notif);
                } catch (Exception ex) {
                    logger.warn("Could not save in-app family notification: {}", ex.getMessage());
                }
            }
        }

        FamilyInvitation saved = familyInvitationRepository.save(invitation);
        CompletableFuture.runAsync(() -> {
            try {
                emailService.sendFamilyInvitationEmail(
                        cleanEmail,
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

    public void removeMember(User user, String memberUserIdOrId) {
        FamilyGroupDetails details = getOrCreateFamilyGroup(user);
        if (!details.getOwnerId().equals(user.getId())) {
            throw new RuntimeException("Only the family locker owner can remove members.");
        }
        familyMemberRepository.deleteByFamilyGroupIdAndUserId(details.getId(), memberUserIdOrId);
        familyMemberRepository.findById(memberUserIdOrId).ifPresent(m -> {
            if (m.getFamilyGroupId().equals(details.getId())) {
                familyMemberRepository.delete(m);
            }
        });
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

        List<String> memberUserIds = members.stream()
                .map(FamilyMember::getUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());

        if (group.getOwnerId() != null && !memberUserIds.contains(group.getOwnerId())) {
            memberUserIds.add(group.getOwnerId());
        }

        if (documentRepository != null && !memberUserIds.isEmpty()) {
            try {
                List<DocumentRecord> docs = documentRepository.findByUserIdInAndIsFamilyVault(memberUserIds, true);
                List<DocumentDto.DocumentResponse> docResponses = docs.stream().map(d -> {
                    DocumentDto.DocumentResponse r = (documentService != null) ? documentService.toResponse(d) : toDocumentResponseFallback(d);
                    if (userRepository != null && d.getUserId() != null) {
                        userRepository.findById(d.getUserId()).ifPresent(u -> {
                            if (r.getHolderName() == null || r.getHolderName().isBlank()) {
                                r.setHolderName(u.getFullName());
                            }
                            if (r.getIssuer() == null || r.getIssuer().isBlank() || "Personal".equalsIgnoreCase(r.getIssuer()) || "Personal Record".equalsIgnoreCase(r.getIssuer())) {
                                r.setIssuer("Shared by " + u.getFullName());
                            }
                        });
                    }
                    return r;
                }).collect(Collectors.toList());
                details.setDocuments(docResponses);
            } catch (Exception ex) {
                logger.warn("Could not attach family documents to group details: {}", ex.getMessage());
            }
        }

        return details;
    }

    private DocumentDto.DocumentResponse toDocumentResponseFallback(DocumentRecord d) {
        DocumentDto.DocumentResponse r = new DocumentDto.DocumentResponse();
        r.setId(d.getId());
        r.setUserId(d.getUserId());
        r.setTitle(d.getTitle());
        r.setCategory(d.getCategory());
        r.setDocType(d.getDocType());
        r.setSubtype(d.getSubtype());
        r.setIssuer(d.getIssuer());
        r.setHolderName(d.getHolderName());
        r.setDocNumber(d.getDocNumber());
        r.setOriginalFilename(d.getOriginalFilename());
        r.setFileSize(d.getFileSize());
        r.setMimeType(d.getMimeType());
        r.setFamilyVault(d.isFamilyVault());
        r.setCreatedAt(d.getCreatedAt());
        r.setUpdatedAt(d.getUpdatedAt());
        return r;
    }
}
