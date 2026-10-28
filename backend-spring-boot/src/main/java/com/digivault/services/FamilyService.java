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
            member.setStatus("ACTIVE");
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

    public FamilyGroupDetails createFamilyGroup(User user, String groupName) {
        String name = (groupName != null && !groupName.trim().isEmpty())
                ? groupName.trim()
                : user.getFullName() + "'s Family Vault";

        FamilyGroup group = new FamilyGroup(name, user.getId());
        group = familyGroupRepository.save(group);

        FamilyMember member = new FamilyMember(group.getId(), user.getId(), "ADMIN");
        member.setStatus("ACTIVE");
        familyMemberRepository.save(member);

        return getGroupDetails(group);
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
        return inviteMember(user, null, inviteeEmail, "MEMBER");
    }

    public FamilyInvitation inviteMember(User user, String familyId, String inviteeEmail, String role) {
        if (inviteeEmail == null || inviteeEmail.trim().isEmpty()) {
            throw new RuntimeException("Invitee email address is required.");
        }

        FamilyGroup targetGroup;
        if (familyId != null && !familyId.trim().isEmpty()) {
            targetGroup = familyGroupRepository.findById(familyId.trim())
                    .orElseThrow(() -> new RuntimeException("Family group not found."));
            // Check permission: user must be owner or admin of this family group
            boolean isOwner = targetGroup.getOwnerId().equals(user.getId());
            boolean isAdmin = familyMemberRepository.findByFamilyGroupIdAndUserId(targetGroup.getId(), user.getId())
                    .map(m -> "ADMIN".equalsIgnoreCase(m.getRole()) || "OWNER".equalsIgnoreCase(m.getRole()))
                    .orElse(false);
            if (!isOwner && !isAdmin) {
                throw new RuntimeException("Only vault admins or the owner can invite members.");
            }
        } else {
            FamilyGroupDetails defaultGroup = getOrCreateFamilyGroup(user);
            targetGroup = familyGroupRepository.findById(defaultGroup.getId())
                    .orElseThrow(() -> new RuntimeException("Default family group not found."));
        }

        String cleanEmail = inviteeEmail.trim().toLowerCase();
        if (user.getEmail() != null && cleanEmail.equalsIgnoreCase(user.getEmail().trim().toLowerCase())) {
            throw new RuntimeException("You cannot invite yourself to your own Family Vault.");
        }

        // Check if user is already a member
        Optional<User> existingUserOpt = userRepository.findByEmail(cleanEmail);
        if (existingUserOpt.isPresent()) {
            User existingUser = existingUserOpt.get();
            if (targetGroup.getOwnerId().equals(existingUser.getId()) ||
                    familyMemberRepository.findByFamilyGroupIdAndUserId(targetGroup.getId(), existingUser.getId()).isPresent()) {
                throw new RuntimeException("This user is already a member of this Family Vault.");
            }
        }

        // Check for existing pending invitation to this family group
        List<FamilyInvitation> existingInvs = familyInvitationRepository.findByFamilyGroupId(targetGroup.getId());
        for (FamilyInvitation inv : existingInvs) {
            if (cleanEmail.equalsIgnoreCase(inv.getInviteeEmail()) && "PENDING".equalsIgnoreCase(inv.getStatus())) {
                Calendar cal = Calendar.getInstance();
                cal.add(Calendar.DAY_OF_YEAR, 7);
                inv.setExpiresAt(cal.getTime());
                familyInvitationRepository.save(inv);

                CompletableFuture.runAsync(() -> {
                    try {
                        emailService.sendFamilyInvitationEmail(
                                cleanEmail,
                                user.getFullName(),
                                targetGroup.getName(),
                                inv.getToken(),
                                cal.getTime()
                        );
                    } catch (Exception ex) {
                        logger.warn("Could not resend invitation email: {}", ex.getMessage());
                    }
                });
                return inv;
            }
        }

        String token = UUID.randomUUID().toString();
        Calendar cal = Calendar.getInstance();
        cal.add(Calendar.DAY_OF_YEAR, 7); // 7 days expiration

        FamilyInvitation invitation = new FamilyInvitation(
                targetGroup.getId(),
                user.getId(),
                cleanEmail,
                token,
                cal.getTime()
        );
        invitation.setStatus("PENDING");

        FamilyInvitation saved = familyInvitationRepository.save(invitation);

        // Send in-app notification to invitee if registered
        if (existingUserOpt.isPresent() && notificationRepository != null) {
            try {
                Notification notif = new Notification(
                        existingUserOpt.get().getId(),
                        "Family Vault Invitation",
                        user.getFullName() + " invited you to join the \"" + targetGroup.getName() + "\" Family Vault.",
                        "FAMILY_INVITE",
                        null
                );
                notificationRepository.save(notif);
            } catch (Exception ex) {
                logger.warn("Could not save in-app family notification: {}", ex.getMessage());
            }
        }

        CompletableFuture.runAsync(() -> {
            try {
                emailService.sendFamilyInvitationEmail(
                        cleanEmail,
                        user.getFullName(),
                        targetGroup.getName(),
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
        String userEmail = user.getEmail() != null ? user.getEmail().trim().toLowerCase() : "";
        List<FamilyInvitation> list = familyInvitationRepository.findByInviteeEmail(userEmail);
        if (user.getEmail() != null && !user.getEmail().equalsIgnoreCase(userEmail)) {
            list.addAll(familyInvitationRepository.findByInviteeEmail(user.getEmail()));
        }

        List<Map<String, Object>> response = new ArrayList<>();
        Set<String> seenInvIds = new HashSet<>();
        Date now = new Date();

        for (FamilyInvitation inv : list) {
            if (inv.getId() != null && seenInvIds.contains(inv.getId())) {
                continue;
            }
            if ("PENDING".equalsIgnoreCase(inv.getStatus())) {
                if (inv.getExpiresAt() != null && inv.getExpiresAt().before(now)) {
                    inv.setStatus("EXPIRED");
                    familyInvitationRepository.save(inv);
                    continue;
                }

                seenInvIds.add(inv.getId());
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
            throw new RuntimeException("Invalid or expired invitation token.");
        }
        FamilyInvitation invitation = invOpt.get();
        if ("ACCEPTED".equalsIgnoreCase(invitation.getStatus())) {
            return true;
        }

        if (invitation.getExpiresAt() != null && invitation.getExpiresAt().before(new Date())) {
            invitation.setStatus("EXPIRED");
            familyInvitationRepository.save(invitation);
            throw new RuntimeException("This invitation has expired.");
        }

        invitation.setStatus("ACCEPTED");
        familyInvitationRepository.save(invitation);

        Optional<FamilyMember> existing = familyMemberRepository.findByFamilyGroupIdAndUserId(
                invitation.getFamilyGroupId(), user.getId());

        if (!existing.isPresent()) {
            FamilyMember member = new FamilyMember(invitation.getFamilyGroupId(), user.getId(), "MEMBER");
            member.setStatus("ACTIVE");
            familyMemberRepository.save(member);
        }

        // Notify inviter
        if (notificationRepository != null && invitation.getInviterId() != null) {
            try {
                familyGroupRepository.findById(invitation.getFamilyGroupId()).ifPresent(g -> {
                    Notification notif = new Notification(
                            invitation.getInviterId(),
                            "Invitation Accepted",
                            user.getFullName() + " accepted your invitation to join \"" + g.getName() + "\".",
                            "FAMILY_JOIN",
                            null
                    );
                    notificationRepository.save(notif);
                });
            } catch (Exception ex) {
                logger.warn("Could not save invitation accepted notification: {}", ex.getMessage());
            }
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

    public void leaveFamilyGroup(User user, String familyGroupId) {
        FamilyGroup group = familyGroupRepository.findById(familyGroupId)
                .orElseThrow(() -> new RuntimeException("Family group not found."));

        if (group.getOwnerId().equals(user.getId())) {
            List<FamilyMember> members = familyMemberRepository.findByFamilyGroupId(familyGroupId);
            boolean hasOtherMembers = members.stream()
                    .anyMatch(m -> m.getUserId() != null && !m.getUserId().equals(user.getId()));
            if (hasOtherMembers) {
                throw new RuntimeException("As vault owner, you cannot leave while other members belong to this group. You may delete the vault or remove members first.");
            }
            deleteFamilyGroup(user, familyGroupId);
            return;
        }

        familyMemberRepository.deleteByFamilyGroupIdAndUserId(familyGroupId, user.getId());
    }

    public void deleteFamilyGroup(User user, String familyGroupId) {
        FamilyGroup group = familyGroupRepository.findById(familyGroupId)
                .orElseThrow(() -> new RuntimeException("Family group not found."));

        if (!group.getOwnerId().equals(user.getId())) {
            throw new RuntimeException("Only the vault owner can delete this Family Vault.");
        }

        familyMemberRepository.deleteByFamilyGroupId(familyGroupId);
        familyInvitationRepository.deleteByFamilyGroupId(familyGroupId);
        familyGroupRepository.delete(group);
    }

    public void removeMember(User user, String memberUserIdOrId) {
        removeMember(user, null, memberUserIdOrId);
    }

    public void removeMember(User user, String familyId, String memberUserIdOrId) {
        FamilyGroup targetGroup;
        if (familyId != null && !familyId.trim().isEmpty()) {
            targetGroup = familyGroupRepository.findById(familyId.trim())
                    .orElseThrow(() -> new RuntimeException("Family group not found."));
        } else {
            FamilyGroupDetails details = getOrCreateFamilyGroup(user);
            targetGroup = familyGroupRepository.findById(details.getId())
                    .orElseThrow(() -> new RuntimeException("Family group not found."));
        }

        boolean isOwner = targetGroup.getOwnerId().equals(user.getId());
        boolean isAdmin = familyMemberRepository.findByFamilyGroupIdAndUserId(targetGroup.getId(), user.getId())
                .map(m -> "ADMIN".equalsIgnoreCase(m.getRole()) || "OWNER".equalsIgnoreCase(m.getRole()))
                .orElse(false);

        if (!isOwner && !isAdmin) {
            throw new RuntimeException("Only vault admins or the owner can remove members.");
        }

        if (targetGroup.getOwnerId().equals(memberUserIdOrId)) {
            throw new RuntimeException("Cannot remove the vault owner from the family group.");
        }

        familyMemberRepository.deleteByFamilyGroupIdAndUserId(targetGroup.getId(), memberUserIdOrId);
        familyMemberRepository.findById(memberUserIdOrId).ifPresent(m -> {
            if (m.getFamilyGroupId().equals(targetGroup.getId())) {
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
                            if (r.getHolderName() == null || r.getHolderName().trim().isEmpty()) {
                                r.setHolderName(u.getFullName());
                            }
                            if (r.getIssuer() == null || r.getIssuer().trim().isEmpty() || "Personal".equalsIgnoreCase(r.getIssuer()) || "Personal Record".equalsIgnoreCase(r.getIssuer())) {
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
