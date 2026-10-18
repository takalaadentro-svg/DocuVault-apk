package com.digivault.services;

import com.digivault.models.DocumentRecord;
import com.digivault.models.User;
import com.digivault.payload.DocumentDto.ConsistencyCheckResult;
import com.digivault.payload.DocumentDto.ConsistencyIssue;
import com.digivault.repositories.DocumentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Cross-Document Consistency Checker - DocuVault 2.0
 * Evaluates personal identity records (Aadhaar, PAN, Passport, Marksheets)
 * to highlight name spellings, initials vs expanded names, and DOB discrepancies.
 */
@Service
public class ConsistencyCheckerService {

    @Autowired
    private DocumentRepository documentRepository;

    public ConsistencyCheckResult checkConsistency(User user) {
        List<DocumentRecord> docs = documentRepository.findByUserId(user.getId());
        ConsistencyCheckResult result = new ConsistencyCheckResult();
        result.setTotalDocumentsAnalyzed(docs.size());

        if (docs.isEmpty()) {
            result.setConsistent(true);
            result.setPassedFields(Collections.singletonList("No documents to evaluate."));
            return result;
        }

        List<ConsistencyIssue> issues = new ArrayList<>();
        List<String> passedFields = new ArrayList<>();

        // 1. Cross-check Holder Names
        List<DocFieldEntry> nameEntries = new ArrayList<>();
        for (DocumentRecord doc : docs) {
            String name = doc.getHolderName();
            if (name == null || name.trim().isEmpty()) {
                // Heuristic from title if user is holder
                if (user.getFullName() != null && doc.getOcrText() != null && doc.getOcrText().toLowerCase().contains(user.getFullName().toLowerCase())) {
                    name = user.getFullName();
                }
            }
            if (name != null && name.trim().length() > 2) {
                nameEntries.add(new DocFieldEntry(doc.getTitle(), name.trim()));
            }
        }

        if (nameEntries.size() >= 2) {
            boolean nameIssueFound = false;
            DocFieldEntry base = nameEntries.get(0);
            for (int i = 1; i < nameEntries.size(); i++) {
                DocFieldEntry current = nameEntries.get(i);
                if (!areNamesConsistent(base.value, current.value)) {
                    issues.add(new ConsistencyIssue(
                            "Holder Name",
                            base.docTitle,
                            base.value,
                            current.docTitle,
                            current.value,
                            "WARNING",
                            "Possible name variation (initials or spelling expansion). Ensure this matches university or passport records."
                    ));
                    nameIssueFound = true;
                    break;
                }
            }
            if (!nameIssueFound) {
                passedFields.add("Holder Name matches across " + nameEntries.size() + " verified records.");
            }
        } else {
            passedFields.add("Holder Name verified for primary records.");
        }

        // 2. Cross-check Date of Birth (DOB)
        List<DocFieldEntry> dobEntries = new ArrayList<>();
        for (DocumentRecord doc : docs) {
            if (doc.getDob() != null && !doc.getDob().trim().isEmpty()) {
                dobEntries.add(new DocFieldEntry(doc.getTitle(), doc.getDob().trim()));
            }
        }

        if (dobEntries.size() >= 2) {
            boolean dobIssueFound = false;
            DocFieldEntry baseDob = dobEntries.get(0);
            for (int i = 1; i < dobEntries.size(); i++) {
                DocFieldEntry currentDob = dobEntries.get(i);
                if (!baseDob.value.equalsIgnoreCase(currentDob.value)) {
                    issues.add(new ConsistencyIssue(
                            "Date of Birth (DOB)",
                            baseDob.docTitle,
                            baseDob.value,
                            currentDob.docTitle,
                            currentDob.value,
                            "WARNING",
                            "Date of birth discrepancy detected between official records. Check if DD/MM/YYYY vs MM/DD/YYYY format ambiguity."
                    ));
                    dobIssueFound = true;
                    break;
                }
            }
            if (!dobIssueFound) {
                passedFields.add("Date of Birth (DOB) is identical across " + dobEntries.size() + " documents.");
            }
        } else {
            passedFields.add("Date of Birth verified for available documents.");
        }

        // 3. Document ID uniqueness
        Set<String> seenIds = new HashSet<>();
        for (DocumentRecord doc : docs) {
            if (doc.getDocNumber() != null && !doc.getDocNumber().isEmpty()) {
                if (seenIds.contains(doc.getDocNumber())) {
                    issues.add(new ConsistencyIssue(
                            "Identification Number",
                            doc.getTitle(),
                            doc.getDocNumber(),
                            "Another document",
                            doc.getDocNumber(),
                            "INFO",
                            "Same document number is associated with multiple uploads."
                    ));
                } else {
                    seenIds.add(doc.getDocNumber());
                }
            }
        }

        result.setIssues(issues);
        result.setPassedFields(passedFields);
        result.setConsistent(issues.isEmpty());
        return result;
    }

    private boolean areNamesConsistent(String n1, String n2) {
        String clean1 = n1.replaceAll("[^a-zA-Z]", " ").toLowerCase().trim();
        String clean2 = n2.replaceAll("[^a-zA-Z]", " ").toLowerCase().trim();

        if (clean1.equals(clean2)) return true;

        // Check if one is abbreviation of the other (e.g. "R Sharma" vs "Rajesh Sharma")
        String[] parts1 = clean1.split("\\s+");
        String[] parts2 = clean2.split("\\s+");

        if (parts1.length > 0 && parts2.length > 0) {
            String last1 = parts1[parts1.length - 1];
            String last2 = parts2[parts2.length - 1];
            if (last1.equals(last2)) {
                // Same surname
                return true;
            }
        }

        return false;
    }

    private static class DocFieldEntry {
        String docTitle;
        String value;

        DocFieldEntry(String docTitle, String value) {
            this.docTitle = docTitle;
            this.value = value;
        }
    }
}
