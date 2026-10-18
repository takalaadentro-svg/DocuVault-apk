# DigiVault — Spring Boot + MongoDB Atlas Backend

## Academic & Architectural Specification Matrix

This backend implements the official **Academic & Architectural Technology Matrix** for the DigiVault Major Project:

| Module / Feature | Technology / Framework | Language / Runtime | Specification Implementation |
| :--- | :--- | :--- | :--- |
| **Mobile Client** | React Native (Web/Mobile) | TypeScript / JSX | Modern glassmorphic mobile client with emergency break-glass |
| **Backend Core** | Spring Boot 2.7.x | Java 8 / 11 / 17 / 21 | RESTful microservices architecture with Spring Web |
| **Database** | MongoDB Atlas / Local | MQL (Mongo Query Language) | Document-oriented storage with `@TextIndexed` search |
| **Authentication** | Spring Security + JWT | Java | Stateless HMAC-SHA256 tokens (`io.jsonwebtoken`) |
| **Password & PIN Security** | BCrypt | Java | `BCryptPasswordEncoder` with salted hash rounds |
| **OCR Text Extraction** | EasyOCR + PyPDF | Python REST Microservice | `POST /extract-ocr` HTTP microservice (`ocr-service-python`) |
| **Document Storage** | Firebase Storage / Local | Cloud & Encrypted Disk | UUID partition store with Firebase bucket connector |
| **Alerts & Reminders** | Spring Mail & FCM | Java | `JavaMailSender` and Firebase Push notification adapter |
| **Text Search** | MongoDB Text Search | Java / MQL | MongoDB full-text index across title, issuer, notes, and OCR text |
| **Document DNA** | SHA-256 Hashing | Java (`MessageDigest`) | Cryptographic file fingerprinting and tamper detection |
| **Category Suggestion** | Rule-Based Keyword Engine | Java | Multi-pattern regex matching across 9 document categories |
| **Quick PIN Fallback** | Spring Boot + MongoDB | Java | Salted PIN verification with biometric fallback for emergency |
| **Scheduler** | Spring Scheduler | Java (`@Scheduled`) | Daily automated cron scanner for 30d/7d/1d expiry reminders |

---

## Directory Structure

```
backend-spring-boot/
├── pom.xml                                   # Maven dependency manifest
├── mvnw.cmd / mvnw                           # Cross-platform Maven Wrappers
├── Dockerfile                                # Multi-stage Docker container build
├── src/
│   ├── main/
│   │   ├── java/com/digivault/
│   │   │   ├── DigiVaultApplication.java     # Spring Boot application entrypoint
│   │   │   ├── config/                       # Spring Security, JWT, CORS configuration
│   │   │   │   ├── SecurityConfig.java
│   │   │   │   ├── JwtTokenProvider.java
│   │   │   │   └── JwtAuthenticationFilter.java
│   │   │   ├── controllers/                  # REST API controllers
│   │   │   │   ├── AuthController.java
│   │   │   │   ├── DocumentController.java
│   │   │   │   ├── EmergencyController.java
│   │   │   │   ├── FamilyController.java
│   │   │   │   ├── ShareController.java
│   │   │   │   ├── NotificationController.java
│   │   │   │   └── HealthController.java
│   │   │   ├── models/                       # MongoDB `@Document` entity models
│   │   │   │   ├── User.java
│   │   │   │   ├── DocumentRecord.java
│   │   │   │   ├── DocumentPermission.java
│   │   │   │   ├── FamilyGroup.java
│   │   │   │   ├── FamilyMember.java
│   │   │   │   ├── FamilyInvitation.java
│   │   │   │   ├── EmergencyContact.java
│   │   │   │   ├── EmergencyMedicalInfo.java
│   │   │   │   ├── ShareToken.java
│   │   │   │   ├── Notification.java
│   │   │   │   └── AuditLog.java
│   │   │   ├── payload/                      # Request & Response DTOs
│   │   │   │   ├── AuthDto.java
│   │   │   │   ├── DocumentDto.java
│   │   │   │   ├── FamilyDto.java
│   │   │   │   ├── EmergencyDto.java
│   │   │   │   ├── ShareDto.java
│   │   │   │   └── ApiResponse.java
│   │   │   ├── repositories/                 # Spring Data MongoDB Repositories
│   │   │   │   ├── UserRepository.java
│   │   │   │   ├── DocumentRepository.java
│   │   │   │   ├── DocumentPermissionRepository.java
│   │   │   │   ├── FamilyGroupRepository.java
│   │   │   │   ├── FamilyMemberRepository.java
│   │   │   │   ├── FamilyInvitationRepository.java
│   │   │   │   ├── EmergencyContactRepository.java
│   │   │   │   ├── EmergencyMedicalInfoRepository.java
│   │   │   │   ├── ShareTokenRepository.java
│   │   │   │   ├── NotificationRepository.java
│   │   │   │   └── AuditLogRepository.java
│   │   │   └── services/                     # Business logic & algorithms
│   │   │       ├── DocumentDnaService.java       # Cryptographic SHA-256 DNA
│   │   │       ├── CategorySuggestionService.java# Rule-based categorization
│   │   │       ├── OcrIntegrationService.java    # EasyOCR REST client
│   │   │       ├── StorageService.java           # Local / Firebase Storage
│   │   │       ├── ExpiryReminderScheduler.java  # Daily cron expiry alerts
│   │   │       ├── AuthService.java
│   │   │       ├── DocumentService.java
│   │   │       ├── FamilyService.java
│   │   │       ├── EmergencyService.java
│   │   │       ├── ShareService.java
│   │   │       └── NotificationService.java
│   │   └── resources/
│   │       └── application.yml               # MongoDB Atlas, JWT, and Mail configs
└── ocr-service-python/                       # EasyOCR microservice
    ├── app.py
    ├── requirements.txt
    └── Dockerfile
```

---

## How to Run

### Method 1: Using Docker Compose (Recommended)
From the project root:
```bash
docker compose up --build
```
This automatically boots:
- `mongodb` (MongoDB 7.0 on port 27017)
- `ocr-service` (EasyOCR microservice on port 5001)
- `backend-spring-boot` (Spring Boot Java on port 8080)
- `frontend` (React Native Web client on port 5173)

### Method 2: Local Java Execution
1. Ensure MongoDB is running locally or specify your MongoDB Atlas connection string in `src/main/resources/application.yml` or as an environment variable:
   ```bash
   export SPRING_DATA_MONGODB_URI="mongodb+srv://<user>:<password>@cluster0.mongodb.net/digivault_db?retryWrites=true&w=majority"
   ```
2. Run the EasyOCR microservice (optional, fallback text extractor will run if absent):
   ```bash
   cd ocr-service-python
   pip install -r requirements.txt
   python app.py
   ```
3. Run Spring Boot via the Maven Wrapper:
   ```bash
   # Windows
   mvnw.cmd spring-boot:run

   # macOS / Linux
   ./mvnw spring-boot:run
   ```

---

## Verification & Health Check
Verify the operational status and architecture matrix at:
```http
GET http://localhost:8080/api/v1/health
```
Example Response:
```json
{
  "success": true,
  "message": "DigiVault Spring Boot Backend is operational",
  "data": {
    "service": "digivault-backend",
    "status": "UP",
    "language": "Java",
    "framework": "Spring Boot 2.7.18",
    "database": "MongoDB Atlas",
    "security": "Spring Security + JJWT + BCrypt",
    "documentDna": "SHA-256 Hashing",
    "ocrEngine": "Python EasyOCR Microservice + REST"
  }
}
```
