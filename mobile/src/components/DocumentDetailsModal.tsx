import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { showLocalNotification } from '../services/pushNotifications';
import React, { useState, useEffect } from 'react';
import { 
  X, Download, QrCode, Trash2, Edit3, ShieldAlert, 
  Calendar, Building, FileText, Check, AlertTriangle, Eye, Share2, Users,
  Dna, ScanLine, Copy, CheckCircle2, ShieldCheck, Loader2, Lock, History, Wifi, Smartphone, RotateCcw,
  ZoomIn, ZoomOut, RefreshCw, ExternalLink
} from 'lucide-react';
import { DocumentItem, DocumentDNAVerificationResult, DocumentVersion } from '../types';
import { api } from '../services/api';
import { previewCache } from '../services/previewCache';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { PDFPreviewViewer } from './PDFPreviewViewer';

interface DocumentDetailsModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onOpenQRShare: (doc: DocumentItem) => void;
}

export const DocumentDetailsModal: React.FC<DocumentDetailsModalProps> = ({
  document: doc,
  isOpen,
  onClose,
  onRefresh,
  onOpenQRShare,
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'preview' | 'details' | 'ocr' | 'dna' | 'versions' | 'permissions'>('preview');

  const isOwner = React.useMemo(() => {
    if (!doc || !user) return false;
    const docUid = String(doc.user_id || (doc as any).userId || (doc as any).owner_id || (doc as any).ownerId || '');
    const currentUid = String(user.id || '');
    return Boolean(docUid && currentUid && docUid === currentUid);
  }, [doc, user]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  // DNA verification & OCR state
  const [dnaResult, setDnaResult] = useState<DocumentDNAVerificationResult | null>(null);
  const [isVerifyingDna, setIsVerifyingDna] = useState(false);
  const [isCopiedOcr, setIsCopiedOcr] = useState(false);

  // Version History & Offline state
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [isOffline, setIsOffline] = useState(doc?.is_offline_available ?? true);
  const [isFamilyLocker, setIsFamilyLocker] = useState(
    Boolean(doc?.is_family_vault ?? (doc as any)?.family_vault ?? (doc as any)?.isFamilyVault)
  );
  const [isTogglingFamily, setIsTogglingFamily] = useState(false);

  // Authenticated blob preview & download state
  const [blobPreview, setBlobPreview] = useState<string | null>(() => {
    return doc?.id ? previewCache.get(doc.id)?.url || null : null;
  });
  const [detectedMime, setDetectedMime] = useState<string | null>(() => {
    return doc?.id ? previewCache.get(doc.id)?.mimeType || null : null;
  });
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [pdfNativeOpening, setPdfNativeOpening] = useState(false);

  const fetchPreviewBlob = async (forceRefresh = false) => {
    if (!doc || !doc.id) return;

    if (!forceRefresh) {
      const cached = previewCache.get(doc.id);
      if (cached && cached.url) {
        setBlobPreview(cached.url);
        setDetectedMime(cached.mimeType || null);
        setPreviewError(null);
        setIsLoadingPreview(false);
        return;
      }
    }

    setIsLoadingPreview(true);
    setPreviewError(null);

    try {
      const result = await api.previewDocument(doc.id);
      const url = previewCache.storeBlob(doc.id, result.blob, result.mimeType);
      setBlobPreview(url);
      setDetectedMime(result.mimeType);
      setPreviewError(null);
    } catch (err: any) {
      console.warn('Could not fetch preview blob:', err);
      // Fallback: try download endpoint
      try {
        const dlBlob = await api.downloadDocument(doc.id);
        const url = previewCache.storeBlob(doc.id, dlBlob, dlBlob.type);
        setBlobPreview(url);
        setDetectedMime(dlBlob.type);
        setPreviewError(null);
      } catch (fallbackErr: any) {
        console.warn('Fallback download attempt also failed:', fallbackErr);
        if (!blobPreview) {
          setPreviewError(err?.message || 'Document preview is temporarily unavailable. Click retry below.');
        }
      }
    } finally {
      setIsLoadingPreview(false);
    }
  };

  useEffect(() => {
    if (isOpen && doc && doc.id) {
      const cached = previewCache.get(doc.id);
      if (cached && cached.url) {
        setBlobPreview(cached.url);
        setDetectedMime(cached.mimeType || null);
        setPreviewError(null);
        setIsLoadingPreview(false);
      } else {
        fetchPreviewBlob(false);
      }
    } else {
      setBlobPreview(null);
      setDetectedMime(null);
      setPreviewError(null);
      setIsZoomed(false);
    }
  }, [isOpen, doc?.id]);

  const handleOpenInNativeViewer = async () => {
    if (!doc) return;
    setPdfNativeOpening(true);
    try {
      let blob: Blob | undefined = previewCache.get(doc.id)?.blob;
      if (!blob) {
        const res = await api.previewDocument(doc.id);
        blob = res.blob;
        previewCache.storeBlob(doc.id, res.blob, res.mimeType);
      }
      
      const cleanTitle = (doc.title || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
      const filename = doc.original_filename || `${cleanTitle}.pdf`;

      if (Capacitor.isNativePlatform()) {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          try {
            const base64Data = (reader.result as string).split(',')[1];
            const savedFile = await Filesystem.writeFile({
              path: filename,
              data: base64Data,
              directory: Directory.Cache,
              recursive: true,
            });
            const canShare = await Share.canShare().then(s => s.value).catch(() => false);
            if (canShare) {
              await Share.share({
                title: doc.title || 'DocuVault Document',
                text: `Opening ${filename}`,
                url: savedFile.uri,
                dialogTitle: 'Open PDF Document',
              });
            } else {
              alert(`Document ready in device cache: ${savedFile.uri}`);
            }
          } catch (e: any) {
            alert('Could not open system viewer: ' + (e?.message || e));
          } finally {
            setPdfNativeOpening(false);
          }
        };
      } else {
        const url = previewCache.get(doc.id)?.url || URL.createObjectURL(blob);
        window.open(url, '_blank');
        setPdfNativeOpening(false);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to open document');
      setPdfNativeOpening(false);
    }
  };

  const handleDownload = async () => {
    if (!doc || isDownloading) return;
    setIsDownloading(true);
    try {
      // Reuse cached blob if already in memory
      let blob: Blob | undefined = previewCache.get(doc.id)?.blob;
      if (!blob) {
        blob = await api.downloadDocument(doc.id);
        previewCache.storeBlob(doc.id, blob, blob.type);
      }
      const cleanTitle = (doc.title || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
      const filename = doc.original_filename || `${cleanTitle}.pdf`;

      if (Capacitor.isNativePlatform()) {
        // Native Android Download: Convert Blob to base64 & save using Filesystem
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          try {
            const base64Data = (reader.result as string).split(',')[1];
            const savedFile = await Filesystem.writeFile({
              path: filename,
              data: base64Data,
              directory: Directory.Cache,
              recursive: true,
            });

            showLocalNotification('DocuVault Download', `Downloaded: ${filename}`);

            // Open Android Native Save / Share Sheet
            const canShare = await Share.canShare().then(s => s.value).catch(() => false);
            if (canShare) {
              await Share.share({
                title: doc.title || 'DocuVault Document',
                text: `Save or view ${filename}`,
                url: savedFile.uri,
                dialogTitle: 'Save or View Document',
              });
            } else {
              alert(`Document successfully saved to device cache: ${filename}`);
            }
          } catch (nativeErr: any) {
            console.error('Filesystem write failed:', nativeErr);
            alert('Could not save file to device: ' + (nativeErr.message || nativeErr));
          } finally {
            setIsDownloading(false);
          }
        };
      } else {
        // Standard Web Browser: Blob object URL
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        setIsDownloading(false);
      }
    } catch (err: any) {
      alert(err.message || 'Download failed');
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    if (isOpen && doc) {
      setActiveTab('preview');
      setIsEditing(false);
      setShowDeleteConfirm(false);
      setIsOffline(doc.is_offline_available ?? true);
      setIsFamilyLocker(Boolean(doc.is_family_vault ?? (doc as any).family_vault ?? (doc as any).isFamilyVault));
      if (activeTab === 'versions') {
        loadVersions();
      }
    }
  }, [isOpen, doc?.id]);

  const loadVersions = async () => {
    if (!doc) return;
    setLoadingVersions(true);
    try {
      const vList = await api.getDocumentVersions(doc.id);
      setVersions(vList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!doc || !window.confirm('Restore this historical version of the document?')) return;
    try {
      await api.restoreDocumentVersion(doc.id, versionId);
      onRefresh();
      alert('Version restored successfully!');
      loadVersions();
    } catch (e: any) {
      alert('Failed to restore version: ' + (e?.message || 'Error'));
    }
  };

  const handleToggleOffline = async (checked: boolean) => {
    if (!doc) return;
    setIsOffline(checked);
    try {
      await api.updateDocument(doc.id, { is_offline_available: checked });
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleFamilyLocker = async () => {
    if (!doc || isTogglingFamily) return;
    if (!isOwner) {
      alert('Only the family member who uploaded this document can change its locker destination.');
      return;
    }

    const nextVal = !isFamilyLocker;
    const confirmMessage = nextVal
      ? `Share "${doc.title}" to Family Locker?\n\nAll members in your family vault will be able to view and access this document.`
      : `Move "${doc.title}" to Personal Locker?\n\nThis will remove the document from the Family Vault. Only you will have access to it in your Personal Locker.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setIsTogglingFamily(true);
    setIsFamilyLocker(nextVal);
    try {
      const updated = await api.updateDocument(doc.id, {
        is_family_vault: nextVal,
        family_vault: nextVal,
        isFamilyVault: nextVal,
      });
      const finalVal = updated ? Boolean(updated.is_family_vault ?? (updated as any).family_vault ?? (updated as any).isFamilyVault) : nextVal;
      setIsFamilyLocker(finalVal);
      doc.is_family_vault = finalVal;
      (doc as any).family_vault = finalVal;
      (doc as any).isFamilyVault = finalVal;
      showLocalNotification(
        'DocuVault Family Locker',
        finalVal ? `"${doc.title}" is now accessible by all family vault members.` : `"${doc.title}" moved to Personal Locker.`
      );
      onRefresh();
    } catch (e: any) {
      setIsFamilyLocker(!nextVal);
      alert('Failed to update locker setting: ' + (e?.message || 'Error'));
    } finally {
      setIsTogglingFamily(false);
    }
  };

  if (!isOpen || !doc) return null;

  const downloadUrl = api.getDocumentDownloadUrl(doc.id);
  const previewUrl = api.getDocumentPreviewUrl(doc.id);
  const rawMime = (detectedMime || doc.mime_type || '').toLowerCase();
  const rawName = (doc.original_filename || doc.title || '').toLowerCase();
  const isPdf = rawMime.includes('pdf') || rawName.endsWith('.pdf');
  const isImage = rawMime.includes('image') ||
    rawName.endsWith('.jpg') ||
    rawName.endsWith('.jpeg') ||
    rawName.endsWith('.png') ||
    rawName.endsWith('.webp') ||
    rawName.endsWith('.gif') ||
    rawName.endsWith('.svg') ||
    rawName.endsWith('.bmp');
  const isText = rawMime.includes('text') || rawName.endsWith('.txt') || rawName.endsWith('.csv') || rawName.endsWith('.json');

  // Expiry badge calculation
  let expiryColor = colors.success;
  let expiryText = 'Active & Valid';
  if (doc.is_expired) {
    expiryColor = colors.danger;
    expiryText = 'EXPIRED';
  } else if (doc.days_until_expiry !== null && doc.days_until_expiry !== undefined) {
    if (doc.days_until_expiry <= 7) {
      expiryColor = colors.danger;
      expiryText = `Expires in ${doc.days_until_expiry} day${doc.days_until_expiry === 1 ? '' : 's'}`;
    } else if (doc.days_until_expiry <= 30) {
      expiryColor = colors.warning;
      expiryText = `Expires in ${doc.days_until_expiry} days`;
    }
  } else if (!doc.expiry_date) {
    expiryColor = colors.textMuted;
    expiryText = 'No Expiry Date';
  }

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.deleteDocument(doc.id);
      onRefresh();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to delete document');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStartEdit = () => {
    setEditTitle(doc.title);
    setEditNotes(doc.notes || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    setIsUpdating(true);
    try {
      await api.updateDocument(doc.id, {
        title: editTitle.trim(),
        notes: editNotes.trim(),
      });
      setIsEditing(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update metadata');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleGrantPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareEmail.trim()) return;
    setIsSharing(true);
    setShareError(null);
    try {
      await api.grantPermission(doc.id, {
        granted_to_user_email: shareEmail.trim(),
        can_view: true,
        can_download: true,
      });
      setShareEmail('');
      onRefresh();
    } catch (err: any) {
      setShareError(err.message || 'Failed to grant permission');
    } finally {
      setIsSharing(false);
    }
  };

  const handleRevokePermission = async (permId: string) => {
    try {
      await api.revokePermission(doc.id, permId);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke permission');
    }
  };

  const handleVerifyDna = async () => {
    setIsVerifyingDna(true);
    try {
      const res = await api.verifyDocumentDna(doc.id);
      setDnaResult(res);
    } catch (err: any) {
      alert(err.message || 'Verification failed');
    } finally {
      setIsVerifyingDna(false);
    }
  };

  const handleCopyOcr = () => {
    if (doc.ocr_text) {
      navigator.clipboard.writeText(doc.ocr_text);
      setIsCopiedOcr(true);
      setTimeout(() => setIsCopiedOcr(false), 2000);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      padding: 16,
    }}>
      <div style={{
        backgroundColor: colors.surface,
        borderRadius: 20,
        border: `1px solid ${colors.surfaceBorder}`,
        width: '100%',
        maxWidth: 620,
        height: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
      }}>
        {/* Modal Top Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${colors.surfaceBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: 'rgba(13, 148, 136, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.accentLight,
              flexShrink: 0,
            }}>
              <FileText size={20} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <h2 style={{
                fontSize: 16,
                fontWeight: 700,
                color: colors.text,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {doc.title}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 6,
                  backgroundColor: colors.surfaceCard,
                  color: colors.textMuted,
                  fontWeight: 600,
                }}>
                  {doc.category}
                </span>
                <span style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 6,
                  backgroundColor: `${expiryColor}20`,
                  color: expiryColor,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  {expiryText}
                </span>
              </div>
            </div>
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

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          borderBottom: `1px solid ${colors.surfaceBorder}`,
          backgroundColor: colors.surfaceCard,
          overflowX: 'auto',
          scrollbarWidth: 'none',
        }}>
          {[
            { id: 'preview', label: 'Preview', icon: <Eye size={14} /> },
            { id: 'details', label: 'Details', icon: <FileText size={14} /> },
            { id: 'ocr', label: 'OCR Text', icon: <ScanLine size={14} /> },
            { id: 'dna', label: 'DNA Hash', icon: <Dna size={14} /> },
            { id: 'versions', label: `v${doc.version || 1} History`, icon: <History size={14} /> },
            { id: 'permissions', label: `Shared (${doc.permissions?.length || 0})`, icon: <Users size={14} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                flex: 1,
                padding: '10px 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? colors.accentLight : colors.textMuted,
                borderBottom: activeTab === tab.id ? `2px solid ${colors.accent}` : '2px solid transparent',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {activeTab === 'preview' && (
            <div style={{ height: '100%', minHeight: 340, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Preview Control Toolbar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 12,
                backgroundColor: colors.surfaceCard,
                border: `1px solid ${colors.surfaceBorder}`,
                fontSize: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: colors.textMuted }}>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 6,
                    backgroundColor: isPdf ? 'rgba(239, 68, 68, 0.15)' : isImage ? 'rgba(13, 148, 136, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                    color: isPdf ? '#EF4444' : isImage ? colors.accentLight : '#3B82F6',
                    fontWeight: 700,
                    fontSize: 11,
                    textTransform: 'uppercase',
                  }}>
                    {isPdf ? 'PDF' : isImage ? 'IMAGE' : isText ? 'TEXT' : 'DOCUMENT'}
                  </span>
                  <span>{((doc.file_size || 0) / 1024).toFixed(1)} KB</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isImage && (blobPreview || previewUrl) && (
                    <button
                      onClick={() => setIsZoomed(!isZoomed)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                        borderRadius: 8,
                        backgroundColor: colors.surface,
                        border: `1px solid ${colors.surfaceBorder}`,
                        color: colors.text,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {isZoomed ? <ZoomOut size={14} /> : <ZoomIn size={14} />}
                      <span>{isZoomed ? 'Fit' : 'Zoom'}</span>
                    </button>
                  )}

                  {isPdf && (
                    <button
                      onClick={handleOpenInNativeViewer}
                      disabled={pdfNativeOpening}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '4px 10px',
                        borderRadius: 8,
                        backgroundColor: colors.accent,
                        color: '#FFF',
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {pdfNativeOpening ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ExternalLink size={14} />}
                      <span>Open in PDF Viewer</span>
                    </button>
                  )}

                  <button
                    onClick={() => fetchPreviewBlob(true)}
                    title="Reload Preview"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: 6,
                      borderRadius: 8,
                      backgroundColor: colors.surface,
                      border: `1px solid ${colors.surfaceBorder}`,
                      color: colors.textMuted,
                      cursor: 'pointer',
                    }}
                  >
                    <RefreshCw size={14} style={{ animation: isLoadingPreview ? 'spin 1s linear infinite' : 'none' }} />
                  </button>
                </div>
              </div>

              {/* Main Preview Container */}
              <div style={{
                flex: 1,
                minHeight: 380,
                borderRadius: 14,
                overflow: 'auto',
                border: `1px solid ${colors.surfaceBorder}`,
                backgroundColor: colors.surfaceCard,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}>
                {isLoadingPreview && !blobPreview ? (
                  <div style={{ textAlign: 'center', padding: 30 }}>
                    <Loader2 size={36} color={colors.accentLight} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                    <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>Loading secure preview from vault...</div>
                    <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>Decrypting & rendering document data</div>
                  </div>
                ) : previewError && !blobPreview ? (
                  <div style={{ textAlign: 'center', padding: 30, maxWidth: 360 }}>
                    <AlertTriangle size={42} color={colors.warning} style={{ margin: '0 auto 12px' }} />
                    <div style={{ fontSize: 15, fontWeight: 700, color: colors.text }}>Preview Temporarily Unavailable</div>
                    <p style={{ fontSize: 12, color: colors.textMuted, marginTop: 6, lineHeight: 1.5 }}>
                      The file is safely stored in your vault. You can retry loading the preview or download the file directly to your device.
                    </p>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 }}>
                      <button
                        onClick={() => fetchPreviewBlob(true)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 8,
                          backgroundColor: colors.accent,
                          color: '#FFF',
                          border: 'none',
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <RefreshCw size={14} />
                        Retry Preview
                      </button>
                      <button
                        onClick={handleDownload}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 8,
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.surfaceBorder}`,
                          color: colors.text,
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <Download size={14} />
                        Download
                      </button>
                    </div>
                  </div>
                ) : isImage && (blobPreview || previewUrl) ? (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'auto',
                    padding: 8,
                  }}>
                    <img
                      src={blobPreview || previewUrl}
                      alt={doc.title}
                      onError={() => {
                        console.warn('Image load error on preview URL');
                        if (!blobPreview) fetchPreviewBlob(true);
                      }}
                      style={{
                        maxWidth: isZoomed ? 'none' : '100%',
                        maxHeight: isZoomed ? 'none' : '100%',
                        width: isZoomed ? '180%' : 'auto',
                        objectFit: 'contain',
                        borderRadius: 8,
                        transition: 'width 0.2s ease',
                      }}
                    />
                  </div>
                ) : isPdf ? (
                  <PDFPreviewViewer
                    blob={previewCache.get(doc.id)?.blob || null}
                    url={blobPreview || previewUrl}
                    docTitle={doc.title}
                    onOpenExternal={handleOpenInNativeViewer}
                    onDownload={handleDownload}
                    isOpeningExternal={pdfNativeOpening}
                    isDownloading={isDownloading}
                  />
                ) : (
                  <div style={{ textAlign: 'center', padding: 30 }}>
                    <FileText size={48} color={colors.accentLight} style={{ margin: '0 auto 12px' }} />
                    <div style={{ fontSize: 15, fontWeight: 600, color: colors.text }}>{doc.title || 'Document Ready'}</div>
                    <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                      Format: {doc.mime_type || 'Document'} • {((doc.file_size || 0) / 1024).toFixed(1)} KB
                    </div>
                    <button
                      onClick={handleDownload}
                      disabled={isDownloading}
                      style={{
                        marginTop: 16,
                        padding: '10px 18px',
                        borderRadius: 10,
                        backgroundColor: colors.accent,
                        color: '#FFF',
                        border: 'none',
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Download size={16} />
                      Download to View
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, color: colors.textMuted }}>Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        backgroundColor: colors.surfaceCard,
                        border: `1px solid ${colors.surfaceBorder}`,
                        color: colors.text,
                        fontSize: 14,
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: colors.textMuted }}>Notes</label>
                    <textarea
                      rows={3}
                      value={editNotes}
                      onChange={e => setEditNotes(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 8,
                        backgroundColor: colors.surfaceCard,
                        border: `1px solid ${colors.surfaceBorder}`,
                        color: colors.text,
                        fontSize: 14,
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={handleSaveEdit}
                      disabled={isUpdating}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        backgroundColor: colors.accent,
                        color: '#FFF',
                        border: 'none',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {isUpdating ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        backgroundColor: colors.surfaceCard,
                        color: colors.text,
                        border: `1px solid ${colors.surfaceBorder}`,
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 12,
                  }}>
                    <div style={{ padding: 12, borderRadius: 10, backgroundColor: colors.surfaceCard }}>
                      <div style={{ fontSize: 11, color: colors.textMuted }}>Holder Name</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, marginTop: 4 }}>
                        {doc.holder_name || 'Not extracted'}
                      </div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 10, backgroundColor: colors.surfaceCard }}>
                      <div style={{ fontSize: 11, color: colors.textMuted }}>Document ID / Number</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, marginTop: 4 }}>
                        {doc.doc_number || 'Not extracted'}
                      </div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 10, backgroundColor: colors.surfaceCard }}>
                      <div style={{ fontSize: 11, color: colors.textMuted }}>Issuer / Authority</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: colors.text, marginTop: 4 }}>
                        {doc.issuer || 'Not specified'}
                      </div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 10, backgroundColor: colors.surfaceCard }}>
                      <div style={{ fontSize: 11, color: colors.textMuted }}>Date of Birth (DOB)</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: colors.text, marginTop: 4 }}>
                        {doc.dob || 'Not specified'}
                      </div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 10, backgroundColor: colors.surfaceCard }}>
                      <div style={{ fontSize: 11, color: colors.textMuted }}>Issue Date</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: colors.text, marginTop: 4 }}>
                        {doc.issue_date || 'Not specified'}
                      </div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 10, backgroundColor: colors.surfaceCard }}>
                      <div style={{ fontSize: 11, color: colors.textMuted }}>Expiry Date</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: colors.text, marginTop: 4 }}>
                        {doc.expiry_date || 'No expiration'}
                      </div>
                    </div>
                  </div>

                  {/* Offline Storage Status & Toggle Box */}
                  <div style={{
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: isOffline ? 'rgba(16, 185, 129, 0.12)' : colors.surfaceCard,
                    border: `1px solid ${isOffline ? colors.success : colors.surfaceBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Smartphone size={20} color={isOffline ? colors.success : colors.textMuted} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>
                          {isOffline ? 'Encrypted Local Copy Available Offline' : 'Cloud Only (No Local Cache)'}
                        </div>
                        <div style={{ fontSize: 11, color: colors.textMuted }}>
                          Device biometric authentication required for offline opening
                        </div>
                      </div>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isOffline}
                        onChange={e => handleToggleOffline(e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: colors.accent }}
                      />
                    </label>
                  </div>

                  {/* Locker Destination & Emergency Vault Status Box */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {isOwner ? (
                      <div 
                        onClick={handleToggleFamilyLocker}
                        style={{
                          padding: 12,
                          borderRadius: 12,
                          backgroundColor: isFamilyLocker ? 'rgba(59, 130, 246, 0.14)' : colors.surfaceCard,
                          border: `1px solid ${isFamilyLocker ? '#3B82F6' : colors.surfaceBorder}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: isTogglingFamily ? 'wait' : 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        title="Tap to change locker destination"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          {isFamilyLocker ? <Users size={18} color="#60A5FA" /> : <Lock size={18} color={colors.accentLight} />}
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: colors.text, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span>{isFamilyLocker ? 'Family Locker' : 'Personal Locker'}</span>
                            </div>
                            <div style={{ fontSize: 10, color: colors.textMuted }}>
                              {isFamilyLocker ? 'Shared • Tap to make personal' : 'Private • Tap to share'}
                            </div>
                          </div>
                        </div>
                        <div style={{
                          padding: '3px 8px',
                          borderRadius: 12,
                          backgroundColor: isFamilyLocker ? 'rgba(59, 130, 246, 0.25)' : 'rgba(148, 163, 184, 0.15)',
                          color: isFamilyLocker ? '#60A5FA' : colors.textMuted,
                          fontSize: 10,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}>
                          {isFamilyLocker ? 'Shared' : 'Private'}
                        </div>
                      </div>
                    ) : (
                      <div 
                        style={{
                          padding: 12,
                          borderRadius: 12,
                          backgroundColor: 'rgba(59, 130, 246, 0.14)',
                          border: '1px solid #3B82F6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'default',
                        }}
                        title="Shared by family member"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                          <Users size={18} color="#60A5FA" />
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: colors.text, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span>Family Locker</span>
                            </div>
                            <div style={{ fontSize: 10, color: colors.textMuted }}>
                              Shared by family member
                            </div>
                          </div>
                        </div>
                        <div style={{
                          padding: '3px 8px',
                          borderRadius: 12,
                          backgroundColor: 'rgba(59, 130, 246, 0.25)',
                          color: '#60A5FA',
                          fontSize: 10,
                          fontWeight: 700,
                          flexShrink: 0,
                        }}>
                          Shared
                        </div>
                      </div>
                    )}

                    <div style={{
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: doc.is_emergency_eligible ? 'rgba(239, 68, 68, 0.12)' : colors.surfaceCard,
                      border: `1px solid ${doc.is_emergency_eligible ? colors.danger : colors.surfaceBorder}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}>
                      <ShieldAlert size={18} color={doc.is_emergency_eligible ? colors.danger : colors.textMuted} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>
                          {doc.is_emergency_eligible ? 'Emergency Vault' : 'Standard Vault'}
                        </div>
                        <div style={{ fontSize: 10, color: colors.textMuted }}>
                          {doc.is_emergency_eligible ? 'Accessible in emergency' : 'Standard locker access'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {doc.notes && (
                    <div style={{ padding: 14, borderRadius: 12, backgroundColor: colors.surfaceCard }}>
                      <div style={{ fontSize: 11, color: colors.textMuted, fontWeight: 600, marginBottom: 4 }}>
                        Notes & Instructions
                      </div>
                      <div style={{ fontSize: 13, color: colors.text, lineHeight: 1.5 }}>
                        {doc.notes}
                      </div>
                    </div>
                  )}

                  {/* Technical Info */}
                  <div style={{ fontSize: 11, color: colors.textMuted, display: 'flex', gap: 16 }}>
                    <span>Size: {(doc.file_size / 1024).toFixed(1)} KB</span>
                    <span>Uploaded: {new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'ocr' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>
                    OCR Extracted Text
                  </div>
                  <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                    Automatically scanned content indexed for keyword & voice search
                  </div>
                </div>
                {doc.ocr_text && (
                  <button
                    onClick={handleCopyOcr}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      backgroundColor: isCopiedOcr ? 'rgba(16, 185, 129, 0.2)' : colors.surfaceCard,
                      border: `1px solid ${isCopiedOcr ? '#10B981' : colors.surfaceBorder}`,
                      color: isCopiedOcr ? '#10B981' : colors.text,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    {isCopiedOcr ? <Check size={14} /> : <Copy size={14} />}
                    <span>{isCopiedOcr ? 'Copied!' : 'Copy Text'}</span>
                  </button>
                )}
              </div>

              {doc.ocr_text ? (
                <div style={{
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: colors.surfaceCard,
                  border: `1px solid ${colors.surfaceBorder}`,
                  fontFamily: 'monospace',
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: colors.text,
                  whiteSpace: 'pre-wrap',
                  maxHeight: 340,
                  overflowY: 'auto'
                }}>
                  {doc.ocr_text}
                </div>
              ) : (
                <div style={{
                  padding: 32,
                  textAlign: 'center',
                  borderRadius: 12,
                  backgroundColor: colors.surfaceCard,
                  border: `1px solid ${colors.surfaceBorder}`,
                  color: colors.textMuted,
                  fontSize: 13
                }}>
                  <ScanLine size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <div>No OCR text indexed for this document.</div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'dna' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>
                  Document DNA Verification (SHA-256)
                </div>
                <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                  Cryptographic hashing guarantees document integrity, authenticity, and non-tampering
                </div>
              </div>

              {/* Stored Registered Hash Card */}
              <div style={{
                padding: 14,
                borderRadius: 12,
                backgroundColor: colors.surfaceCard,
                border: `1px solid ${colors.surfaceBorder}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase' }}>
                  Registered Document DNA Fingerprint
                </div>
                <div style={{
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.surfaceBorder}`,
                  fontFamily: 'monospace',
                  fontSize: 11,
                  wordBreak: 'break-all',
                  color: colors.accentLight
                }}>
                  {doc.sha256_hash || 'SHA-256 registered on storage upload'}
                </div>
              </div>

              {/* Live Verification Button & Status */}
              <button
                onClick={handleVerifyDna}
                disabled={isVerifyingDna}
                style={{
                  padding: '12px 16px',
                  borderRadius: 12,
                  backgroundColor: colors.accent,
                  color: '#FFF',
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)'
                }}
              >
                {isVerifyingDna ? <Loader2 size={16} className="animate-spin" /> : <Dna size={16} />}
                <span>{isVerifyingDna ? 'Computing Cryptographic Audit...' : 'Verify Document Authenticity (SHA-256)'}</span>
              </button>

              {dnaResult && (
                <div style={{
                  padding: 16,
                  borderRadius: 12,
                  backgroundColor: dnaResult.is_intact ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                  border: `1.5px solid ${dnaResult.is_intact ? '#10B981' : '#EF4444'}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {dnaResult.is_intact ? (
                      <CheckCircle2 size={20} color="#10B981" />
                    ) : (
                      <AlertTriangle size={20} color="#EF4444" />
                    )}
                    <span style={{ fontSize: 14, fontWeight: 700, color: dnaResult.is_intact ? '#10B981' : '#EF4444' }}>
                      {dnaResult.is_intact ? 'VERIFIED AUTHENTIC: 100% Intact' : 'TAMPER DETECTED: Hash Mismatch'}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: colors.textMuted }}>
                    {dnaResult.is_intact 
                      ? 'The current cryptographic file hash matches the original registered hash bit-for-bit. No unauthorized alterations detected.'
                      : 'The stored file hash differs from the registered fingerprint. The document may have been corrupted or tampered with.'}
                  </div>
                  <div style={{ fontSize: 10, fontFamily: 'monospace', color: colors.textMuted }}>
                    Current Hash: {dnaResult.current_file_hash}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'versions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: colors.text, margin: 0 }}>
                    Version History & Rollback Log
                  </h4>
                  <p style={{ fontSize: 11, color: colors.textMuted, margin: '2px 0 0 0' }}>
                    Every revision is cryptographically fingerprinted for audit and safe restore
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadVersions}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: colors.accentLight,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Refresh
                </button>
              </div>

              {loadingVersions ? (
                <div style={{ textAlign: 'center', padding: 30, color: colors.textMuted }}>
                  Loading revisions...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {/* Current Active Version */}
                  <div style={{
                    padding: 14,
                    borderRadius: 12,
                    backgroundColor: 'rgba(13, 148, 136, 0.12)',
                    border: `1.5px solid ${colors.accentLight}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: colors.accentLight }}>
                        Version {doc.version || 1} (Current Active)
                      </span>
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, backgroundColor: colors.accent, color: '#FFF', fontWeight: 700 }}>
                        Active
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: colors.text, fontWeight: 600 }}>{doc.title}</div>
                    <div style={{ fontSize: 10, fontFamily: 'monospace', color: colors.textMuted, marginTop: 4 }}>
                      SHA-256: {doc.sha256_hash?.substring(0, 32)}...
                    </div>
                  </div>

                  {/* Prior Versions */}
                  {versions.filter(v => v.version_number !== (doc.version || 1)).map(v => (
                    <div
                      key={v.id}
                      style={{
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: colors.surfaceCard,
                        border: `1px solid ${colors.surfaceBorder}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>
                          Version {v.version_number}
                        </div>
                        <div style={{ fontSize: 11, color: colors.textMuted }}>
                          {v.change_summary || 'Historical snapshot'} • {new Date(v.created_at).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: 10, fontFamily: 'monospace', color: colors.textMuted, marginTop: 2 }}>
                          {v.sha256_hash?.substring(0, 24)}...
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRestoreVersion(v.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          backgroundColor: 'rgba(255,255,255,0.08)',
                          border: `1px solid ${colors.surfaceBorder}`,
                          color: colors.accentLight,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <RotateCcw size={12} />
                        <span>Restore</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'permissions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Family Locker Global Vault Access Toggle Card */}
              <div style={{
                padding: 16,
                borderRadius: 14,
                backgroundColor: isFamilyLocker ? 'rgba(59, 130, 246, 0.12)' : colors.surfaceCard,
                border: `1px solid ${isFamilyLocker ? '#3B82F6' : colors.surfaceBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                  <div style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    backgroundColor: isFamilyLocker ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isFamilyLocker ? '#60A5FA' : colors.textMuted,
                    flexShrink: 0,
                  }}>
                    <Users size={22} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>Family Vault Access</span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 10,
                        backgroundColor: isFamilyLocker ? 'rgba(59, 130, 246, 0.25)' : 'rgba(148, 163, 184, 0.15)',
                        color: isFamilyLocker ? '#60A5FA' : colors.textMuted,
                      }}>
                        {isFamilyLocker ? 'Access Granted' : 'Personal Only'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                      {isFamilyLocker
                        ? 'All accepted members of your family vault can view and access this document.'
                        : 'Currently private. Grant access to make this document available in the Family Locker.'}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleFamilyLocker}
                  disabled={isTogglingFamily}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 10,
                    backgroundColor: isFamilyLocker ? 'rgba(239, 68, 68, 0.15)' : colors.accent,
                    color: isFamilyLocker ? colors.danger : '#FFF',
                    border: isFamilyLocker ? '1px solid rgba(239, 68, 68, 0.3)' : 'none',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: isTogglingFamily ? 'wait' : 'pointer',
                    flexShrink: 0,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isTogglingFamily
                    ? 'Updating...'
                    : isFamilyLocker
                      ? 'Remove Access'
                      : 'Grant Family Access'}
                </button>
              </div>

              {/* Share with user form */}
              <form onSubmit={handleGrantPermission} style={{
                padding: 14,
                borderRadius: 12,
                backgroundColor: colors.surfaceCard,
                border: `1px solid ${colors.surfaceBorder}`,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, marginBottom: 6 }}>
                  Grant Access to Family Member
                </div>
                <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12 }}>
                  Share this specific document with a registered family member by email
                </div>

                {shareError && (
                  <div style={{ fontSize: 12, color: colors.danger, marginBottom: 8 }}>
                    {shareError}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="email"
                    placeholder="Enter family member's email..."
                    required
                    value={shareEmail}
                    onChange={e => setShareEmail(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 8,
                      backgroundColor: colors.surface,
                      border: `1px solid ${colors.surfaceBorder}`,
                      color: colors.text,
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isSharing}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 8,
                      backgroundColor: colors.accent,
                      color: '#FFF',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    {isSharing ? 'Sharing...' : 'Share'}
                  </button>
                </div>
              </form>

              {/* Existing Permissions List */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, marginBottom: 8 }}>
                  Active Delegated Permissions
                </div>
                {doc.permissions && doc.permissions.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {doc.permissions.map(p => (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: 12,
                          borderRadius: 10,
                          backgroundColor: colors.surfaceCard,
                          border: `1px solid ${colors.surfaceBorder}`,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                            {p.granted_to_user_name || p.granted_to_user_email}
                          </div>
                          <div style={{ fontSize: 11, color: colors.textMuted }}>
                            {p.granted_to_user_email} • View & Download Granted
                          </div>
                        </div>
                        <button
                          onClick={() => handleRevokePermission(p.id)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            color: colors.danger,
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    padding: 24,
                    textAlign: 'center',
                    backgroundColor: colors.surfaceCard,
                    borderRadius: 12,
                    color: colors.textMuted,
                    fontSize: 12,
                  }}>
                    This document has not been shared with any individual members yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Action Bar */}
        <div style={{
          padding: '12px 20px',
          borderTop: `1px solid ${colors.surfaceBorder}`,
          backgroundColor: colors.surfaceCard,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}>
          {showDeleteConfirm ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
              <span style={{ fontSize: 13, color: colors.danger, fontWeight: 600, flex: 1 }}>
                Are you sure you want to permanently delete this document?
              </span>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  backgroundColor: colors.danger,
                  color: '#FFF',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  backgroundColor: colors.surface,
                  color: colors.text,
                  border: `1px solid ${colors.surfaceBorder}`,
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8 }}>
                {/* Download */}
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 8,
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.surfaceBorder}`,
                    color: colors.text,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isDownloading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={14} />}
                  <span>{isDownloading ? 'Downloading...' : 'Download'}</span>
                </button>

                {/* QR Share */}
                <button
                  onClick={() => {
                    onClose();
                    onOpenQRShare(doc);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 8,
                    backgroundColor: colors.accent,
                    border: 'none',
                    color: '#FFF',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <QrCode size={14} />
                  <span>Create QR Share</span>
                </button>

                {/* Edit - Sender only */}
                {isOwner && (
                  <button
                    onClick={() => {
                      setActiveTab('details');
                      handleStartEdit();
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 12px',
                      borderRadius: 8,
                      backgroundColor: colors.surface,
                      border: `1px solid ${colors.surfaceBorder}`,
                      color: colors.text,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Edit3 size={14} />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {/* Delete - Sender only */}
              {isOwner ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 12px',
                    borderRadius: 8,
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: colors.danger,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 11,
                  color: colors.textMuted,
                  padding: '6px 10px',
                  backgroundColor: colors.surface,
                  borderRadius: 8,
                  border: `1px solid ${colors.surfaceBorder}`,
                }}>
                  <ShieldCheck size={14} color={colors.accentLight} />
                  <span>Family Shared • View Only</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
