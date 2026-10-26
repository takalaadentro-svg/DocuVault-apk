package com.digivault.payload;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class EmergencyDto {

    public static class ContactRequest {
        @JsonProperty("name")
        private String name;

        @JsonProperty("relationship")
        @JsonAlias({"relationship_type", "relationshipType"})
        private String relationship;

        @JsonProperty("phone")
        @JsonAlias({"phone_number", "phoneNumber", "mobile"})
        private String phone;

        @JsonProperty("email")
        private String email;

        @JsonProperty("can_access_emergency_docs")
        @JsonAlias({"canAccessEmergencyDocs", "can_access_medical"})
        private boolean canAccessEmergencyDocs = true;

        public ContactRequest() {}

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getRelationship() { return relationship; }
        public void setRelationship(String relationship) { this.relationship = relationship; }
        public void setRelationshipType(String relationshipType) { this.relationship = relationshipType; }
        public String getRelationshipType() { return relationship; }

        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }
        public void setPhoneNumber(String phoneNumber) { this.phone = phoneNumber; }
        public String getPhoneNumber() { return phone; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public boolean isCanAccessEmergencyDocs() { return canAccessEmergencyDocs; }
        public void setCanAccessEmergencyDocs(boolean canAccessEmergencyDocs) { this.canAccessEmergencyDocs = canAccessEmergencyDocs; }
    }

    public static class MedicalInfoRequest {
        @JsonProperty("blood_group")
        @JsonAlias({"bloodGroup"})
        private String bloodGroup;

        @JsonProperty("allergies")
        private String allergies;

        @JsonProperty("chronic_conditions")
        @JsonAlias({"chronicConditions"})
        private String chronicConditions;

        @JsonProperty("current_medications")
        @JsonAlias({"currentMedications", "medications"})
        private String currentMedications;

        @JsonProperty("emergency_notes")
        @JsonAlias({"emergencyNotes", "notes"})
        private String emergencyNotes;

        @JsonProperty("physician_name")
        @JsonAlias({"physicianName", "doctorName"})
        private String physicianName;

        @JsonProperty("physician_phone")
        @JsonAlias({"physicianPhone", "doctorPhone"})
        private String physicianPhone;

        @JsonProperty("organ_donor")
        @JsonAlias({"organDonor"})
        private Boolean organDonor;

        public MedicalInfoRequest() {}

        public String getBloodGroup() { return bloodGroup; }
        public void setBloodGroup(String bloodGroup) { this.bloodGroup = bloodGroup; }

        public String getAllergies() { return allergies; }
        public void setAllergies(String allergies) { this.allergies = allergies; }

        public String getChronicConditions() { return chronicConditions; }
        public void setChronicConditions(String chronicConditions) { this.chronicConditions = chronicConditions; }

        public String getCurrentMedications() { return currentMedications; }
        public void setCurrentMedications(String currentMedications) { this.currentMedications = currentMedications; }

        public String getEmergencyNotes() { return emergencyNotes; }
        public void setEmergencyNotes(String emergencyNotes) { this.emergencyNotes = emergencyNotes; }

        public String getPhysicianName() { return physicianName; }
        public void setPhysicianName(String physicianName) { this.physicianName = physicianName; }

        public String getPhysicianPhone() { return physicianPhone; }
        public void setPhysicianPhone(String physicianPhone) { this.physicianPhone = physicianPhone; }

        public Boolean getOrganDonor() { return organDonor; }
        public void setOrganDonor(Boolean organDonor) { this.organDonor = organDonor; }
    }

    public static class BreakGlassResponse {
        private boolean accessGranted;
        private String message;
        private Object medicalInfo;
        private List<?> emergencyDocuments;
        private List<?> emergencyContacts;

        public BreakGlassResponse() {}

        public BreakGlassResponse(boolean accessGranted, String message, Object medicalInfo, List<?> emergencyDocuments, List<?> emergencyContacts) {
            this.accessGranted = accessGranted;
            this.message = message;
            this.medicalInfo = medicalInfo;
            this.emergencyDocuments = emergencyDocuments;
            this.emergencyContacts = emergencyContacts;
        }

        public boolean isAccessGranted() { return accessGranted; }
        public void setAccessGranted(boolean accessGranted) { this.accessGranted = accessGranted; }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }

        public Object getMedicalInfo() { return medicalInfo; }
        public void setMedicalInfo(Object medicalInfo) { this.medicalInfo = medicalInfo; }

        public List<?> getEmergencyDocuments() { return emergencyDocuments; }
        public void setEmergencyDocuments(List<?> emergencyDocuments) { this.emergencyDocuments = emergencyDocuments; }

        public List<?> getEmergencyContacts() { return emergencyContacts; }
        public void setEmergencyContacts(List<?> emergencyContacts) { this.emergencyContacts = emergencyContacts; }
    }
}
