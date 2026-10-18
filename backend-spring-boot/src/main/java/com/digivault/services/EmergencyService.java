package com.digivault.services;

import com.digivault.models.*;
import com.digivault.payload.DocumentDto.DocumentResponse;
import com.digivault.payload.EmergencyDto.*;
import com.digivault.repositories.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class EmergencyService {

    @Autowired
    private EmergencyContactRepository emergencyContactRepository;

    @Autowired
    private EmergencyMedicalInfoRepository emergencyMedicalInfoRepository;

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private DocumentService documentService;

    @Autowired
    private AuditLogRepository auditLogRepository;

    public List<EmergencyContact> getContacts(User user) {
        return emergencyContactRepository.findByUserId(user.getId());
    }

    public EmergencyContact addContact(User user, ContactRequest req) {
        EmergencyContact contact = new EmergencyContact(
                user.getId(),
                req.getName(),
                req.getRelationship(),
                req.getPhone(),
                req.getEmail()
        );
        contact.setCanAccessEmergencyDocs(req.isCanAccessEmergencyDocs());
        return emergencyContactRepository.save(contact);
    }

    public void deleteContact(User user, String contactId) {
        emergencyContactRepository.findById(contactId).ifPresent(c -> {
            if (c.getUserId().equals(user.getId())) {
                emergencyContactRepository.delete(c);
            }
        });
    }

    public EmergencyMedicalInfo getMedicalInfo(User user) {
        return emergencyMedicalInfoRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    EmergencyMedicalInfo info = new EmergencyMedicalInfo();
                    info.setUserId(user.getId());
                    return info;
                });
    }

    public EmergencyMedicalInfo saveMedicalInfo(User user, MedicalInfoRequest req) {
        EmergencyMedicalInfo info = emergencyMedicalInfoRepository.findByUserId(user.getId())
                .orElse(new EmergencyMedicalInfo());

        info.setUserId(user.getId());
        info.setBloodGroup(req.getBloodGroup());
        info.setAllergies(req.getAllergies());
        info.setChronicConditions(req.getChronicConditions());
        info.setEmergencyNotes(req.getEmergencyNotes());
        info.setUpdatedAt(new Date());

        return emergencyMedicalInfoRepository.save(info);
    }

    /**
     * Break-Glass Emergency Mode
     * Provides instantaneous access to essential emergency documents and medical profile
     */
    public BreakGlassResponse executeBreakGlass(User user) {
        EmergencyMedicalInfo medicalInfo = getMedicalInfo(user);
        List<EmergencyContact> contacts = getContacts(user);

        // Fetch documents designated for emergency vault
        List<DocumentRecord> emergencyDocs = documentRepository.findByUserIdAndIsEmergencyEligible(user.getId(), true);
        List<DocumentResponse> docResponses = emergencyDocs.stream()
                .map(documentService::toResponse)
                .collect(Collectors.toList());

        // Audit Log entry
        AuditLog log = new AuditLog(user.getId(), "BREAK_GLASS_TRIGGERED", "EMERGENCY_VAULT", "127.0.0.1", "DigiVault App");
        auditLogRepository.save(log);

        return new BreakGlassResponse(
                true,
                "Emergency Vault Unlocked: Essential medical information and emergency documents loaded.",
                medicalInfo,
                docResponses,
                contacts
        );
    }
}
