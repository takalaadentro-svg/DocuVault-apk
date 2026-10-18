package com.digivault.payload;

import javax.validation.constraints.Email;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

public class AuthDto {

    public static class LoginRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Email should be valid")
        private String email;

        @NotBlank(message = "Password is required")
        private String password;

        public LoginRequest() {}

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }
    }

    public static class RegisterRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Email should be valid")
        private String email;

        @NotBlank(message = "Full name is required")
        private String fullName;

        @NotBlank(message = "Password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        private String password;

        private String phone;
        private String otp;

        public String getOtp() { return otp; }
        public void setOtp(String otp) { this.otp = otp; }

        public RegisterRequest() {}

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }

        public String getPassword() { return password; }
        public void setPassword(String password) { this.password = password; }

        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }
    }

    public static class QuickPinRequest {
        @NotBlank(message = "PIN is required")
        @Size(min = 4, max = 6, message = "PIN must be between 4 and 6 digits")
        private String pin;

        public QuickPinRequest() {}

        public String getPin() { return pin; }
        public void setPin(String pin) { this.pin = pin; }
    }

    public static class BiometricToggleRequest {
        private boolean enabled;

        public BiometricToggleRequest() {}

        public boolean isEnabled() { return enabled; }
        public void setEnabled(boolean enabled) { this.enabled = enabled; }
    }

    public static class UserSummary {
        private String id;
        private String email;
        private String fullName;
        private String phone;
        private String otp;

        public String getOtp() { return otp; }
        public void setOtp(String otp) { this.otp = otp; }
        private boolean biometricEnabled;
        private boolean hasQuickPin;
        private boolean isActive = true;
        private boolean emailVerified = false;

        public boolean isEmailVerified() { return emailVerified; }
        public void setEmailVerified(boolean emailVerified) { this.emailVerified = emailVerified; }

        public UserSummary() {}

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getFullName() { return fullName; }
        public void setFullName(String fullName) { this.fullName = fullName; }

        public String getPhone() { return phone; }
        public void setPhone(String phone) { this.phone = phone; }

        public String getPhoneNumber() { return phone; }
        public void setPhoneNumber(String phoneNumber) { this.phone = phoneNumber; }

        public boolean isBiometricEnabled() { return biometricEnabled; }
        public void setBiometricEnabled(boolean biometricEnabled) { this.biometricEnabled = biometricEnabled; }

        public boolean isHasQuickPin() { return hasQuickPin; }
        public void setHasQuickPin(boolean hasQuickPin) { this.hasQuickPin = hasQuickPin; }

        public boolean isIsActive() { return isActive; }
        public void setIsActive(boolean active) { isActive = active; }
    }

    public static class TokenResponse {
        private String accessToken;
        private String refreshToken;
        private String tokenType = "Bearer";
        private UserSummary user;

        public TokenResponse() {}

        public TokenResponse(String accessToken, String refreshToken, UserSummary user) {
            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
            this.user = user;
        }

        public String getAccessToken() { return accessToken; }
        public void setAccessToken(String accessToken) { this.accessToken = accessToken; }

        public String getRefreshToken() { return refreshToken; }
        public void setRefreshToken(String refreshToken) { this.refreshToken = refreshToken; }

        public String getTokenType() { return tokenType; }
        public void setTokenType(String tokenType) { this.tokenType = tokenType; }

        public UserSummary getUser() { return user; }
        public void setUser(UserSummary user) { this.user = user; }
    }

    public static class SendOtpRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Email should be valid")
        private String email;

        private String purpose = "REGISTRATION";

        public SendOtpRequest() {}

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getPurpose() { return purpose; }
        public void setPurpose(String purpose) { this.purpose = purpose; }
    }

    public static class VerifyOtpRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Email should be valid")
        private String email;

        @NotBlank(message = "OTP code is required")
        private String otp;

        private String purpose = "REGISTRATION";

        public VerifyOtpRequest() {}

        public String getEmail() { return email; }
        public void setEmail(String email) { this.email = email; }

        public String getOtp() { return otp; }
        public void setOtp(String otp) { this.otp = otp; }

        public String getPurpose() { return purpose; }
        public void setPurpose(String purpose) { this.purpose = purpose; }
    }

}
