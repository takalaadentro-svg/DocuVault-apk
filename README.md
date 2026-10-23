# DocuVault 2.0 — Smart Digital Document Locker & Family Emergency Vault

<p align="center">
  <img src="https://img.shields.io/badge/Security-Spring%20Security%20%7C%20JWT%20%7C%20BCrypt%20%7C%20Biometrics-0D9488?style=for-the-badge&logo=springsecurity" alt="Spring Security" />
  <img src="https://img.shields.io/badge/Backend-Spring%20Boot%202.7.x%20%7C%20Java-6DB33F?style=for-the-badge&logo=springboot" alt="Spring Boot" />
  <img src="https://img.shields.io/badge/Database-MongoDB%20Atlas%20%7C%20Vector%20Search-47A248?style=for-the-badge&logo=mongodb" alt="MongoDB Atlas" />
  <img src="https://img.shields.io/badge/OCR-EasyOCR%20%7C%20Python%20%7C%20PyPDF-3776AB?style=for-the-badge&logo=python" alt="EasyOCR" />
  <img src="https://img.shields.io/badge/Mobile-React%20Native%20%7C%20Capacitor%20%7C%20TypeScript-3B82F6?style=for-the-badge&logo=react" alt="React Native" />
  <img src="https://img.shields.io/badge/Deployment-Render%20%7C%20Firebase%20%7C%20Docker-46E3B7?style=for-the-badge&logo=render" alt="Render" />
</p>

**DocuVault 2.0** is an enterprise-grade, mobile-compatible digital document locker and emergency vault system engineered as a major final-year academic project. DocuVault empowers individuals and families to scan, extract, intelligently categorize, search, verify, chat with, bundle, and share sensitive documents with cryptographic DNA verification, biometric-first emergency unlock, automated renewal reminders, and cross-device synchronization.

---

## 🌟 DocuVault 2.0 — Functional Feature Implementations

### A. Core Document Intelligence
1. **Smart Document Scanning & Preprocessing**:
   - Camera scan & PDF multi-page import.
   - Real-time Laplacian variance blur detection (`variance_of_laplacian < 85.0`) prompting retake for unclear images.
   - Batch scanning and automated image quality optimization.
2. **EasyOCR & Structured Information Extraction**:
   - Python EasyOCR REST service + PyPDF vector extraction.
   - Automated regex extraction for Document Titles, Holder Names, Document Numbers (Aadhaar, PAN, Passport, DL), DOB, Issue & Expiry Dates.
   - Confidence scoring (`ocrConfidence`), field-level correction feedback (`/feedback`), and processing status tracking (`PENDING`, `PROCESSING`, `SUCCEEDED`, `FAILED`).
   - Duplicate OCR job prevention via idempotent file hashing.
3. **8 Core Document Categories**:
   - Strict standard categorization: **Identity**, **Education**, **Medical**, **Finance**, **Travel**, **Employment**, **Property**, and **Other**.
   - Subtype inference with confidence score; manual category reclassification.
4. **Keyword & Semantic Search**:
   - Combined keyword and semantic vector search across titles, categories, metadata, and extracted OCR text.
   - Handles natural-language queries (e.g., *"Find the certificate I received after graduation"*).
5. **Chat with Documents (Local RAG)**:
   - Retrieval-Augmented Generation answering questions over user's private documents.
   - Provides verifiable source citations with exact snippet passages.
   - Transparently flags missing or uncertain details instead of hallucinating.
6. **Voice-Based Search**:
   - Microphone voice recognition powered by Web Speech API / native voice module with typed search fallback.

### B. Expiry, Notifications & Family Management
7. **Expiry Alerts & Renewal Planner**:
   - Multi-tier milestone scheduler: **180, 90, 60, 30, 14, 7, and 1 day** before expiration.
   - Interactive renewal preparation checklists, upcoming-expiry cards, and cancellation recalculations.
8. **Multi-Channel Notifications**:
   - Independent preferences for **In-App**, **Push Notifications (FCM)**, **Transactional Email**, and **SMS / WhatsApp**.
   - Delivery status tracking (`QUEUED`, `SENT`, `DELIVERED`, `FAILED`).
9. **Family Vault & Invitation Lifecycle**:
   - Invites family members by email or phone with expiring secure tokens.
   - Status tracking (`PENDING`, `ACCEPTED`, `REJECTED`, `EXPIRED`, `REVOKED`).
   - Granular document permissions (`VIEW`, `DOWNLOAD`, `EDIT`, `SHARE`).
   - **Family Vault Completeness Tracker** (Aadhaar, Passport, Insurance, Degree checklist).

### C. Security & Protected Document Access
10. **Secure QR-Code & Time-Limited Sharing**:
    - High-entropy, revocable sharing links with configurable expiration (1 hr, 24 hr, 7 days) and view caps.
    - Zero-knowledge QR codes pointing to secure recipient endpoints without embedding raw sensitive document data.
11. **Biometric-First Emergency Vault Unlock**:
    - **Biometric-first access**: Device fingerprint or face authentication directly unlocks the vault immediately without requiring secondary PIN.
    - **Quick PIN fallback**: 4-digit PIN fallback with 5-attempt retry limit, cooldown lockout timer, and safe recovery.
    - Cryptographic AES-256 storage and Spring Security JWT authorization.
12. **Cryptographic Duplicate Detection**:
    - SHA-256 cryptographic exact match + normalized Jaccard text similarity analysis.
    - Alerts users before uploading duplicate copies without deleting automatically.
13. **OCR Quality Checks & Structured Feedback**:
    - Highlights uncertain extracted fields and saves user corrections to `ocr_feedback` collection.
14. **Document Version History & Rollback**:
    - Immutable version logging on edits/replacements.
    - One-click rollback restoring prior document files and metadata.
15. **Audit Trail**:
    - Immutable security audit records capturing upload, view, download, share, and emergency break-glass access events.

### D. Productivity & Advanced Intelligence
16. **Smart Form Autofill**:
    - Pre-populates common application forms (Full Name, DOB, Aadhaar, PAN, Passport, Phone, Email) from verified documents with one-click copy.
17. **Smart Document Pack Generator**:
    - 5 purpose-based document packs:
      - 🎓 *College Admissions Pack* (10th/12th Marks, Degree, Identity, Photo)
      - 💼 *Job Onboarding Pack* (Resume, Identity, PAN, Degree, Relieving Letter)
      - ✈️ *International Travel Pack* (Passport, Visa, Travel Insurance, Vaccination)
      - 🏥 *Medical Visit Pack* (Health Card, Insurance Policy, Prescriptions, Medical Summary)
      - 🛡️ *Insurance Claim Pack* (Policy, Medical Bill, Identity, Discharge Summary)
    - Pack completeness scores and missing-document warnings.
18. **Cross-Document Consistency Checker**:
    - Reconciles Holder Names, DOB, and IDs across multiple documents to flag typos, abbreviations, or OCR discrepancies before official submissions.
19. **Multilingual Document Support**:
    - EasyOCR English + regional language OCR extraction.
20. **Phone-to-Phone Direct Vault Transfer**:
    - Offline / direct pairing using short-lived 6-digit codes (`DV-XXXXXX`) and QR codes to migrate documents between phones.
21. **Secure Encrypted Offline Storage**:
    - Offline availability toggle storing encrypted cached copies on device with biometric protection.

---

## 🛠️ Project Technology Matrix (Academic & Architectural Specification)

| Module / Feature | Technology / Framework | Language / Engine |
| :--- | :--- | :--- |
| **Mobile Application** | React Native (Vite / Capacitor 8) | TypeScript / JSX |
| **User Interface** | Mobile-First UI, Responsive Design System | CSS / Tailwind-free Vanilla CSS |
| **Backend Core** | Spring Boot 2.7.x | Java 11 / 17 |
| **Database** | MongoDB Atlas / Local MongoDB 7.0 | MQL / Spring Data Mongo |
| **Authentication** | Spring Security + JWT (HMAC-SHA256) | Java |
| **Biometric & PIN** | WebAuthn / Native Biometrics + BCrypt PIN | Java + TypeScript |
| **OCR Service** | EasyOCR + PyPDF2 / pypdf | Python 3.10+ / FastAPI / Uvicorn |
| **Blur Detection** | OpenCV Laplacian Variance | Python |
| **Cloud Storage** | Firebase Storage / Encrypted Local Storage | Java / Cloud |
| **Push Notifications** | Firebase Cloud Messaging (FCM) | Cloud / REST |
| **Email Deliverability** | Spring Mail (SMTP / Transactional) | Java |
| **Voice Search** | Web Speech API / Native Speech-to-Text | TypeScript |
| **Vector & Text Search** | In-Memory Cosine Similarity / MongoDB Text | Java |
| **Document DNA** | Cryptographic SHA-256 Hashing | Java |
| **Document Packs & Checker**| Purpose Pack Engine & Cross-Doc Consistency | Java |
| **Deployment Target** | Render (Docker / Static Web) + MongoDB Atlas | Docker / Cloud |

---

## 🚀 Step-by-Step Running Guide

### 1. Start the EasyOCR Microservice (Python)
```bash
cd backend-spring-boot/ocr-service-python
pip install -r requirements.txt
python -m uvicorn app:app --host 0.0.0.0 --port 5001
```
Service health endpoint: `http://localhost:5001/health`

### 2. Start the Spring Boot Backend (Java)
```bash
cd backend-spring-boot
# Run using the included cross-platform Maven wrapper:
mvnw.cmd spring-boot:run   # Windows
./mvnw spring-boot:run      # Linux / macOS
```
Backend runs on **`http://localhost:8080`**.  
Health check: `http://localhost:8080/api/v1/health`

### 3. Start the React Native / Mobile Frontend
```bash
cd mobile
npm install
npm run dev
```
Open **`http://localhost:5173`** in your mobile browser or desktop browser in responsive mobile frame view.

---

## 🌐 Cloud Integration Guides

### 1. MongoDB Atlas Integration
1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and create a free **M0 Sandbox Cluster**.
2. Under **Database Access**, create a database user (e.g., `docuvault_admin`).
3. Under **Network Access**, add IP `0.0.0.0/0` (allow access from anywhere) to allow Render and mobile requests.
4. Click **Connect** → **Drivers** → Java, and copy your connection string:
   ```
   mongodb+srv://docuvault_admin:<password>@cluster0.abcde.mongodb.net/docuvault_db?retryWrites=true&w=majority
   ```
5. Supply this URI in `backend-spring-boot/src/main/resources/application.properties` or set the environment variable:
   ```bash
   SPRING_DATA_MONGODB_URI="mongodb+srv://docuvault_admin:<password>@cluster0.abcde.mongodb.net/docuvault_db?retryWrites=true&w=majority"
   ```

### 2. Render Deployment (1-Click Blueprint)
The repository contains [`render.yaml`](file:///d:/Applications/Projects/Vishanth_frirend/Digi-App/render.yaml) which defines the 3 connected services:
- **`docuvault-spring-backend`**: Dockerized Spring Boot web service.
- **`docuvault-ocr-service`**: Dockerized Python EasyOCR web service.
- **`docuvault-frontend`**: Static Vite web service.

To deploy on Render:
1. Push this project to your GitHub repository.
2. In [Render Dashboard](https://dashboard.render.com), click **New +** → **Blueprint**.
3. Select your repository. Render will automatically read `render.yaml` and provision all 3 services.
4. Set the `SPRING_DATA_MONGODB_URI` environment variable in the backend service to your MongoDB Atlas connection string.

### 3. Firebase Storage & Cloud Messaging Setup
1. Create a project in [Firebase Console](https://console.firebase.google.com).
2. Go to **Build** → **Storage** → Create Bucket.
3. Under Storage Rules:
   ```javascript
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /{allPaths=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```
4. Set `STORAGE_TYPE=firebase` and configure `FIREBASE_STORAGE_BUCKET=your-app.appspot.com` in your backend environment variables.
5. In **Project Settings** → **Service Accounts**, generate a private key JSON for backend admin uploads and FCM push messaging.

---

## 📱 Building & Installing the Android APK (`DocuVault.apk`)

DocuVault includes a pre-configured native Android Capacitor project in [`mobile/android`](file:///d:/Applications/Projects/Vishanth_frirend/Digi-App/mobile/android):

### Method A: Automated Cloud Build via GitHub Actions (No Android Studio required!)
1. Push your repository to GitHub.
2. Go to the **Actions** tab on GitHub and view the **Build Android APK** workflow.
3. When the build finishes, download `DocuVault-v1.0.0.apk` from the **Artifacts** section directly to your phone.

### Method B: Local Build via Android Studio or Terminal
```bash
cd mobile

# 1. Build the mobile web assets
npm run build

# 2. Sync web assets with native Android wrapper
npx cap sync android

# 3. Build the debug APK directly using Gradle
cd android
./gradlew assembleDebug      # Linux / macOS
gradlew.bat assembleDebug    # Windows
```
The output APK will be generated at:
`mobile/android/app/build/outputs/apk/debug/app-debug.apk`

Transfer this file to any Android device or share via Google Drive/WhatsApp and install!

---

## 📚 REST API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/auth/register` | `POST` | Create new user account |
| `/api/v1/auth/login` | `POST` | Authenticate and obtain JWT token |
| `/api/v1/auth/quick-pin/setup` | `POST` | Set up 4-digit emergency Quick PIN |
| `/api/v1/auth/quick-pin/verify` | `POST` | Verify Quick PIN with lockout protection |
| `/api/v1/documents` | `GET` | List user documents with category & search filter |
| `/api/v1/documents/upload` | `POST` | Upload document with EasyOCR & blur detection |
| `/api/v1/documents/chat` | `POST` | **DocuVault 2.0 Local RAG Chat** with source citations |
| `/api/v1/documents/packs` | `GET` | **Smart Document Pack Generator** (5 purpose packs) |
| `/api/v1/documents/consistency-check` | `GET` | **Cross-Document Consistency Checker** (name, DOB) |
| `/api/v1/documents/check-duplicate` | `POST` | **Cryptographic Duplicate Detection** (SHA-256 + text) |
| `/api/v1/documents/{id}/versions` | `GET` | Document version history |
| `/api/v1/documents/{id}/restore/{v}`| `POST` | Restore previous document version |
| `/api/v1/documents/{id}/feedback` | `POST` | Submit structured OCR correction feedback |
| `/api/v1/transfer/generate` | `POST` | Generate 6-digit phone-to-phone pairing code |
| `/api/v1/transfer/claim` | `POST` | Claim & migrate documents from pairing code |
| `/api/v1/families` | `GET/POST` | Family Vault management and completeness tracking |
| `/api/v1/emergency/break-glass` | `POST` | Emergency break-glass access protocol |

---

## 🧪 Testing

- **Backend compilation & packaging**:
  ```bash
  cd backend-spring-boot
  mvnw.cmd test
  ```
- **Frontend test suite**:
  ```bash
  cd mobile
  npm test
  ```
- **Postman Collection**: Import [`docs/DocuVault_Postman_Collection.json`](file:///d:/Applications/Projects/M_Project/Digi-App/docs/DocuVault_Postman_Collection.json) into Postman for automated API test runs.

---

## 👥 Authors & Academic Credits
- **Major Project**: DocuVault 2.0 — Smart Digital Document Locker & Family Emergency Vault
- **Architecture**: Microservice-oriented, Biometric-first, Cloud-Native
- **License**: Academic Project

