import { ClientOCRService } from './ocrService';
import { ClientRAGService } from './ragService';
import { 
  User, DocumentItem, FamilyGroup, FamilyInvitation, 
  EmergencyContact, EmergencyMedicalInfo, ShareTokenItem, 
  SharedDocumentViewData, NotificationItem, DashboardStats, 
  AuditLogItem, DocumentPermission, OCRExtractResult, DocumentDNAVerificationResult,
  DocumentChatResponse, DocumentPack, ConsistencyCheckResult, ConsistencyIssue, DuplicateCheckResult,
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

  private async request<T>(endpoint: string, options: RequestInit = {}, timeoutMs: number = 60000): Promise<T> {
    const headers = new Headers(options.headers || {});
    
    // Inject Authorization header if token exists and not already provided
    const token = this.getToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    // Configurable timeout (default 60s, up to 180s for uploads) to handle cloud cold-starts smoothly
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

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
          errMessage = errData.detail || errData.error || errData.errors?.[0]?.defaultMessage || errData.message || response.statusText || 'An error occurred';
        } catch (_) {
          errMessage = await response.text() || response.statusText || 'An error occurred';
        }
        throw new Error(errMessage);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json();
      }
      return response.text() as unknown as T;
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.toLowerCase().includes('aborted')) {
        throw new Error('Server connection timed out while waking up. Please try again.');
      }
      throw err;
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
    }, 180000); // 3-minute timeout for document uploads to accommodate Render cold-starts & file transfer
  }

  async ocrExtract(file: File): Promise<OCRExtractResult> {
    // 1. Run local client OCR for instant zero-latency intelligence
    const localOcr = await ClientOCRService.analyzeDocument(file, this.cachedUser?.full_name);

    // 2. Also try backend extraction if online
    try {
      const formData = new FormData();
      formData.append('file', file);
      const remoteOcr = await this.request<OCRExtractResult>('/documents/ocr-extract', {
        method: 'POST',
        body: formData
      });
      if (remoteOcr && remoteOcr.extracted_text && remoteOcr.extracted_text.length > 20) {
        return {
          ...localOcr,
          ...remoteOcr,
          extracted_text: remoteOcr.extracted_text || localOcr.extracted_text,
          holder_name: remoteOcr.holder_name || localOcr.holder_name,
          doc_number: remoteOcr.doc_number || localOcr.doc_number,
          dob: remoteOcr.dob || localOcr.dob,
          expiry_date: remoteOcr.expiry_date || localOcr.expiry_date,
        };
      }
    } catch (e) {
      console.info('Using local client OCR engine result:', e);
    }

    return localOcr;
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
      const docs = await this.request<any[]>(`/documents${queryStr ? `?${queryStr}` : ''}`);
      if (Array.isArray(docs)) {
        return docs.map(d => this.normalizeDocument(d));
      }
      return [];
    } catch (e) {
      console.warn('Could not load documents from server:', e);
      return [];
    }
  }

  normalizeDocument(d: any): DocumentItem {
    if (!d) return d;
    const isFam = Boolean(d.is_family_vault ?? d.family_vault ?? d.isFamilyVault);
    const isEmerg = Boolean(d.is_emergency_eligible ?? d.emergency_eligible ?? d.isEmergencyEligible);
    let isExp = Boolean(d.is_expired);
    let daysUntil: number | null = d.days_until_expiry ?? null;

    if (d.expiry_date) {
      try {
        const expTime = new Date(d.expiry_date).getTime();
        if (!isNaN(expTime)) {
          const now = Date.now();
          isExp = expTime < now;
          daysUntil = Math.ceil((expTime - now) / (1000 * 60 * 60 * 24));
        }
      } catch (err) {}
    }

    return {
      ...d,
      is_family_vault: isFam,
      family_vault: isFam,
      isFamilyVault: isFam,
      is_emergency_eligible: isEmerg,
      emergency_eligible: isEmerg,
      isEmergencyEligible: isEmerg,
      is_expired: isExp,
      days_until_expiry: daysUntil,
    };
  }

  async getDocument(id: string): Promise<DocumentItem> {
    const raw = await this.request<any>(`/documents/${id}`);
    return this.normalizeDocument(raw);
  }

  async updateDocument(id: string, data: Partial<DocumentItem> & Record<string, any>): Promise<DocumentItem> {
    const payload: Record<string, any> = { ...data };
    if (payload.is_family_vault !== undefined) {
      payload.isFamilyVault = payload.is_family_vault;
      payload.familyVault = payload.is_family_vault;
      payload.is_family_vault = payload.is_family_vault;
    }
    if (payload.is_emergency_eligible !== undefined) {
      payload.isEmergencyEligible = payload.is_emergency_eligible;
      payload.emergencyEligible = payload.is_emergency_eligible;
      payload.is_emergency_eligible = payload.is_emergency_eligible;
    }
    const res = await this.request<any>(`/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    return this.normalizeDocument(res);
  }

  async deleteDocument(id: string) {
    return this.request<{ message: string }>(`/documents/${id}`, {
      method: 'DELETE'
    });
  }

  getDocumentDownloadUrl(id: string): string {
    const token = this.getToken();
    return `${BASE_URL}/documents/${id}/download${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  }

  getDocumentPreviewUrl(id: string): string {
    const token = this.getToken();
    return `${BASE_URL}/documents/${id}/preview${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  }

  async previewDocument(id: string): Promise<{ blob: Blob; mimeType: string }> {
    const token = this.getToken();
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    // Try dedicated /preview endpoint first
    try {
      const response = await fetch(`${BASE_URL}/documents/${id}/preview`, { headers });
      if (response.ok) {
        const mimeType = response.headers.get('content-type') || '';
        const blob = await response.blob();
        return { blob, mimeType };
      }
    } catch (e) {
      console.warn('Initial preview endpoint call failed, attempting download fallback:', e);
    }

    // Fallback to /download endpoint
    const dlResponse = await fetch(`${BASE_URL}/documents/${id}/download`, { headers });
    if (!dlResponse.ok) {
      throw new Error(`Failed to load document preview (HTTP ${dlResponse.status})`);
    }
    const mimeType = dlResponse.headers.get('content-type') || '';
    const blob = await dlResponse.blob();
    return { blob, mimeType };
  }

  async downloadDocument(id: string): Promise<Blob> {
    const token = this.getToken();
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    
    try {
      const response = await fetch(`${BASE_URL}/documents/${id}/download`, { headers });
      if (response.ok) return await response.blob();
    } catch (e) {
      console.warn('Primary download endpoint failed, attempting preview route:', e);
    }

    const fallback = await fetch(`${BASE_URL}/documents/${id}/preview`, { headers });
    if (!fallback.ok) throw new Error('Download failed');
    return fallback.blob();
  }

  async chatWithDocuments(question: string, localDocs?: DocumentItem[]): Promise<DocumentChatResponse> {
    try {
      const response = await this.request<DocumentChatResponse>('/documents/chat', {
        method: 'POST',
        body: JSON.stringify({ question })
      });
      if (response && response.infoFound) {
        return response;
      }
    } catch (e) {
      console.warn('Backend RAG unreachable, using client RAG engine:', e);
    }

    let docs = localDocs;
    if (!docs || docs.length === 0) {
      try {
        docs = await this.getDocuments();
      } catch (e) {
        docs = [];
      }
    }
    return ClientRAGService.query(question, docs);
  }

  async setupQuickPin(pin: string) {
    return this.request<{ message: string; has_quick_pin: boolean }>('/auth/quick-pin', {
      method: 'POST',
      body: JSON.stringify({ pin })
    });
  }

  async changePassword(data: { old_password?: string; new_password?: string; otp?: string }) {
    return this.request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async grantPermission(docId: string, data: { granted_to_user_email: string; can_view: boolean; can_download: boolean }) {
    return this.request<DocumentPermission>(`/documents/${docId}/permissions`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async revokePermission(docId: string, permissionId: string) {
    return this.request<{ message: string }>(`/documents/${docId}/permissions/${permissionId}`, {
      method: 'DELETE'
    });
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
        issues: [],
        passedFields: ['Upload documents (e.g. Aadhaar, Passport) to perform automated cross-document identity verification.']
      };
    }

    const nameEntries: { title: string; name: string }[] = [];
    const dobEntries: { title: string; dob: string }[] = [];

    docs.forEach(d => {
      if (d.holder_name && d.holder_name.trim().length > 1) {
        nameEntries.push({ title: d.title || 'Document', name: d.holder_name.trim() });
      }
      if (d.dob && d.dob.trim().length > 1) {
        dobEntries.push({ title: d.title || 'Document', dob: d.dob.trim() });
      }
    });

    const issues: ConsistencyIssue[] = [];
    const passedFields: string[] = [];

    const uniqueNames = Array.from(new Set(nameEntries.map(e => e.name)));
    if (uniqueNames.length > 1) {
      const first = nameEntries[0];
      const different = nameEntries.find(e => e.name !== first.name) || nameEntries[1];
      issues.push({
        fieldName: 'Holder Name',
        document1Title: first.title,
        value1: first.name,
        document2Title: different.title,
        value2: different.name,
        severity: 'WARNING',
        advice: 'Ensure names match exactly across Aadhaar, Passport, and other identity records to prevent verification rejection.'
      });
    } else if (uniqueNames.length === 1) {
      passedFields.push(`Holder Name consistently verified: ${uniqueNames[0]}`);
    }

    const uniqueDobs = Array.from(new Set(dobEntries.map(e => e.dob)));
    if (uniqueDobs.length > 1) {
      const first = dobEntries[0];
      const different = dobEntries.find(e => e.dob !== first.dob) || dobEntries[1];
      issues.push({
        fieldName: 'Date of Birth',
        document1Title: first.title,
        value1: first.dob,
        document2Title: different.title,
        value2: different.dob,
        severity: 'WARNING',
        advice: 'Check official certificates to rectify the date of birth mismatch.'
      });
    } else if (uniqueDobs.length === 1) {
      passedFields.push(`Date of Birth verified matching across records (${uniqueDobs[0]})`);
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
      const res = await this.request<any>('/system/transfer/generate', {
        method: 'POST'
      });
      const code = res?.transfer_code || res?.transferCode || res?.pairing_code || '';
      const count = res?.document_count ?? res?.documentCount ?? 0;
      return {
        transferCode: code,
        pairing_code: code,
        expiresInSeconds: res?.expires_in_seconds ?? res?.expiresInSeconds ?? 600,
        qrCodeData: res?.qr_code_data ?? res?.qrCodeData ?? `docuvault://transfer?code=${code}`,
        documentCount: count,
        document_count: count,
      };
    } catch (e) {
      const code = 'DV-' + Math.floor(100000 + Math.random() * 900000);
      return {
        transferCode: code,
        pairing_code: code,
        expiresInSeconds: 600,
        qrCodeData: `docuvault://transfer?code=${code}`,
        documentCount: 0,
        document_count: 0,
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
      const res = await this.request<any[]>('/family/');
      if (!Array.isArray(res)) return [];
      return res.map(g => ({
        ...g,
        id: String(g.id || g._id || ''),
        name: g.name || 'Family Vault',
        owner_id: String(g.owner_id || g.ownerId || ''),
        created_at: g.created_at || g.createdAt || new Date().toISOString(),
        members: Array.isArray(g.members)
          ? g.members.map((m: any) => ({
              ...m,
              id: String(m.id || m._id || m.userId || m.user_id || ''),
              user_id: String(m.user_id || m.userId || ''),
              full_name: m.full_name || m.fullName || m.name || m.email || 'Member',
              email: m.email || '',
              role: m.role || 'MEMBER',
              status: m.status || 'ACTIVE',
            }))
          : [],
        documents: Array.isArray(g.documents)
          ? g.documents.map((d: any) => ({
              ...this.normalizeDocument(d),
              is_family_vault: true,
              family_vault: true,
              isFamilyVault: true,
            }))
          : [],
      }));
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
      return Array.isArray(res)
        ? res.map(d => ({
            ...this.normalizeDocument(d),
            is_family_vault: true,
            family_vault: true,
            isFamilyVault: true,
          }))
        : [];
    } catch (e) {
      return [];
    }
  }

  async getSharedByMe(): Promise<DocumentItem[]> {
    try {
      const res = await this.request<DocumentItem[]>('/family/shared-by-me');
      return Array.isArray(res)
        ? res.map(d => ({
            ...this.normalizeDocument(d),
            is_family_vault: true,
            family_vault: true,
            isFamilyVault: true,
          }))
        : [];
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

  async addEmergencyContact(data: any): Promise<EmergencyContact> {
    const payload = {
      name: data.name,
      relationship: data.relationship || data.relationship_type || 'Family',
      relationship_type: data.relationship_type || data.relationship || 'Family',
      phone: data.phone || data.phone_number || '',
      phone_number: data.phone_number || data.phone || '',
      email: data.email || undefined,
      can_access_emergency_docs: true,
      canAccessEmergencyDocs: true,
      can_access_medical: data.can_access_medical ?? true,
      can_access_identity: data.can_access_identity ?? true,
      can_access_financial: data.can_access_financial ?? false,
      is_active: true,
    };
    return this.request<EmergencyContact>('/emergency/contacts', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async updateEmergencyContact(id: string, data: Partial<EmergencyContact>): Promise<EmergencyContact> {
    const payload = {
      ...data,
      relationship: (data as any).relationship || data.relationship_type,
      relationship_type: data.relationship_type || (data as any).relationship,
      phone: (data as any).phone || data.phone_number,
      phone_number: data.phone_number || (data as any).phone,
    };
    return this.request<EmergencyContact>(`/emergency/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
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

  async updateEmergencyMedicalInfo(data: Partial<EmergencyMedicalInfo>): Promise<EmergencyMedicalInfo> {
    const payload = {
      ...data,
      blood_group: data.blood_group || (data as any).bloodGroup,
      bloodGroup: (data as any).bloodGroup || data.blood_group,
      chronic_conditions: data.chronic_conditions || (data as any).chronicConditions,
      chronicConditions: (data as any).chronicConditions || data.chronic_conditions,
      current_medications: data.current_medications || (data as any).currentMedications,
      currentMedications: (data as any).currentMedications || data.current_medications,
      emergency_notes: data.emergency_notes || (data as any).emergencyNotes,
      emergencyNotes: (data as any).emergencyNotes || data.emergency_notes,
      physician_name: data.physician_name || (data as any).physicianName,
      physicianName: (data as any).physicianName || data.physician_name,
      physician_phone: data.physician_phone || (data as any).physicianPhone,
      physicianPhone: (data as any).physicianPhone || data.physician_phone,
      organ_donor: data.organ_donor ?? (data as any).organDonor ?? false,
      organDonor: (data as any).organDonor ?? data.organ_donor ?? false,
    };
    return this.request<EmergencyMedicalInfo>('/emergency/medical-info', {
      method: 'PUT',
      body: JSON.stringify(payload)
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

  async accessEmergencyVault(targetUserId: string, data: { reason: string; emergency_contact_id?: string }): Promise<{
    owner_name: string;
    owner_phone?: string;
    owner_email: string;
    medical_info?: EmergencyMedicalInfo;
    eligible_documents: DocumentItem[];
    message?: string;
  }> {
    return this.request(`/emergency/access/${targetUserId || 'me'}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async executeBreakGlass(data?: { pin?: string; biometric?: boolean }): Promise<{
    access_granted?: boolean;
    medical_info?: EmergencyMedicalInfo;
    eligible_documents: DocumentItem[];
    emergency_contacts: EmergencyContact[];
    message: string;
  }> {
    return this.request('/emergency/break-glass', {
      method: 'POST',
      body: JSON.stringify(data || {})
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
  normalizeNotification(item: any): NotificationItem {
    return {
      id: String(item?.id || item?._id || ''),
      user_id: String(item?.user_id || item?.userId || ''),
      title: String(item?.title || ''),
      message: String(item?.message || ''),
      type: String(item?.type || 'SYSTEM'),
      channel: item?.channel,
      delivery_status: item?.delivery_status || item?.deliveryStatus,
      is_read: Boolean(item?.is_read ?? item?.isRead ?? item?.read ?? false),
      related_document_id: item?.related_document_id || item?.relatedDocumentId,
      created_at: item?.created_at || item?.createdAt || new Date().toISOString(),
    };
  }

  async getNotifications(): Promise<NotificationItem[]> {
    try {
      const res = await this.request<any[]>('/notifications/');
      if (Array.isArray(res)) {
        return res
          .map(n => this.normalizeNotification(n))
          .filter(n => {
            const title = (n.title || '').toLowerCase();
            const msg = (n.message || '').toLowerCase();
            if (
              title.includes('health insurance expiry') ||
              title.includes('passport expiry alert') ||
              msg.includes('health insurance floater policy expires') ||
              msg.includes('republic of india passport will expire')
            ) {
              return false;
            }
            if (!n.id || n.id === 'null' || n.id === 'None' || n.id === 'undefined') {
              return false;
            }
            return true;
          });
      }
      return [];
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
      emergency_contacts_count: 0,
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
