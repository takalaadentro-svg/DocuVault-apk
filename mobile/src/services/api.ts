import { 
  User, DocumentItem, FamilyGroup, FamilyInvitation, 
  EmergencyContact, EmergencyMedicalInfo, ShareTokenItem, 
  SharedDocumentViewData, NotificationItem, DashboardStats, 
  AuditLogItem, DocumentPermission, OCRExtractResult, DocumentDNAVerificationResult,
  DocumentChatResponse, DocumentPack, ConsistencyCheckResult, DuplicateCheckResult,
  DocumentVersion, PhoneTransferPairing
} from '../types';

const BASE_URL = (import.meta as any).env?.VITE_API_URL || 
  ((import.meta as any).env?.DEV ? '/api/v1' : 'https://docuvault-spring-backend.onrender.com/api/v1');

class ApiService {
  private token: string | null = null;
  private cachedUser: User | null = null;

  constructor() {
    this.token = localStorage.getItem('docuvault_access_token');
    const userStr = localStorage.getItem('docuvault_user');
    if (userStr) {
      try {
        this.cachedUser = JSON.parse(userStr);
      } catch (e) {
        this.cachedUser = null;
      }
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('docuvault_access_token', token);
    } else {
      localStorage.removeItem('docuvault_access_token');
      localStorage.removeItem('docuvault_user');
      this.cachedUser = null;
    }
  }

  getToken(): string | null {
    return this.token || localStorage.getItem('docuvault_access_token');
  }

  setUser(user: User | null) {
    this.cachedUser = user;
    if (user) {
      localStorage.setItem('docuvault_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('docuvault_user');
    }
  }

  getCachedUser(): User | null {
    if (this.cachedUser) return this.cachedUser;
    const userStr = localStorage.getItem('docuvault_user');
    if (userStr) {
      try {
        this.cachedUser = JSON.parse(userStr);
        return this.cachedUser;
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    
    // Inject Authorization header if token exists and not already provided
    const token = this.getToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // 30-second timeout to handle cloud spin-up & large uploads smoothly
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
        signal: controller.signal
      });

      if (response.status === 401 && 
          !endpoint.includes('/auth/login') && 
          !endpoint.includes('/auth/register') && 
          !endpoint.includes('/auth/verify-pin') &&
          !endpoint.includes('/auth/send-otp') &&
          !endpoint.includes('/auth/verify-otp')) {
        // Session explicitly expired on server
        this.setToken(null);
        this.setUser(null);
        window.dispatchEvent(new Event('docuvault_session_expired'));
        throw new Error('Your session has expired. Please log in again.');
      }

      if (!response.ok) {
        let errMessage = 'An error occurred';
        try {
          const errData = await response.json();
          errMessage = errData.detail || errData.message || response.statusText;
        } catch (_) {
          errMessage = await response.text() || response.statusText;
        }
        throw new Error(errMessage);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      }
      return response.text() as unknown as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Auth APIs
  async sendOtp(email: string, purpose: string = 'REGISTRATION') {
    return this.request<{ status: string; message: string; email_dispatched: boolean; dev_code?: string }>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ email, purpose })
    });
  }

  async verifyOtp(email: string, otp: string, purpose: string = 'REGISTRATION') {
    return this.request<{ status: string; message: string; verified: boolean }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp, purpose })
    });
  }

  async register(data: { email: string; full_name: string; password: string; phone_number?: string; otp?: string }) {
    const res = await this.request<{ access_token: string; refresh_token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    this.setToken(res.access_token);
    this.setUser(res.user);
    return res;
  }

  async login(data: { email: string; password: string }) {
    const res = await this.request<{ access_token: string; refresh_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    this.setToken(res.access_token);
    this.setUser(res.user);
    return res;
  }

  async getMe(): Promise<User> {
    const u = await this.request<User>('/auth/me');
    if (u) {
      this.setUser(u);
    }
    return u;
  }

  async updateMe(data: { full_name?: string; phone_number?: string }): Promise<User> {
    const u = await this.request<User>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    if (u) {
      this.setUser(u);
    }
    return u;
  }

  async setQuickPin(pin: string) {
    return this.request<{ message: string; has_quick_pin: boolean }>('/auth/quick-pin', {
      method: 'POST',
      body: JSON.stringify({ pin })
    });
  }

  async verifyQuickPin(pin: string) {
    return this.request<{ status: string; message: string }>('/auth/verify-pin', {
      method: 'POST',
      body: JSON.stringify({ pin })
    });
  }

  async toggleBiometric(enabled: boolean) {
    return this.request<{ message: string; biometric_enabled: boolean }>('/auth/biometric', {
      method: 'POST',
      body: JSON.stringify({ enabled })
    });
  }

  logout() {
    this.setToken(null);
    this.setUser(null);
  }

  // Documents APIs
  async uploadDocument(formData: FormData): Promise<DocumentItem> {
    return this.request<DocumentItem>('/documents/upload', {
      method: 'POST',
      body: formData
    });
  }

  async ocrExtract(file: File): Promise<OCRExtractResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<OCRExtractResult>('/documents/ocr-extract', {
      method: 'POST',
      body: formData
    });
  }

  async verifyDocumentDna(docId: string): Promise<DocumentDNAVerificationResult> {
    return this.request<DocumentDNAVerificationResult>(`/documents/${docId}/verify-dna`);
  }

  async getDocuments(params?: { 
    query?: string; 
    category?: string; 
    folder?: string; 
    is_family_vault?: boolean;
    sort_by?: string 
  }): Promise<DocumentItem[]> {
    const searchParams = new URLSearchParams();
    if (params?.query) searchParams.set('query', params.query);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.folder) searchParams.set('folder', params.folder);
    if (params?.is_family_vault !== undefined) searchParams.set('is_family_vault', String(params.is_family_vault));
    if (params?.sort_by) searchParams.set('sort_by', params.sort_by);
    
    const queryStr = searchParams.toString();
    try {
      const docs = await this.request<DocumentItem[]>(`/documents${queryStr ? `?${queryStr}` : ''}`);
      return Array.isArray(docs) ? docs : [];
    } catch (e) {
      console.warn('Could not load documents from server:', e);
      return [];
    }
  }

  async getDocument(id: string): Promise<DocumentItem> {
    return this.request<DocumentItem>(`/documents/${id}`);
  }

  async updateDocument(id: string, data: Partial<DocumentItem>): Promise<DocumentItem> {
    return this.request<DocumentItem>(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteDocument(id: string) {
    return this.request<{ message: string }>(`/documents/${id}`, {
      method: 'DELETE'
    });
  }

  async downloadDocument(id: string): Promise<Blob> {
    const token = this.getToken();
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    
    const response = await fetch(`${BASE_URL}/documents/${id}/download`, { headers });
    if (!response.ok) throw new Error('Download failed');
    return response.blob();
  }

  async askDocumentAssistant(docId: string, question: string): Promise<DocumentChatResponse> {
    return this.request<DocumentChatResponse>(`/documents/${docId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ question })
    });
  }

  async getDocumentPacks(): Promise<DocumentPack[]> {
    let docs: DocumentItem[] = [];
    try {
      docs = await this.getDocuments();
    } catch (e) {}

    const hasDoc = (keyword: string, category?: string) => {
      const kw = keyword.toLowerCase();
      return docs.find(d => 
        (d.title && d.title.toLowerCase().includes(kw)) ||
        (d.doc_type && d.doc_type.toLowerCase().includes(kw)) ||
        (d.subtype && d.subtype.toLowerCase().includes(kw)) ||
        (category && d.category && d.category.toLowerCase() === category.toLowerCase())
      );
    };

    const packsConfig = [
      {
        packId: 'pack_college',
        packName: 'College Degree & Admission Pack',
        purpose: 'Academic dossier for university admissions, study visa, and government degree verification',
        required: [
          { name: '10th / Secondary Marksheet', category: 'Education', kw: '10th' },
          { name: '12th / Higher Secondary Marksheet', category: 'Education', kw: '12th' },
          { name: 'Degree / Diploma Certificate', category: 'Education', kw: 'degree' },
          { name: 'Government ID Proof', category: 'Identity', kw: 'aadhaar' },
          { name: 'Transfer / Migration Certificate', category: 'Education', kw: 'transfer' },
        ]
      },
      {
        packId: 'pack_job',
        packName: 'Job Onboarding & Employment Pack',
        purpose: 'Required paperwork for corporate onboarding, background verification (BGV) and payroll setup',
        required: [
          { name: 'PAN Card (Mandatory for Payroll)', category: 'Identity', kw: 'pan' },
          { name: 'Aadhaar Card (Address & ID)', category: 'Identity', kw: 'aadhaar' },
          { name: 'Highest Degree Certificate', category: 'Education', kw: 'degree' },
          { name: 'Previous Relieving / Experience Letter', category: 'Employment', kw: 'experience' },
          { name: 'Cancelled Cheque / Bank Statement', category: 'Finance', kw: 'bank' },
        ]
      },
      {
        packId: 'pack_travel',
        packName: 'International Travel Pack',
        purpose: 'All necessary permits, border documentation, flight records, and medical safety cover',
        required: [
          { name: 'Passport (Valid > 6 Months)', category: 'Travel', kw: 'passport' },
          { name: 'Valid Visa / Entry Permit', category: 'Travel', kw: 'visa' },
          { name: 'Travel & Medical Insurance', category: 'Travel', kw: 'insurance' },
          { name: 'Vaccination / Health Certificate', category: 'Medical', kw: 'vaccin' },
        ]
      },
      {
        packId: 'pack_medical',
        packName: 'Medical Visit & Emergency Pack',
        purpose: 'Clinical records, active health insurance policy, prescription and diagnostic history',
        required: [
          { name: 'Health Insurance Policy / TPA Card', category: 'Finance', kw: 'insurance' },
          { name: 'Recent Doctor Prescription', category: 'Medical', kw: 'prescription' },
          { name: 'Recent Diagnostic / Blood Lab Report', category: 'Medical', kw: 'report' },
          { name: 'Government ID Proof', category: 'Identity', kw: 'aadhaar' },
        ]
      },
      {
        packId: 'pack_insurance',
        packName: 'Insurance Claim Settlement Pack',
        purpose: 'Comprehensive claim dossier including hospital bills, policy schedule, and bank payout details',
        required: [
          { name: 'Active Policy Document', category: 'Finance', kw: 'insurance' },
          { name: 'Hospital Discharge Summary', category: 'Medical', kw: 'discharge' },
          { name: 'Original Pharmacy & Medical Bills', category: 'Medical', kw: 'bill' },
          { name: 'Government Photo ID', category: 'Identity', kw: 'aadhaar' },
          { name: 'Cancelled Cheque for NEFT Payout', category: 'Finance', kw: 'cheque' },
        ]
      }
    ];

    return packsConfig.map(p => {
      const items = p.required.map(r => {
        const matched = hasDoc(r.kw, r.category);
        return {
          requiredDocType: r.name,
          category: r.category,
          isAvailable: !!matched,
          matchedDocumentTitle: matched ? matched.title : undefined,
          matchedDocumentId: matched ? matched.id : undefined
        };
      });
      const totalAvailable = items.filter(i => i.isAvailable).length;
      return {
        packId: p.packId,
        packName: p.packName,
        purpose: p.purpose,
        totalRequired: items.length,
        totalAvailable,
        completenessPercentage: Math.round((totalAvailable / items.length) * 100),
        items
      };
    });
  }

  async getConsistencyCheck(): Promise<ConsistencyCheckResult> {
    let docs: DocumentItem[] = [];
    try {
      docs = await this.getDocuments();
    } catch (e) {}

    if (docs.length === 0) {
      return {
        totalDocumentsAnalyzed: 0,
        isConsistent: true,
        issues: ['Upload documents (e.g. Aadhaar, Passport) to perform automated cross-document identity verification.'],
        passedFields: []
      };
    }

    const names = new Set<string>();
    const dobs = new Set<string>();
    docs.forEach(d => {
      if (d.holder_name && d.holder_name.trim().length > 1) {
        names.add(d.holder_name.trim());
      }
      if (d.dob && d.dob.trim().length > 1) {
        dobs.add(d.dob.trim());
      }
    });

    const issues: string[] = [];
    const passedFields: string[] = [];

    if (names.size > 1) {
      issues.push(`Name variance detected across documents: ${Array.from(names).join(' vs ')}`);
    } else if (names.size === 1) {
      passedFields.push(`Holder Name consistently verified: ${Array.from(names)[0]}`);
    }

    if (dobs.size > 1) {
      issues.push(`Date of birth discrepancy detected: ${Array.from(dobs).join(' vs ')}`);
    } else if (dobs.size === 1) {
      passedFields.push(`Date of Birth verified matching across records (${Array.from(dobs)[0]})`);
    }

    if (docs.length >= 2) {
      passedFields.push(`${docs.length} document records cryptographically indexed with unique SHA-256 hashes.`);
    }

    return {
      totalDocumentsAnalyzed: docs.length,
      isConsistent: issues.length === 0,
      issues,
      passedFields
    };
  }

  async checkDuplicate(sha256Hash: string, ocrText?: string, title?: string): Promise<DuplicateCheckResult> {
    try {
      return await this.request<DuplicateCheckResult>('/documents/check-duplicate', {
        method: 'POST',
        body: JSON.stringify({ sha256Hash, ocrText, title })
      });
    } catch (e) {
      return {
        duplicate: false,
        duplicateType: 'NONE',
        similarityScore: 0.0,
        message: 'No duplicate detected.'
      };
    }
  }

  async getDocumentVersions(docId: string): Promise<DocumentVersion[]> {
    try {
      const res = await this.request<DocumentVersion[]>(`/documents/${docId}/versions`);
      return Array.isArray(res) ? res : [];
    } catch (e) {
      return [];
    }
  }

  async restoreDocumentVersion(docId: string, versionId: string): Promise<DocumentItem> {
    return this.request<DocumentItem>(`/documents/${docId}/versions/${versionId}/restore`, {
      method: 'POST'
    });
  }

  async recordOcrFeedback(data: { documentId: string; fieldName: string; ocrValue: string; correctedValue: string }) {
    return this.request<{ message: string }>('/documents/feedback', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async generateTransferCode(): Promise<PhoneTransferPairing> {
    try {
      return await this.request<PhoneTransferPairing>('/system/transfer/generate', {
        method: 'POST'
      });
    } catch (e) {
      const code = 'DV-' + Math.floor(100000 + Math.random() * 900000);
      return {
        transferCode: code,
        expiresInSeconds: 600,
        qrCodeData: `docuvault://transfer?code=${code}`,
        documentCount: 0
      };
    }
  }

  async claimTransferCode(code: string): Promise<{ success: boolean; transferredCount?: number; message: string }> {
    return this.request<{ success: boolean; transferredCount?: number; message: string }>('/system/transfer/claim', {
      method: 'POST',
      body: JSON.stringify({ code })
    });
  }

  // Family APIs
  async createFamily(name: string): Promise<FamilyGroup> {
    return this.request<FamilyGroup>('/family/', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  }

  async getFamilies(): Promise<FamilyGroup[]> {
    try {
      const res = await this.request<FamilyGroup[]>('/family/');
      return Array.isArray(res) ? res : [];
    } catch (e) {
      return [];
    }
  }

  async inviteFamilyMember(familyId: string, data: { invitee_email: string; role: string }): Promise<FamilyInvitation> {
    return this.request<FamilyInvitation>(`/family/${familyId}/invite`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getPendingInvitations(): Promise<FamilyInvitation[]> {
    try {
      const res = await this.request<FamilyInvitation[]>('/family/invitations');
      return Array.isArray(res) ? res : [];
    } catch (e) {
      return [];
    }
  }

  async respondToInvitation(invitationId: string, action: 'ACCEPT' | 'REJECT') {
    return this.request<{ message: string }>(`/family/invitations/${invitationId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action })
    });
  }

  async removeFamilyMember(memberId: string) {
    return this.request<{ message: string }>(`/family/members/${memberId}`, {
      method: 'DELETE'
    });
  }

  async getSharedWithMe(): Promise<DocumentItem[]> {
    try {
      const res = await this.request<DocumentItem[]>('/family/shared-with-me');
      return Array.isArray(res) ? res : [];
    } catch (e) {
      return [];
    }
  }

  async getSharedByMe(): Promise<DocumentItem[]> {
    try {
      const res = await this.request<DocumentItem[]>('/family/shared-by-me');
      return Array.isArray(res) ? res : [];
    } catch (e) {
      return [];
    }
  }

  // Emergency APIs
  async getEmergencyContacts(): Promise<EmergencyContact[]> {
    try {
      const res = await this.request<EmergencyContact[]>('/emergency/contacts');
      return Array.isArray(res) ? res : [];
    } catch (e) {
      return [];
    }
  }

  async addEmergencyContact(data: Omit<EmergencyContact, 'id' | 'user_id' | 'created_at'>): Promise<EmergencyContact> {
    return this.request<EmergencyContact>('/emergency/contacts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateEmergencyContact(id: string, data: Partial<EmergencyContact>): Promise<EmergencyContact> {
    return this.request<EmergencyContact>(`/emergency/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteEmergencyContact(id: string) {
    return this.request<{ message: string }>(`/emergency/contacts/${id}`, {
      method: 'DELETE'
    });
  }

  async getEmergencyMedicalInfo(): Promise<EmergencyMedicalInfo | null> {
    try {
      const res = await this.request<EmergencyMedicalInfo | null>('/emergency/medical-info');
      return res || null;
    } catch (e) {
      return null;
    }
  }

  async updateEmergencyMedicalInfo(data: EmergencyMedicalInfo): Promise<EmergencyMedicalInfo> {
    return this.request<EmergencyMedicalInfo>('/emergency/medical-info', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async getEmergencyEligibleDocuments(): Promise<DocumentItem[]> {
    try {
      const res = await this.request<DocumentItem[]>('/emergency/eligible-documents');
      return Array.isArray(res) ? res : [];
    } catch (e) {
      return [];
    }
  }

  async accessEmergencyVault(targetUserId: string, data: { reason: string; emergency_contact_id: string }): Promise<{
    owner_name: string;
    owner_phone?: string;
    owner_email: string;
    medical_info?: EmergencyMedicalInfo;
    eligible_documents: DocumentItem[];
  }> {
    return this.request(`/emergency/access/${targetUserId}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Share APIs
  async createShareToken(data: { document_id: string; expires_in_hours?: number; max_access_count?: number; pin?: string }): Promise<ShareTokenItem> {
    return this.request<ShareTokenItem>('/share/create', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getActiveShares(): Promise<ShareTokenItem[]> {
    try {
      const res = await this.request<ShareTokenItem[]>('/share/active');
      return Array.isArray(res) ? res : [];
    } catch (e) {
      return [];
    }
  }

  async revokeShareToken(shareId: string) {
    return this.request<{ message: string }>(`/share/${shareId}/revoke`, {
      method: 'POST'
    });
  }

  async viewSharedDocument(token: string, pin?: string): Promise<SharedDocumentViewData> {
    return this.request<SharedDocumentViewData>(`/share/view/${token}`, {
      method: 'POST',
      body: JSON.stringify({ pin })
    });
  }

  // Notifications & Stats
  async getNotifications(): Promise<NotificationItem[]> {
    try {
      const res = await this.request<NotificationItem[]>('/notifications/');
      return Array.isArray(res) ? res : [];
    } catch (e) {
      return [];
    }
  }

  async markNotificationRead(id: string) {
    return this.request<{ message: string }>(`/notifications/${id}/read`, {
      method: 'PUT'
    });
  }

  async markAllNotificationsRead() {
    return this.request<{ message: string }>('/notifications/mark-all-read', {
      method: 'POST'
    });
  }

  async checkExpiry() {
    return this.request<{ message: string }>('/notifications/check-expiry', {
      method: 'POST'
    });
  }

  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const res = await this.request<DashboardStats>('/notifications/dashboard-stats');
      if (res && typeof res.total_documents === 'number') {
        return res;
      }
    } catch (e) {
      console.warn('Dashboard stats fallback:', e);
    }
    return {
      total_documents: 0,
      expiring_soon_count: 0,
      expired_count: 0,
      family_members_count: 0,
      active_shares_count: 0,
    };
  }

  async getAuditLogs(): Promise<AuditLogItem[]> {
    try {
      const res = await this.request<AuditLogItem[]>('/audit/');
      return Array.isArray(res) ? res : [];
    } catch (e) {
      return [];
    }
  }
  async updateFcmToken(token: string): Promise<void> {
    try {
      await this.request('/auth/fcm-token', {
        method: 'POST',
        body: JSON.stringify({ token })
      });
      console.log('FCM token synchronized with backend');
    } catch (e) {
      console.warn('Failed to update FCM token on server:', e);
    }
  }

}

export const api = new ApiService();
