package com.digivault.services;

import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Category Suggestion Service - DocuVault 2.0
 * Standardized across 8 Core Categories:
 * 1. Identity
 * 2. Education
 * 3. Medical
 * 4. Finance
 * 5. Travel
 * 6. Employment
 * 7. Property
 * 8. Other
 */
@Service
public class CategorySuggestionService {

    public static class SuggestionResult {
        private final String category;
        private final String docType;
        private final String subtype;
        private final double confidence;

        public SuggestionResult(String category, String docType, String subtype, double confidence) {
            this.category = category;
            this.docType = docType;
            this.subtype = subtype;
            this.confidence = confidence;
        }

        public String getCategory() { return category; }
        public String getDocType() { return docType; }
        public String getSubtype() { return subtype; }
        public double getConfidence() { return confidence; }
    }

    private final Map<String, List<String>> categoryKeywords = new LinkedHashMap<>();
    private final Map<String, List<String>> subtypeKeywords = new LinkedHashMap<>();

    public CategorySuggestionService() {
        initKeywords();
    }

    private void initKeywords() {
        // 1. Identity
        categoryKeywords.put("Identity", Arrays.asList(
                "aadhar", "aadhaar", "uidai", "pan card", "income tax department",
                "voter id", "epic", "election commission", "driving licence", "driving license",
                "national id", "citizenship", "identity card", "birth certificate", "ssn"
        ));

        // 2. Education
        categoryKeywords.put("Education", Arrays.asList(
                "marksheet", "degree", "diploma", "certificate", "transcript",
                "university", "board of education", "school", "college", "semester",
                "graduation", "provisional certificate", "grade sheet", "cbse", "icse",
                "curriculum", "convocation", "syllabus"
        ));

        // 3. Medical
        categoryKeywords.put("Medical", Arrays.asList(
                "prescription", "hospital", "clinic", "patient", "diagnosis",
                "doctor", "blood test", "laboratory", "lab report", "pathology",
                "radiology", "mri", "x-ray", "treatment", "discharge summary",
                "pharmacy", "vaccination", "immunization", "health checkup"
        ));

        // 4. Finance
        categoryKeywords.put("Finance", Arrays.asList(
                "bank", "statement", "account statement", "tax return", "itr", "itr-v",
                "salary", "payslip", "pay slip", "form 16", "investment",
                "mutual fund", "fixed deposit", "credit card", "debit card", "balance sheet",
                "cheque", "passbook", "loan", "mortgage", "audit report", "invoice"
        ));

        // 5. Travel
        categoryKeywords.put("Travel", Arrays.asList(
                "passport", "republic of india", "visa", "boarding pass", "flight ticket",
                "itinerary", "embassy", "consulate", "customs", "immigration",
                "travel insurance", "booking confirmation", "hotel voucher"
        ));

        // 6. Employment
        categoryKeywords.put("Employment", Arrays.asList(
                "offer letter", "appointment letter", "relieving letter", "experience certificate",
                "employment contract", "appraisal", "resignation", "nda", "employee id",
                "increment letter", "service certificate", "hr"
        ));

        // 7. Property
        categoryKeywords.put("Property", Arrays.asList(
                "sale deed", "property tax", "registry", "title deed", "land record",
                "municipal corporation", "possession letter", "allotment", "khata", "patta",
                "lease agreement", "rent agreement", "tenancy", "electricity bill", "water bill"
        ));

        // Subtypes detection
        subtypeKeywords.put("Aadhaar Card", Arrays.asList("aadhaar", "uidai", "unique identification"));
        subtypeKeywords.put("PAN Card", Arrays.asList("pan card", "permanent account number"));
        subtypeKeywords.put("Passport", Arrays.asList("passport", "republic of india"));
        subtypeKeywords.put("Driving License", Arrays.asList("driving licence", "driving license", "motor vehicles"));
        subtypeKeywords.put("Voter ID", Arrays.asList("voter", "epic", "election commission"));
        subtypeKeywords.put("Degree Certificate", Arrays.asList("degree", "convocation", "bachelor", "master", "doctorate"));
        subtypeKeywords.put("Marksheet / Transcript", Arrays.asList("marksheet", "grade card", "statement of marks", "transcript"));
        subtypeKeywords.put("Medical Prescription", Arrays.asList("prescription", "rx", "dosage"));
        subtypeKeywords.put("Discharge Summary", Arrays.asList("discharge summary", "inpatient", "admission"));
        subtypeKeywords.put("Lab Test Report", Arrays.asList("lab report", "test report", "pathology", "blood test"));
        subtypeKeywords.put("Bank Statement", Arrays.asList("account statement", "bank statement", "transaction history"));
        subtypeKeywords.put("Salary Slip / Form 16", Arrays.asList("payslip", "pay slip", "form 16", "salary slip"));
        subtypeKeywords.put("Travel Visa", Arrays.asList("visa", "valid for stay", "consular"));
        subtypeKeywords.put("Offer / Relieving Letter", Arrays.asList("offer letter", "relieving letter", "appointment letter"));
        subtypeKeywords.put("Rental / Lease Agreement", Arrays.asList("lease agreement", "rent agreement", "tenancy agreement"));
        subtypeKeywords.put("Property Deed / Tax", Arrays.asList("sale deed", "property tax", "title deed", "possession letter"));
    }

    public SuggestionResult suggestCategory(String text, String filename) {
        String combined = ((filename != null ? filename : "") + " " + (text != null ? text : "")).toLowerCase();

        Map<String, Integer> categoryScores = new HashMap<>();
        for (Map.Entry<String, List<String>> entry : categoryKeywords.entrySet()) {
            int score = 0;
            for (String kw : entry.getValue()) {
                if (combined.contains(kw)) {
                    score += kw.length() > 6 ? 2 : 1;
                }
            }
            if (score > 0) {
                categoryScores.put(entry.getKey(), score);
            }
        }

        String bestCategory = "Other";
        int maxScore = 0;
        for (Map.Entry<String, Integer> entry : categoryScores.entrySet()) {
            if (entry.getValue() > maxScore) {
                maxScore = entry.getValue();
                bestCategory = entry.getKey();
            }
        }

        // Detect Subtype
        String bestSubtype = bestCategory + " Document";
        for (Map.Entry<String, List<String>> entry : subtypeKeywords.entrySet()) {
            for (String kw : entry.getValue()) {
                if (combined.contains(kw)) {
                    bestSubtype = entry.getKey();
                    break;
                }
            }
        }

        double confidence = maxScore == 0 ? 0.35 : Math.min(0.96, 0.55 + (maxScore * 0.08));
        return new SuggestionResult(bestCategory, bestSubtype, bestSubtype, confidence);
    }
}
