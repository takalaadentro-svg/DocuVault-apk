# DocuVault — Testing & Quality Assurance Guide

DocuVault employs a multi-tiered quality assurance strategy strictly aligned with the **Academic & Architectural Technology Matrix**:
1. **API Testing Suite**: Postman (`docs/DocuVault_Postman_Collection.json`) testing the Spring Boot REST backend.
2. **Frontend Unit Tests**: Node Test Runner (`mobile/test/components.test.js`) testing client-side validation and security parsing.
3. **End-to-End (E2E) Verification**: Complete 14-step manual checklist for viva and project evaluation.

---

## 1. API Testing with Postman (Academic Specification)

The official Postman test collection is located at:
📁 [`docs/DocuVault_Postman_Collection.json`](file:///d:/Applications/Projects/Vishanth_frirend/Digi-App/docs/DocuVault_Postman_Collection.json)

### 1.1 How to Run via Postman UI
1. Open the **Postman** desktop application or web agent.
2. Click **Import** in the upper left corner.
3. Select or drag-and-drop [`docs/DocuVault_Postman_Collection.json`](file:///d:/Applications/Projects/Vishanth_frirend/Digi-App/docs/DocuVault_Postman_Collection.json).
4. Verify the collection variables:
   - `baseUrl`: `http://localhost:8080/api/v1`
   - `authToken`: (Automatically populated by the login test script)
   - `documentId`: (Populated upon document upload or retrieval)
   - `shareToken`: (Populated upon generating a share link)
5. Click **Run Collection** to execute all 5 test folders sequentially, or run individual requests.

---

### 1.2 Automated Postman Test Modules

#### Module 1: Authentication & Account Security (`/auth`)
- **Register User**: Creates a new user profile with name, email, phone, and password.
- **Login User**: Authenticates credentials via BCrypt and executes a Postman test script that automatically extracts and sets `pm.collectionVariables.set('authToken', ...)`.
- **Get Current User Profile**: Verifies JWT authentication filter and Bearer token parsing.
- **Configure Quick PIN**: Hashes and sets a 4-digit Quick PIN (`2468`) for biometric fallback.
- **Verify Quick PIN**: Confirms matching PIN logic against MongoDB.

#### Module 2: Document Locker & Cryptographic DNA (`/documents`)
- **Get All Documents**: Lists all indexed documents across personal and family vault tabs.
- **Search Documents**: Executes full-text queries against MongoDB Atlas `@TextIndexed` fields and OCR transcripts.
- **Verify Document DNA**: Calls `POST /documents/{{documentId}}/verify-dna`, recalculating the SHA-256 hash on-demand and asserting `status == "VERIFIED_AUTHENTIC"` and `match == true`.

#### Module 3: Emergency Vault ("Break-Glass Protocol") (`/emergency`)
- **Get Emergency Contacts**: Lists designated emergency guardians.
- **Add Emergency Contact**: Registers a contact with emergency retrieval permissions.
- **Get Emergency Medical Info**: Retrieves Blood Group, allergies, and chronic medical notes.
- **Trigger Break-Glass Emergency Mode**: Simulates emergency triage access with Quick PIN/biometric verification and creates an immutable audit log entry.

#### Module 4: QR-Based Document Sharing (`/share`)
- **Generate QR Share Token**: Generates a high-entropy URL-safe token, expiration timestamp, maximum access counter, and rendered ZXing Base64 QR code.
- **Access Public Shared Document**: Accesses the shared document without session auth via `GET /share/public/{{shareToken}}?pin=1234`.

#### Module 5: Diagnostics & Architecture Verification (`/health`)
- **Health Check & Matrix Verification**: Verifies that the Spring Boot 2.7.x service, MongoDB Atlas connection, and security components are `UP`.

---

### 1.3 Running Headless with Newman CLI
You can also run the collection directly from the command line using Newman:
```bash
npm install -g newman
newman run docs/DocuVault_Postman_Collection.json --reporters cli
```

---

## 2. Frontend Unit Tests (Node Test Runner)

Located in [`mobile/test/components.test.js`](file:///d:/Applications/Projects/Vishanth_frirend/Digi-App/mobile/test/components.test.js):
- **RFC Email Validator**: Enforces strict email syntax pattern matching.
- **Security PIN Validator**: Enforces 4 to 6 numeric digit constraints.
- **Document Expiration Classifier**: Tests categorization logic (`CRITICAL` <= 7d, `WARNING` <= 30d, `VALID`, `EXPIRED`).
- **File Size Formatter**: Verifies accurate byte conversion (`B`, `KB`, `MB`).
- **QR Share URL & Token Parser**: Tests token extraction from both full URLs and raw tokens.

### Running Frontend Tests:
```bash
cd mobile
npm test
```

Expected Output:
```
▶ Frontend Form Validation & Security Helpers
  ✔ Email validator enforces valid RFC patterns
  ✔ PIN code validator requires 4-6 numeric digits
  ✔ Document expiry calculator classifies warning states correctly
  ✔ File size formatter calculates human-readable representations
  ✔ QR share URL parser extracts clean token from absolute links
✔ Frontend Form Validation & Security Helpers (5.12ms)

ℹ tests 5 | suites 1 | pass 5 | fail 0
```

---

## 3. Manual End-to-End Testing Checklist for Evaluation & Demo

| Step | Test Action | Expected Result | Verified |
|:---:|---|---|:---:|
| **1** | Open `http://localhost:5173` | Auth screen loads with sleek glassmorphic Navy/Teal interface. | [x] |
| **2** | Click **"⚡ Instant Demo Access"** | Instantly authenticates as `Rajesh Sharma` with Bearer token. | [x] |
| **3** | Observe Home Dashboard | Welcome header shows "Welcome back, Rajesh", document counter, and expiry warning banner. | [x] |
| **4** | Open **"My Vault"** Tab | Lists 5 initial documents: Aadhaar, Passport, Driving Licence, Health Insurance, Degree Certificate. | [x] |
| **5** | Filter by Category "Medical" | Instantly filters to show only the Health Insurance policy. | [x] |
| **6** | Voice Search Button | Click microphone icon and speak "Passport". Voice transcript populates search query and filters list. | [x] |
| **7** | Document DNA Verification | Open any document modal and click **"Verify Document DNA"**. Confirms bit-level SHA-256 match with green `VERIFIED_AUTHENTIC` badge. | [x] |
| **8** | OCR Extracted Text | Check document details modal to view full extracted OCR text and one-click copy button. | [x] |
| **9** | Create QR Share Link | Click **"Create QR Share"**. Select 24h expiration and 5 views limit. Generates ZXing QR code image and copyable link. | [x] |
| **10** | Recipient Public Viewer | Open share URL in incognito browser tab. Displays document preview with remaining views counter. | [x] |
| **11** | Open **"Family"** Tab | Displays "Sharma Family Vault" with member roles (Owner, Admin, Member) and pending invites. | [x] |
| **12** | Switch to **"Emergency"** Sub-Tab | Displays Emergency Medical Card (Blood Group O+, Allergies, Emergency Contacts). | [x] |
| **13** | Simulate Break-Glass Access | Enter Quick PIN `2468` or Biometrics. Emergency documents unlock and audit log entry is recorded. | [x] |
| **14** | Open **"Alerts"** Tab | Displays expiration notices generated by Spring Scheduler cron for 30d/7d milestones. | [x] |
