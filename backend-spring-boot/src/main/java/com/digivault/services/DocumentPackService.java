package com.digivault.services;

import com.digivault.models.DocumentRecord;
import com.digivault.models.User;
import com.digivault.payload.DocumentDto.DocumentPackDto;
import com.digivault.payload.DocumentDto.DocumentPackItem;
import com.digivault.repositories.DocumentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Smart Document Pack Generator - DocuVault 2.0
 * Generates structured purpose-based packs:
 * 1. College Admissions Pack
 * 2. Job Application / Onboarding Pack
 * 3. International Travel Pack
 * 4. Medical Emergency & Visit Pack
 * 5. Insurance Claim Pack
 */
@Service
public class DocumentPackService {

    @Autowired
    private DocumentRepository documentRepository;

    private static class PackDefinition {
        String packId;
        String name;
        String purpose;
        List<ItemReq> requirements;

        PackDefinition(String packId, String name, String purpose, List<ItemReq> requirements) {
            this.packId = packId;
            this.name = name;
            this.purpose = purpose;
            this.requirements = requirements;
        }
    }

    private static class ItemReq {
        String label;
        String category;
        List<String> keywords;

        ItemReq(String label, String category, List<String> keywords) {
            this.label = label;
            this.category = category;
            this.keywords = keywords;
        }
    }

    private final List<PackDefinition> packDefinitions = new ArrayList<>();

    public DocumentPackService() {
        initPacks();
    }

    private void initPacks() {
        // 1. College Admissions Pack
        packDefinitions.add(new PackDefinition(
                "pack_college",
                "College Admissions Pack",
                "Essential verified documents for university applications, counselling & admission verification",
                Arrays.asList(
                        new ItemReq("10th / Secondary Marksheet", "Education", Arrays.asList("10th", "secondary", "ssc", "matric", "high school")),
                        new ItemReq("12th / Higher Secondary Marksheet", "Education", Arrays.asList("12th", "higher secondary", "hsc", "intermediate")),
                        new ItemReq("Degree / Diploma / Provisional Certificate", "Education", Arrays.asList("degree", "provisional", "diploma", "graduation")),
                        new ItemReq("Government ID Proof (Aadhaar / Voter)", "Identity", Arrays.asList("aadhaar", "voter", "pan card", "identity")),
                        new ItemReq("Transfer / Migration Certificate", "Education", Arrays.asList("transfer", "migration", "leaving certificate", "tc"))
                )
        ));

        // 2. Job Application / Onboarding Pack
        packDefinitions.add(new PackDefinition(
                "pack_job",
                "Job Onboarding & Employment Pack",
                "Required paperwork for corporate onboarding, background verification (BGV) and payroll setup",
                Arrays.asList(
                        new ItemReq("PAN Card (Mandatory for Payroll)", "Identity", Arrays.asList("pan card", "pan")),
                        new ItemReq("Aadhaar Card (Address & ID)", "Identity", Arrays.asList("aadhaar", "uidai")),
                        new ItemReq("Highest Degree Certificate", "Education", Arrays.asList("degree", "bachelor", "master", "diploma")),
                        new ItemReq("Previous Relieving / Experience Letter", "Employment", Arrays.asList("relieving", "experience", "service certificate", "offer letter")),
                        new ItemReq("Cancelled Cheque / Bank Statement", "Finance", Arrays.asList("bank statement", "cheque", "account statement", "passbook"))
                )
        ));

        // 3. International Travel Pack
        packDefinitions.add(new PackDefinition(
                "pack_travel",
                "International Travel Pack",
                "All necessary permits, border documentation, flight records, and medical safety cover",
                Arrays.asList(
                        new ItemReq("Passport (Valid > 6 Months)", "Travel", Arrays.asList("passport", "republic of india")),
                        new ItemReq("Valid Visa / Entry Permit", "Travel", Arrays.asList("visa", "entry permit", "evisa")),
                        new ItemReq("Travel & Medical Insurance", "Travel", Arrays.asList("travel insurance", "insurance", "policy")),
                        new ItemReq("Vaccination / Health Certificate", "Medical", Arrays.asList("vaccination", "immunization", "covid", "yellow fever"))
                )
        ));

        // 4. Medical Emergency & Visit Pack
        packDefinitions.add(new PackDefinition(
                "pack_medical",
                "Medical Visit & Emergency Pack",
                "Clinical records, active health insurance policy, prescription and diagnostic history",
                Arrays.asList(
                        new ItemReq("Health Insurance Policy / TPA Card", "Finance", Arrays.asList("health insurance", "mediclaim", "tpa", "policy")),
                        new ItemReq("Recent Doctor Prescription", "Medical", Arrays.asList("prescription", "rx", "doctor")),
                        new ItemReq("Recent Diagnostic / Blood Lab Report", "Medical", Arrays.asList("lab report", "test report", "pathology", "blood test")),
                        new ItemReq("Government ID Proof", "Identity", Arrays.asList("aadhaar", "pan", "driving", "identity"))
                )
        ));

        // 5. Insurance Claim Pack
        packDefinitions.add(new PackDefinition(
                "pack_insurance",
                "Insurance Claim Settlement Pack",
                "Comprehensive claim dossier including hospital bills, policy schedule, and bank payout details",
                Arrays.asList(
                        new ItemReq("Active Policy Document", "Finance", Arrays.asList("policy", "insurance schedule", "coverage")),
                        new ItemReq("Hospital Discharge Summary", "Medical", Arrays.asList("discharge summary", "inpatient", "hospital")),
                        new ItemReq("Original Pharmacy & Medical Bills", "Medical", Arrays.asList("bill", "invoice", "receipt", "pharmacy")),
                        new ItemReq("Government Photo ID", "Identity", Arrays.asList("pan card", "aadhaar", "passport")),
                        new ItemReq("Cancelled Cheque for NEFT Payout", "Finance", Arrays.asList("cheque", "bank statement", "passbook"))
                )
        ));
    }

    public List<DocumentPackDto> getUserPacks(User user) {
        List<DocumentRecord> userDocs = documentRepository.findByUserId(user.getId());
        List<DocumentPackDto> result = new ArrayList<>();

        for (PackDefinition def : packDefinitions) {
            DocumentPackDto pack = new DocumentPackDto();
            pack.setPackId(def.packId);
            pack.setPackName(def.name);
            pack.setPurpose(def.purpose);
            pack.setTotalRequired(def.requirements.size());

            int availableCount = 0;
            List<DocumentPackItem> items = new ArrayList<>();

            for (ItemReq req : def.requirements) {
                DocumentRecord matched = findBestMatchingDocument(userDocs, req);
                boolean isAvail = matched != null;
                if (isAvail) availableCount++;

                items.add(new DocumentPackItem(
                        req.label,
                        req.category,
                        isAvail,
                        matched != null ? matched.getId() : null,
                        matched != null ? matched.getTitle() : null
                ));
            }

            pack.setTotalAvailable(availableCount);
            pack.setCompletenessPercentage(Math.round(((float) availableCount / def.requirements.size()) * 100));
            pack.setItems(items);

            result.add(pack);
        }

        return result;
    }

    private DocumentRecord findBestMatchingDocument(List<DocumentRecord> docs, ItemReq req) {
        for (DocumentRecord doc : docs) {
            String combined = (doc.getTitle() + " " + (doc.getCategory() != null ? doc.getCategory() : "") + " "
                    + (doc.getSubtype() != null ? doc.getSubtype() : "") + " "
                    + (doc.getOcrText() != null ? doc.getOcrText() : "")).toLowerCase();

            for (String kw : req.keywords) {
                if (combined.contains(kw.toLowerCase())) {
                    return doc;
                }
            }
        }
        return null;
    }
}
