package com.digivault.models;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.Date;

@Document(collection = "emergency_medical_info")
public class EmergencyMedicalInfo {

    @Id
    private String id;

    @Indexed(unique = true)
    private String userId;

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
    private Boolean organDonor = false;

    @LastModifiedDate
    private Date updatedAt = new Date();

    public EmergencyMedicalInfo() {}

    public EmergencyMedicalInfo(String userId, String bloodGroup, String allergies, String chronicConditions, String emergencyNotes) {
        this.userId = userId;
        this.bloodGroup = bloodGroup;
        this.allergies = allergies;
        this.chronicConditions = chronicConditions;
        this.emergencyNotes = emergencyNotes;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

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

    public Boolean getOrganDonor() { return organDonor != null && organDonor; }
    public void setOrganDonor(Boolean organDonor) { this.organDonor = organDonor; }
    public boolean isOrganDonor() { return organDonor != null && organDonor; }

    public Date getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Date updatedAt) { this.updatedAt = updatedAt; }
}

