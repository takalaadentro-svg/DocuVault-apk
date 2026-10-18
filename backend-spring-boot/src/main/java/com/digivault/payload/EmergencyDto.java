package com.digivault.payload;

import java.util.List;

public class EmergencyDto {

    public static class ContactRequest {
        private String name;
        private String relationship;
        private String phone;
        private String email;
        private boolean canAccessEmergencyDocs = true;

        public ContactRequest() {}

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public String getRelationship() { return relationship; }
        public void setRelationship(String relationship) { this.relationship = relationship; }

        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public boolean isCanAccessEmergencyDocs() { return canAccessEmergencyDocs; }
        public void setCanAccessEmergencyDocs(boolean canAccessEmergencyDocs) { this.canAccessEmergencyDocs = canAccessEmergencyDocs; }
    }

    public static class MedicalInfoRequest {
        private String bloodGroup;
        private String allergies;
        private String chronicConditions;
        private String emergencyNotes;

        public MedicalInfoRequest() {}

        public String getBloodGroup() { return bloodGroup; }
        public void setBloodGroup(String bloodGroup) { this.bloodGroup = bloodGroup; }

        public String getAllergies() { return allergies; }
        public void setAllergies(String allergies) { this.allergies = allergies; }

        public String getChronicConditions() { return chronicConditions; }
        public void setChronicConditions(String chronicConditions) { this.chronicConditions = chronicConditions; }

        public String getEmergencyNotes() { return emergencyNotes; }
        public void setEmergencyNotes(String emergencyNotes) { this.emergencyNotes = emergencyNotes; }
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
