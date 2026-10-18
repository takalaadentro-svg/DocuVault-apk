package com.digivault.models;

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

    private String bloodGroup;
    private String allergies;
    private String chronicConditions;
    private String emergencyNotes;

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

    public String getEmergencyNotes() { return emergencyNotes; }
    public void setEmergencyNotes(String emergencyNotes) { this.emergencyNotes = emergencyNotes; }

    public Date getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Date updatedAt) { this.updatedAt = updatedAt; }
}
