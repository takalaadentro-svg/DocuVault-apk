import React, { useState, useRef } from 'react';
import { 
  X, UploadCloud, FileText, CheckCircle2, AlertCircle, Sparkles, 
  ShieldAlert, Lock, Users, Dna, ScanLine, Loader2, Camera, RefreshCw, 
  AlertTriangle, Check, ShieldCheck, ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { OCRExtractResult, DuplicateCheckResult } from '../types';
import { showLocalNotification } from '../services/pushNotifications';
import { previewCache } from '../services/previewCache';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (uploadedTitle?: string) => void;
}

const CATEGORIES = [
  'Identity',
  'Education',
  'Medical',
  'Finance',
  'Travel',
  'Employment',
  'Property',
  'Other'
];

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { colors } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Identity');
  const [subtype, setSubtype] = useState('');
  const [issuer, setIssuer] = useState('');
  const [holderName, setHolderName] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [dob, setDob] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [folder, setFolder] = useState('General');
  const [isEmergencyEligible, setIsEmergencyEligible] = useState(false);
  const [isFamilyVault, setIsFamilyVault] = useState(false);
  const [isOfflineAvailable, setIsOfflineAvailable] = useState(true);

  // OCR & Quality Assessment states
  const [isOcrScanning, setIsOcrScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRExtractResult | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateCheckResult | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProcessFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setOcrResult(null);
    setDuplicateWarning(null);

    // Auto-generate clean title
    const cleanName = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    const autoTitle = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    setTitle(autoTitle);

    // Trigger Smart OCR & Quality Scanning
    setIsOcrScanning(true);
    setErrorMessage(null);
    try {
      const result = await api.ocrExtract(selectedFile);
      setOcrResult(result);

      if (result.suggested_category && result.suggested_category !== 'Other') {
        setCategory(result.suggested_category);
      }
      if (result.subtype) setSubtype(result.subtype);
      if (result.holder_name) setHolderName(result.holder_name);
      if (result.doc_number) setDocNumber(result.doc_number);
      if (result.dob) setDob(result.dob);
      if (result.issue_date) setIssueDate(result.issue_date);
      if (result.expiry_date) setExpiryDate(result.expiry_date);

      // Check for duplicates
      if (result.sha256_hash) {
        const dupCheck = await api.checkDuplicate(result.sha256_hash, result.extracted_text, autoTitle);
        if (dupCheck.duplicate) {
          setDuplicateWarning(dupCheck);
        }
      }
    } catch (err: any) {
      console.warn('OCR Auto-scan note:', err);
    } finally {
      setIsOcrScanning(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleRetake = () => {
    setFile(null);
    setOcrResult(null);
    setDuplicateWarning(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    setTimeout(() => {
      cameraInputRef.current?.click();
    }, 150);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage('Please select or capture a document file');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Document title is required');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      formData.append('category', category);
      if (subtype.trim()) formData.append('subtype', subtype.trim());
      if (issuer.trim()) formData.append('issuer', issuer.trim());
      if (holderName.trim()) formData.append('holder_name', holderName.trim());
      if (docNumber.trim()) formData.append('doc_number', docNumber.trim());
      if (dob.trim()) formData.append('dob', dob.trim());
      if (issueDate) formData.append('issue_date', issueDate);
      if (expiryDate) formData.append('expiry_date', expiryDate);
      if (notes.trim()) formData.append('notes', notes.trim());
      if (folder.trim()) formData.append('folder', folder.trim());
      formData.append('is_emergency_eligible', String(isEmergencyEligible));
      formData.append('is_family_vault', String(isFamilyVault));
      formData.append('is_offline_available', String(isOfflineAvailable));
      if (ocrResult?.extracted_text) formData.append('ocr_text', ocrResult.extracted_text);

      const savedDoc = await api.uploadDocument(formData);

      // Cache file for instant 0ms preview rendering
      if (savedDoc?.id && file) {
        try {
          previewCache.storeBlob(savedDoc.id, file, file.type);
        } catch (cacheErr) {
          console.warn('Could not cache uploaded file for preview:', cacheErr);
        }
      }

      // Record feedback if fields were corrected
      if (ocrResult && savedDoc?.id) {
        if (ocrResult.holder_name && holderName !== ocrResult.holder_name) {
          api.recordOcrFeedback({
            documentId: savedDoc.id,
            fieldName: 'holderName',
            ocrValue: ocrResult.holder_name,
            correctedValue: holderName
          }).catch(() => {});
        }
        if (ocrResult.doc_number && docNumber !== ocrResult.doc_number) {
          api.recordOcrFeedback({
            documentId: savedDoc.id,
            fieldName: 'docNumber',
            ocrValue: ocrResult.doc_number,
            correctedValue: docNumber
          }).catch(() => {});
        }
      }

      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 }
      });

      const docTitle = title.trim() || 'Document';
      showLocalNotification('DocuVault Secure Vault', `File "${docTitle}" successfully uploaded to your vault.`);

      onSuccess(docTitle);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload document');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: 16,
    }}>
      <div style={{
        backgroundColor: colors.surface,
        borderRadius: 22,
        border: `1px solid ${colors.surfaceBorder}`,
        width: '100%',
        maxWidth: 560,
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Modal Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 24px',
          borderBottom: `1px solid ${colors.surfaceBorder}`,
          background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(30, 58, 138, 0.08) 100%)',
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: colors.text, margin: 0 }}>
              Smart Document Scanner & Upload
            </h2>
            <p style={{ fontSize: 12, color: colors.textMuted, margin: '2px 0 0 0' }}>
              EasyOCR Structured Extraction • SHA-256 Tamper Proofing
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: colors.textMuted,
              cursor: 'pointer',
              padding: 6,
              borderRadius: 8,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {errorMessage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: 12,
              borderRadius: 12,
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: colors.danger,
              fontSize: 13,
            }}>
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* File Picker / Camera Buttons */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,application/pdf"
              style={{ display: 'none' }}
            />
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleFileChange}
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
            />

            {!file ? (
              <div style={{ display: 'flex', gap: 12 }}>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    flex: 1,
                    border: `2px dashed ${colors.surfaceBorder}`,
                    borderRadius: 16,
                    padding: 24,
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <UploadCloud size={32} color={colors.accentLight} style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>Import Image or PDF</div>
                  <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>Select from device files</div>
                </div>

                <div
                  onClick={() => cameraInputRef.current?.click()}
                  style={{
                    flex: 1,
                    border: `2px dashed ${colors.accentLight}`,
                    borderRadius: 16,
                    padding: 24,
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: 'rgba(13, 148, 136, 0.05)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <Camera size={32} color={colors.accentLight} style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: colors.accentLight }}>Camera Scan</div>
                  <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>Capture physical document</div>
                </div>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 14,
                borderRadius: 14,
                backgroundColor: 'rgba(13, 148, 136, 0.1)',
                border: `1px solid ${colors.accentLight}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FileText size={22} color={colors.accentLight} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>{file.name}</div>
                    <div style={{ fontSize: 11, color: colors.textMuted }}>
                      {(file.size / 1024).toFixed(1)} KB • {isOcrScanning ? 'Analyzing Scan Quality & OCR...' : 'Scan Complete'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRetake}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: colors.accentLight,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <RefreshCw size={13} />
                  <span>Retake</span>
                </button>
              </div>
            )}
          </div>

          {/* Quality Assessment & Blur Warning */}
          {ocrResult?.is_blurred && (
            <div style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid #F59E0B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={18} color="#F59E0B" />
                <div style={{ fontSize: 12, color: colors.text }}>
                  <b>Blurry scan detected:</b> Text edges may be unclear. Would you like to retake for higher OCR accuracy?
                </div>
              </div>
              <button
                type="button"
                onClick={handleRetake}
                style={{
                  padding: '4px 10px',
                  borderRadius: 8,
                  backgroundColor: '#F59E0B',
                  color: '#FFF',
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Retake
              </button>
            </div>
          )}

          {/* Potential Duplicate Warning */}
          {duplicateWarning && (
            <div style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${colors.danger}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <ShieldAlert size={18} color={colors.danger} />
                <div style={{ fontSize: 13, fontWeight: 700, color: colors.danger }}>
                  Potential Duplicate Match ({duplicateWarning.duplicateType})
                </div>
              </div>
              <div style={{ fontSize: 12, color: colors.text }}>
                {duplicateWarning.message}
              </div>
            </div>
          )}

          {/* Smart OCR Fields Card */}
          {ocrResult && (
            <div style={{
              padding: 14,
              borderRadius: 14,
              backgroundColor: 'rgba(13, 148, 136, 0.06)',
              border: `1px solid ${colors.surfaceBorder}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={16} color={colors.accentLight} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: colors.text }}>
                    Structured OCR Intelligence (Confidence: {Math.round(ocrResult.confidence * 100)}%)
                  </span>
                </div>
                <span style={{ fontSize: 11, color: colors.success, fontWeight: 700 }}>
                  ✓ Review & Edit
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: colors.textMuted }}>Document Holder Name</label>
                  <input
                    type="text"
                    value={holderName}
                    onChange={e => setHolderName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      backgroundColor: colors.bg,
                      border: `1px solid ${colors.surfaceBorder}`,
                      color: colors.text,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: colors.textMuted }}>Document Number / ID</label>
                  <input
                    type="text"
                    value={docNumber}
                    onChange={e => setDocNumber(e.target.value)}
                    placeholder="e.g. Z1234567 or 12-digit Aadhaar"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      backgroundColor: colors.bg,
                      border: `1px solid ${colors.surfaceBorder}`,
                      color: colors.text,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: colors.textMuted }}>Date of Birth (DOB)</label>
                  <input
                    type="text"
                    value={dob}
                    onChange={e => setDob(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      backgroundColor: colors.bg,
                      border: `1px solid ${colors.surfaceBorder}`,
                      color: colors.text,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: colors.textMuted }}>Document Subtype</label>
                  <input
                    type="text"
                    value={subtype}
                    onChange={e => setSubtype(e.target.value)}
                    placeholder="e.g. Passport, Degree"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      backgroundColor: colors.bg,
                      border: `1px solid ${colors.surfaceBorder}`,
                      color: colors.text,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Basic Fields */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>Document Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Passport, Degree Marksheet"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 10,
                backgroundColor: colors.bg,
                border: `1px solid ${colors.surfaceBorder}`,
                color: colors.text,
                fontSize: 14,
                marginTop: 4,
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>Category (8 Core) *</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  backgroundColor: colors.bg,
                  border: `1px solid ${colors.surfaceBorder}`,
                  color: colors.text,
                  fontSize: 14,
                  marginTop: 4,
                  outline: 'none',
                }}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>Issuer Authority</label>
              <input
                type="text"
                value={issuer}
                onChange={e => setIssuer(e.target.value)}
                placeholder="e.g. MEA, UIDAI, University"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  backgroundColor: colors.bg,
                  border: `1px solid ${colors.surfaceBorder}`,
                  color: colors.text,
                  fontSize: 14,
                  marginTop: 4,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>Issue Date</label>
              <input
                type="date"
                value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  backgroundColor: colors.bg,
                  border: `1px solid ${colors.surfaceBorder}`,
                  color: colors.text,
                  fontSize: 13,
                  marginTop: 4,
                  outline: 'none',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>Expiry Date (Renewal)</label>
              <input
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 10,
                  backgroundColor: colors.bg,
                  border: `1px solid ${colors.surfaceBorder}`,
                  color: colors.text,
                  fontSize: 13,
                  marginTop: 4,
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Vault Settings Toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              fontSize: 13,
              color: colors.text,
            }}>
              <input
                type="checkbox"
                checked={isEmergencyEligible}
                onChange={e => setIsEmergencyEligible(e.target.checked)}
              />
              <span>Include in Emergency Break-Glass Vault</span>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              fontSize: 13,
              color: colors.text,
            }}>
              <input
                type="checkbox"
                checked={isFamilyVault}
                onChange={e => setIsFamilyVault(e.target.checked)}
              />
              <span>Share with Family Vault Members</span>
            </label>

            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              cursor: 'pointer',
              fontSize: 13,
              color: colors.text,
            }}>
              <input
                type="checkbox"
                checked={isOfflineAvailable}
                onChange={e => setIsOfflineAvailable(e.target.checked)}
              />
              <span>Keep Encrypted Copy Available Offline on Mobile</span>
            </label>
          </div>

          {/* Submit Button */}
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px 18px',
                borderRadius: 12,
                backgroundColor: colors.bg,
                border: `1px solid ${colors.surfaceBorder}`,
                color: colors.textMuted,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || isOcrScanning}
              style={{
                flex: 2,
                padding: '12px 18px',
                borderRadius: 12,
                backgroundColor: colors.accent,
                color: '#FFF',
                border: 'none',
                fontSize: 14,
                fontWeight: 700,
                cursor: isLoading || isOcrScanning ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Saving Encrypted Record...</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Save to Secure Vault</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
