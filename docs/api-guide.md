# DocuVault REST API Specification Guide

**Base URL**: `http://localhost:8080/api/v1`  
**Security**: Bearer JWT (`Authorization: Bearer <token>`) & BCrypt Password/PIN Hashing  
**Response Envelope Format**:
```json
{
  "success": true,
  "message": "Human readable status message",
  "data": { ... }
}
```

---

## 1. Authentication & Security Endpoints (`/auth`)

### 1.1 User Registration
- **Endpoint**: `POST /auth/register`
- **Request Body**:
```json
{
  "email": "user@digivault.app",
  "full_name": "Rajesh Sharma",
  "password": "Password123!",
  "phone": "+91 98765 43210"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "tokenType": "Bearer",
    "user": {
      "id": "670da4...",
      "email": "user@digivault.app",
      "fullName": "Rajesh Sharma",
      "phone": "+91 98765 43210",
      "hasQuickPin": false,
      "createdAt": "2026-10-14T12:00:00Z"
    }
  }
}
```

### 1.2 User Login
- **Endpoint**: `POST /auth/login`
- **Request Body**:
```json
{
  "email": "user@digivault.app",
  "password": "Password123!"
}
```
- **Response**: `200 OK` (returns JWT `accessToken`, `tokenType: "Bearer"`, and `user` object).

### 1.3 Get Current User Profile
- **Endpoint**: `GET /auth/me`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response**: `200 OK` (returns authenticated user profile data).

### 1.4 Change Password
- **Endpoint**: `POST /auth/change-password`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Request Body**:
```json
{
  "old_password": "Password123!",
  "new_password": "NewSecretPassword456!"
}
```
- **Response**: `200 OK`

### 1.5 Configure 4-Digit Quick PIN
- **Endpoint**: `POST /auth/quick-pin`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Request Body**:
```json
{
  "pin": "2468"
}
```
- **Response**: `200 OK` (hashes and stores Quick PIN via BCrypt for biometric fallback).

### 1.6 Verify Quick PIN
- **Endpoint**: `POST /auth/verify-pin`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Request Body**:
```json
{
  "pin": "2468"
}
```
- **Response**: `200 OK` (returns `{ "valid": true }` or HTTP 400).

---

## 2. Document Locker & Cryptographic DNA (`/documents`)

### 2.1 Upload Document
- **Endpoint**: `POST /documents/upload`
- **Headers**: `Authorization: Bearer <accessToken>`, `Content-Type: multipart/form-data`
- **Form Data**:
  - `file`: Binary file (PDF, JPEG, PNG, WEBP, DOCX, max 25MB)
  - `title`: Document title (e.g. "Republic of India Passport")
  - `category`: `Identity` | `Education` | `Medical` | `Financial` | `Legal` | `Insurance` | `Property` | `Vehicle` | `Other`
  - `issuer`: (Optional) e.g., "Ministry of External Affairs"
  - `issue_date`: (Optional) `YYYY-MM-DD`
  - `expiry_date`: (Optional) `YYYY-MM-DD`
  - `notes`: (Optional) Notes or policy numbers
  - `folder`: (Optional) Default: "General"
  - `is_emergency_eligible`: (Optional) `true` / `false`
  - `is_family_vault`: (Optional) `true` / `false`
- **Automatic Processing**:
  1. Computes SHA-256 cryptographic DNA hash (`MessageDigest`).
  2. Dispatches to EasyOCR microservice (`/extract-ocr`) for scanned text extraction.
  3. Executes rule-based categorization engine across 9 category dictionaries.
- **Response**: `200 OK`

### 2.2 List & Search Documents
- **Endpoint**: `GET /documents`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Query Parameters**:
  - `search`: Keyword / Voice search query (matches title, issuer, notes, and full OCR extracted text)
  - `category`: Filter by category (e.g. `Identity`, `Insurance`)
  - `folder`: Filter by folder
  - `sort_by`: `newest` | `oldest` | `expiry_asc` | `expiry_desc` | `title`
- **Response**: `200 OK` (Array of documents with calculated `daysUntilExpiry`, `isExpired`, and `dnaHash`).

### 2.3 Download Document
- **Endpoint**: `GET /documents/{id}/download`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response**: Streams authorized file attachment with `Content-Disposition: attachment`.

### 2.4 Preview Document
- **Endpoint**: `GET /documents/{id}/preview`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response**: Streams file inline with `Content-Disposition: inline` for embedded PDF and image viewing.

### 2.5 Verify Document DNA (SHA-256 Tamper Detection)
- **Endpoint**: `POST /documents/{id}/verify-dna`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Description**: Recalculates the SHA-256 checksum from physical/cloud storage on-demand and verifies it against the registered database hash.
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Document DNA verification completed",
  "data": {
    "documentId": "670da4...",
    "status": "VERIFIED_AUTHENTIC",
    "registeredHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "storageHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "match": true,
    "verifiedAt": "2026-10-14T22:00:00Z"
  }
}
```

### 2.6 Delete Document
- **Endpoint**: `DELETE /documents/{id}`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response**: `200 OK`

---

## 3. Family Locker & In-App Invitations (`/family`)

### 3.1 Create Family Group
- **Endpoint**: `POST /family`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Request Body**: `{"name": "Sharma Family Vault"}`
- **Response**: `200 OK`

### 3.2 Get Family Group Details
- **Endpoint**: `GET /family`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response**: `200 OK` (returns family members, pending invitations, and shared family documents).

### 3.3 Invite Member to Family Group
- **Endpoint**: `POST /family/{id}/invite`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Request Body**:
```json
{
  "invitee_email": "priya.sharma@family.com",
  "role": "ADMIN" // "ADMIN" | "MEMBER" | "EMERGENCY_CONTACT"
}
```
- **Response**: `200 OK`

### 3.4 List Pending Invitations
- **Endpoint**: `GET /family/invitations`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response**: `200 OK`

### 3.5 Respond to Invitation
- **Endpoint**: `POST /family/invitations/{id}/respond`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Request Body**: `{"action": "ACCEPT"}` // or "REJECT"
- **Response**: `200 OK`

---

## 4. Emergency Vault & Break-Glass Protocol (`/emergency`)

### 4.1 List Emergency Contacts
- **Endpoint**: `GET /emergency/contacts`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response**: `200 OK`

### 4.2 Add Emergency Contact
- **Endpoint**: `POST /emergency/contacts`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Request Body**:
```json
{
  "name": "Dr. Ramesh Verma",
  "relationship": "Physician",
  "phone": "+91 98111 22233",
  "email": "dr.verma@hospital.org",
  "can_access_emergency_docs": true
}
```
- **Response**: `200 OK`

### 4.3 Get Emergency Medical Info
- **Endpoint**: `GET /emergency/medical-info`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response**: `200 OK`

### 4.4 Update Emergency Medical Info
- **Endpoint**: `PUT /emergency/medical-info`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Request Body**:
```json
{
  "blood_group": "O+",
  "allergies": "Penicillin, Peanuts",
  "chronic_conditions": "Mild Asthma",
  "current_medications": "Albuterol inhaler",
  "emergency_notes": "Carries inhaler. Contact spouse immediately.",
  "physician_name": "Dr. Ramesh Verma",
  "physician_phone": "+91 98111 22233",
  "organ_donor": true
}
```
- **Response**: `200 OK`

### 4.5 Break-Glass Emergency Access
- **Endpoint**: `POST /emergency/break-glass`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Request Body**:
```json
{
  "pin": "2468",
  "biometric": true,
  "reason": "Hospital admission urgent emergency triage"
}
```
- **Response**: `200 OK` (returns Medical Card and only documents flagged `isEmergencyEligible == true`, while logging an immutable audit record).

---

## 5. QR-Code Document Sharing (`/share`)

### 5.1 Create Time-Bounded Share Token
- **Endpoint**: `POST /share/create`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Request Body**:
```json
{
  "document_id": "670da4...",
  "expires_in_hours": 24,
  "max_views": 5,
  "pin": "1234"
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Share link generated successfully",
  "data": {
    "token": "a1b2c3d4-e5f6...",
    "shareUrl": "http://localhost:5173/share/a1b2c3d4-e5f6...",
    "qrCodeImage": "data:image/png;base64,iVBORw0KGgo...",
    "expiresAt": "2026-10-15T22:00:00Z",
    "maxViews": 5,
    "hasPin": true
  }
}
```

### 5.2 Recipient Document View (Public Endpoint)
- **Endpoint**: `GET /share/public/{token}?pin=1234`
- **Description**: Validates token validity, expiration, and remaining views. Increments access counter and logs audit access.
- **Response**: `200 OK` (metadata, preview URL, download URL).
- **Errors**:
  - `410 Gone`: Expired or maximum views exceeded.
  - `401 Unauthorized`: PIN required or invalid PIN.

### 5.3 Public Download & Preview
- **Endpoint**: `GET /share/download/{token}?pin=1234`
- **Endpoint**: `GET /share/preview/{token}?pin=1234`

---

## 6. Notifications & Expiry Alerts (`/notifications`)

### 6.1 List Notifications
- **Endpoint**: `GET /notifications`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response**: `200 OK` (30-day, 7-day, 1-day expiry warnings generated by Spring Scheduler cron).

### 6.2 Mark Notification as Read
- **Endpoint**: `PUT /notifications/{id}/read`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response**: `200 OK`

---

## 7. Diagnostics & Academic Matrix Check (`/health`)

### 7.1 System Health
- **Endpoints**: `GET /health` or `GET /api/v1/health`
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "DocuVault Spring Boot Backend is operational",
  "data": {
    "service": "digivault-backend",
    "status": "UP",
    "framework": "Spring Boot 2.7.18",
    "language": "Java",
    "database": "MongoDB Atlas",
    "security": "Spring Security + JJWT + BCrypt",
    "ocr": "EasyOCR Python REST Microservice (:5001)",
    "storage": "LOCAL",
    "timestamp": "2026-10-15T14:05:22Z"
  }
}
```

---

## 8. Audit Trail Endpoints (`/audit`)

### 8.1 Retrieve User Security Audit Log
- **Endpoint**: `GET /audit`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response**: `200 OK` (chronological list of security events: `LOGIN_SUCCESS`, `PIN_VERIFY`, `DNA_INTEGRITY_CHECK`, `DOCUMENT_SHARE`, `EMERGENCY_ACCESS`).

---

## 9. System & Demo Seeding (`/system`)

### 9.1 Seed Demo Records
- **Endpoint**: `POST /system/seed-demo`
- **Description**: Populates the demo user (`Rajesh Sharma`), baseline documents, family groups, and sample notifications if database is fresh.
- **Response**: `200 OK`

---

## 10. Public Production Checklist

| Category | Verification Status | Cloud Readiness |
| :--- | :--- | :--- |
| **Backend Java** | Spring Boot 2.7.18 compiles cleanly (53 source files) | ✅ Ready (`app.jar` built) |
| **Frontend Web** | React Native / Vite compiles cleanly into `dist/` | ✅ Ready (`1548 modules transformed`) |
| **OCR Service** | Python 3.11+ FastAPI + EasyOCR containerized | ✅ Ready (port 5001) |
| **Database** | MongoDB Atlas MQL compatibility + driver timeouts | ✅ Ready (`serverSelectionTimeoutMS=2000`) |
| **Security & CORS** | Wildcard / dynamic origin matching with credentials | ✅ Ready (`CORS_ALLOWED_ORIGINS=*`) |

---

## 11. DocuVault 2.0 Advanced Intelligence & Productivity Endpoints

### 11.1 Chat with Documents (Local RAG)
- **Endpoint**: `POST /documents/chat`
- **Headers**: `Authorization: Bearer <accessToken>`, `Content-Type: application/json`
- **Request Body**:
```json
{
  "query": "What is my passport number and when does it expire?",
  "documentId": null
}
```
- **Response**: `200 OK`
```json
{
  "success": true,
  "message": "Found 2 relevant passage(s)",
  "data": {
    "answer": "Based on your verified documents: Your Passport number is Z1234567 and it expires on 2028-11-20.",
    "citations": [
      {
        "documentId": "670da4...",
        "documentTitle": "Indian Passport",
        "category": "Travel",
        "snippet": "...Passport Number: Z1234567 | Expiry Date: 2028-11-20...",
        "relevanceScore": 0.94
      }
    ],
    "hasRelevantPassages": true
  }
}
```

### 11.2 Smart Purpose-Based Document Packs
- **Endpoint**: `GET /documents/packs`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response**: `200 OK`
Returns the 5 purpose-based packs (College Admissions, Job Onboarding, International Travel, Medical Visit, Insurance Claim) with attached matched documents, missing checklist items, and completion percentages.

### 11.3 Cross-Document Consistency Checker
- **Endpoint**: `GET /documents/consistency-check`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response**: `200 OK`
Cross-analyzes all authorized user documents, reconciling Holder Names, Dates of Birth, and addresses. Flags discrepancies and abbreviation variations (e.g., "Rajesh K Sharma" vs "Rajesh Sharma").

### 11.4 Cryptographic Duplicate Detection
- **Endpoint**: `POST /documents/check-duplicate`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Request Body**:
```json
{
  "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "ocrText": "REPUBLIC OF INDIA PASSPORT..."
}
```
- **Response**: `200 OK` (returns `{ isExactDuplicate: boolean, isSimilarDuplicate: boolean, similarityScore: 0.98, matchingDocumentId: "..." }`).

### 11.5 Document Version History & Restoration
- **Endpoint**: `GET /documents/{id}/versions` — Returns chronological list of versions with timestamp, author, and change description.
- **Endpoint**: `POST /documents/{id}/restore/{versionNumber}` — Reverts document to specified version snapshot.

### 11.6 Structured OCR Correction Feedback
- **Endpoint**: `POST /documents/{id}/feedback`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Request Body**:
```json
{
  "fieldName": "expiryDate",
  "extractedValue": "2024-11-20",
  "correctedValue": "2028-11-20"
}
```
- **Response**: `200 OK` (persists correction in `ocr_feedback` collection to continuously evaluate extraction accuracy).

### 11.7 Phone-to-Phone Direct Vault Transfer
- **Endpoint**: `POST /transfer/generate` — Creates a short-lived 10-minute pairing code (`DV-XXXXXX`) bundling user's vault documents for phone migration.
- **Endpoint**: `POST /transfer/claim?code=DV-XXXXXX` — Imports and synchronizes bundled documents onto the new device.


