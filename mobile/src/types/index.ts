export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  has_quick_pin?: boolean;
  is_active: boolean;
  created_at: string;
}

export interface DocumentPermission {
  id: string;
  document_id: string;
  granted_by_user_id: string;
  granted_to_user_id: string;
  granted_to_user_name?: string;
  granted_to_user_email?: string;
  can_view: boolean;
  can_download: boolean;
  can_edit?: boolean;
  can_share?: boolean;
  created_at: string;
}

export interface DocumentItem {
  id: string;
  user_id: string;
  title: string;
  category: string;
  doc_type?: string;
  subtype?: string;
  issuer?: string;
  holder_name?: string;
  doc_number?: string;
  dob?: string;
  issue_date?: string;
  expiry_date?: string;
  notes?: string;
  folder: string;
  file_path: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  sha256_hash?: string;
  ocr_text?: string;
  ocr_confidence?: number;
  is_blurred?: boolean;
  version?: number;
  collection_name?: string;
  is_emergency_eligible: boolean;
  is_family_vault: boolean;
  is_favorite?: boolean;
  is_offline_available?: boolean;
  is_expired: boolean;
  days_until_expiry?: number | null;
  created_at: string;
  updated_at?: string;
  permissions?: DocumentPermission[];
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  user_id: string;
  version_number: number;
  title: string;
  original_filename: string;
  stored_filename: string;
  file_size: number;
  sha256_hash: string;
  change_summary: string;
  ocr_text?: string;
  created_at: string;
}

export interface OCRExtractResult {
  extracted_text: string;
  suggested_category: string;
  suggested_doc_type?: string;
  subtype?: string;
  confidence: number;
  matched_keywords?: string[];
  sha256_hash: string;
  file_size: number;
  is_blurred?: boolean;
  blur_score?: number;
  holder_name?: string;
  doc_number?: string;
  dob?: string;
  issue_date?: string;
  expiry_date?: string;
}

export interface DocumentDNAVerificationResult {
  document_id: string;
  title: string;
  stored_hash: string;
  current_file_hash: string;
  is_intact: boolean;
  verification_status: string;
  verified_at: string;
}

export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'EMERGENCY_CONTACT';
  joined_at: string;
  full_name: string;
  email: string;
  phone_number?: string;
}

export interface FamilyInvitation {
  id: string;
  family_id: string;
  family_name: string;
  inviter_id: string;
  inviter_name: string;
  invitee_email: string;
  role: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'REVOKED';
  created_at: string;
}

export interface FamilyGroup {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  members: FamilyMember[];
  invitations: FamilyInvitation[];
  documents?: DocumentItem[];
}

export interface EmergencyContact {
  id: string;
  user_id: string;
  contact_user_id?: string;
  name: string;
  relationship_type: string;
  phone_number: string;
  email?: string;
  can_access_medical: boolean;
  can_access_identity: boolean;
  can_access_financial: boolean;
  is_active: boolean;
  created_at: string;
}

export interface EmergencyMedicalInfo {
  id?: string;
  user_id?: string;
  blood_group?: string;
  allergies?: string;
  chronic_conditions?: string;
  current_medications?: string;
  emergency_notes?: string;
  physician_name?: string;
  physician_phone?: string;
  organ_donor?: boolean;
}

export interface ShareTokenItem {
  id: string;
  document_id: string;
  document_title: string;
  document_category: string;
  token: string;
  share_url: string;
  qr_code_svg?: string;
  expires_at?: string;
  max_access_count?: number;
  original_filename?: string;
  base64_data?: string;
  holder_name?: string;
  doc_number?: string;
  dob?: string;
  ocr_text?: string;
  sha256_hash?: string;
  access_count: number;
  is_revoked: boolean;
  require_pin: boolean;
  created_at: string;
}

export interface SharedDocumentViewData {
  id: string;
  title: string;
  category: string;
  issuer?: string;
  issue_date?: string;
  expiry_date?: string;
  owner_name: string;
  mime_type: string;
  file_size: number;
  download_url: string;
  preview_url: string;
  expires_at?: string;
  access_count: number;
  max_access_count?: number;
  original_filename?: string;
  base64_data?: string;
  holder_name?: string;
  doc_number?: string;
  dob?: string;
  ocr_text?: string;
  sha256_hash?: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  channel?: 'IN_APP' | 'PUSH' | 'EMAIL' | 'SMS_WHATSAPP';
  delivery_status?: 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED';
  is_read: boolean;
  related_document_id?: string;
  created_at: string;
}

export interface DashboardStats {
  total_documents: number;
  expiring_soon_count: number;
  expired_count: number;
  family_members_count: number;
  active_shares_count: number;
  emergency_contacts_count: number;
}

export interface AuditLogItem {
  id: string;
  user_id?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: string;
  ip_address?: string;
  created_at: string;
}

// --- DocuVault 2.0 Productivity & Intelligence Types ---

export interface DocumentChatCitation {
  documentId: string;
  documentTitle: string;
  category: string;
  excerpt: string;
  confidence: number;
}

export interface DocumentChatResponse {
  answer: string;
  citations: DocumentChatCitation[];
  infoFound: boolean;
}

export interface DocumentPackItem {
  requiredDocType: string;
  category: string;
  isAvailable: boolean;
  matchedDocumentId?: string;
  matchedDocumentTitle?: string;
}

export interface DocumentPack {
  packId: string;
  packName: string;
  purpose: string;
  totalRequired: number;
  totalAvailable: number;
  completenessPercentage: number;
  items: DocumentPackItem[];
}

export interface ConsistencyIssue {
  fieldName: string;
  document1Title: string;
  value1: string;
  document2Title: string;
  value2: string;
  severity: 'WARNING' | 'INFO';
  advice: string;
}

export interface ConsistencyCheckResult {
  totalDocumentsAnalyzed: number;
  isConsistent: boolean;
  issues: ConsistencyIssue[];
  passedFields: string[];
}

export interface DuplicateCheckResult {
  duplicate: boolean;
  duplicateType: 'EXACT_HASH' | 'TEXT_SIMILARITY' | 'NONE';
  similarityScore: number;
  existingDocumentId?: string;
  existingDocumentTitle?: string;
  message: string;
}

export interface PhoneTransferPairing {
  transferCode: string;
  expiresInSeconds: number;
  qrCodeData: string;
  documentCount: number;
  pairing_code?: string;
  document_count?: number;
}

export interface AutofillProfile {
  fullName?: string;
  dob?: string;
  aadhaarNumber?: string;
  panNumber?: string;
  passportNumber?: string;
  drivingLicenseNumber?: string;
  email?: string;
  phone?: string;
  bloodGroup?: string;
}
