import React, { useState, useEffect, useRef } from 'react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import {
  X, Camera, KeyRound, Download, FileText, AlertCircle,
  CheckCircle2, ShieldCheck, Image as ImageIcon, RefreshCw,
  ExternalLink, Copy, Check, Users, FolderLock, Lock,
  Eye, Loader2, ZoomIn, ZoomOut
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { api, extractShareToken } from '../services/api';
import { previewCache } from '../services/previewCache';
import { showLocalNotification } from '../services/pushNotifications';
import { SharedDocumentViewData } from '../types';
import { useTheme } from '../context/ThemeContext';
import { PDFPreviewViewer } from './PDFPreviewViewer';

interface ScanQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialToken?: string | null;
  onSuccess?: (title?: string) => void;
  onRefresh?: () => void;
}

export const ScanQRModal: React.FC<ScanQRModalProps> = ({
  isOpen,
  onClose,
  initialToken,
  onSuccess,
  onRefresh,
}) => {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [tokenInput, setTokenInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [needsPin, setNeedsPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sharedDoc, setSharedDoc] = useState<SharedDocumentViewData | null>(null);
  const [scannedRawText, setScannedRawText] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [copied, setCopied] = useState(false);
  const [familyInviteJoined, setFamilyInviteJoined] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  // Shared document preview & download state
  const [docBlob, setDocBlob] = useState<Blob | null>(null);
  const [blobPreviewUrl, setBlobPreviewUrl] = useState<string | null>(null);
  const [detectedMime, setDetectedMime] = useState<string | null>(null);
  const [resolvedFilename, setResolvedFilename] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showInlinePreview, setShowInlinePreview] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isOpeningExternal, setIsOpeningExternal] = useState(false);

  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-resolve initialToken if provided via deep link
  useEffect(() => {
    if (isOpen && initialToken) {
      const clean = extractShareToken(initialToken);
      setTokenInput(clean);
      setActiveTab('manual');
      handleResolveToken(clean);
    }
  }, [isOpen, initialToken]);

  // Initialize or stop scanner when modal open state changes
  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !sharedDoc) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, activeTab, cameraFacing]);

  const startScanner = async () => {
    setTimeout(async () => {
      const container = document.getElementById('qr-reader-container');
      if (!container) return;

      try {
        if (qrScannerRef.current) {
          try {
            await qrScannerRef.current.stop();
          } catch (e) { }
          qrScannerRef.current = null;
        }

        const scanner = new Html5Qrcode('qr-reader-container');
        qrScannerRef.current = scanner;

        setIsScanning(true);
        setErrorMessage(null);

        await scanner.start(
          { facingMode: cameraFacing },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
          },
          (decodedText) => {
            handleDecodedQR(decodedText);
          },
          () => {
            // Scanning frame loop
          }
        );
      } catch (err: any) {
        setIsScanning(false);
        console.warn('QR camera start error:', err);
        setErrorMessage('Camera access was blocked or is unavailable. You can upload an image with a QR code or enter the token manually below.');
      }
    }, 150);
  };

  const stopScanner = async () => {
    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
        await qrScannerRef.current.clear();
      } catch (e) { }
      qrScannerRef.current = null;
    }
    setIsScanning(false);
  };

  const loadSharedDocBlob = async (
    docData: SharedDocumentViewData,
    cleanToken: string,
    pin?: string
  ): Promise<{ blob: Blob; mimeType: string; filename: string } | null> => {
    setIsLoadingPreview(true);
    try {
      // Check memory cache first if doc ID is known
      if (docData.id) {
        const cached = previewCache.get(docData.id);
        if (cached && cached.blob && cached.url) {
          const mime = cached.mimeType || docData.mime_type || 'application/pdf';
          const ext = mime.includes('png') ? '.png' : (mime.includes('jpg') || mime.includes('jpeg')) ? '.jpg' : '.pdf';
          const fname = docData.original_filename || `${(docData.title || 'document').replace(/[^a-zA-Z0-9._-]/g, '_')}${ext}`;
          setDocBlob(cached.blob);
          setBlobPreviewUrl(cached.url);
          setDetectedMime(mime);
          setResolvedFilename(fname);
          return { blob: cached.blob, mimeType: mime, filename: fname };
        }
      }

      const fetched = await api.fetchSharedDocumentBlob(cleanToken, pin, docData);
      const url = docData.id
        ? previewCache.storeBlob(docData.id, fetched.blob, fetched.mimeType)
        : URL.createObjectURL(fetched.blob);

      setDocBlob(fetched.blob);
      setBlobPreviewUrl(url);
      setDetectedMime(fetched.mimeType);
      setResolvedFilename(fetched.filename);
      return fetched;
    } catch (e) {
      console.warn('Failed to pre-load shared document blob:', e);
      return null;
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleDecodedQR = (decodedText: string) => {
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
    stopScanner();
    setScannedRawText(decodedText);

    // Check if it's a family invite
    if (decodedText.includes('/invite/') || decodedText.startsWith('faminv_')) {
      let inviteToken = decodedText;
      if (decodedText.includes('/invite/')) {
        inviteToken = decodedText.split('/invite/').pop()?.split('?')[0] || decodedText;
      }
      setTokenInput(inviteToken);
      return;
    }

    // Extract robust share token
    const token = extractShareToken(decodedText);
    setTokenInput(token);
    handleResolveToken(token);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      let scanner = qrScannerRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode('qr-reader-container');
        qrScannerRef.current = scanner;
      }
      const decodedText = await scanner.scanFile(file, true);
      handleDecodedQR(decodedText);
    } catch (err: any) {
      setErrorMessage('Could not find a valid QR code in the selected image. Please try another photo or enter token manually.');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleResolveToken = async (tokenToUse?: string) => {
    const rawToken = (tokenToUse || tokenInput).trim();
    if (!rawToken) return;

    // Check if it's a family group token
    if (rawToken.includes('/invite/') || rawToken.startsWith('faminv_')) {
      const inviteToken = rawToken.includes('/invite/')
        ? rawToken.split('/invite/').pop()?.split('?')[0] || rawToken
        : rawToken;
      handleJoinFamily(inviteToken);
      return;
    }

    const cleanToken = extractShareToken(rawToken);

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const pin = pinInput.trim() || undefined;
      const data = await api.viewSharedDocument(cleanToken, pin);
      setSharedDoc(data);
      setNeedsPin(false);
      setShowInlinePreview(true);
      await loadSharedDocBlob(data, cleanToken, pin);
    } catch (err: any) {
      if (err.message?.includes('PIN') || err.message?.includes('401')) {
        setNeedsPin(true);
        setErrorMessage('This shared document is protected by a PIN. Please enter the 4-digit PIN code.');
      } else {
        setErrorMessage(err.message || 'Invalid or expired share token.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinFamily = async (token: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await api.respondToInvitation(token, 'ACCEPT');
      setFamilyInviteJoined('Successfully joined the Family Vault group! Refresh your Family tab to see shared records.');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to accept family invitation.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportDoc = async (isFamilyVault: boolean) => {
    setIsImporting(true);
    setErrorMessage(null);
    try {
      const cleanToken = extractShareToken(tokenInput);
      const imported = await api.importSharedDocument(cleanToken, {
        is_family_vault: isFamilyVault,
        pin: pinInput.trim() || undefined,
      });
      if (imported?.id && docBlob) {
        previewCache.storeBlob(imported.id, docBlob, detectedMime || sharedDoc?.mime_type);
      }
      const destination = isFamilyVault ? 'Family Vault' : 'Personal Locker';
      const title = imported?.title || sharedDoc?.title || 'Document';
      setImportSuccessMessage(`"${title}" has been saved into your ${destination}!`);
      if (onSuccess) onSuccess(title);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to import document into your locker.');
    } finally {
      setIsImporting(false);
    }
  };

  const ensureBlobReady = async (): Promise<{ blob: Blob; mimeType: string; filename: string } | null> => {
    if (!sharedDoc) return null;
    if (docBlob) {
      const mime = detectedMime || sharedDoc.mime_type || docBlob.type || 'application/pdf';
      const ext = mime.includes('png') ? '.png' : (mime.includes('jpg') || mime.includes('jpeg')) ? '.jpg' : '.pdf';
      const fname = resolvedFilename || sharedDoc.original_filename || `${(sharedDoc.title || 'document').replace(/[^a-zA-Z0-9._-]/g, '_')}${ext}`;
      return { blob: docBlob, mimeType: mime, filename: fname };
    }
    const cleanToken = extractShareToken(tokenInput);
    return loadSharedDocBlob(sharedDoc, cleanToken, pinInput.trim() || undefined);
  };

  const handleOpenInNativeViewer = async () => {
    if (!sharedDoc || isOpeningExternal) return;
    setIsOpeningExternal(true);
    setErrorMessage(null);
    try {
      const ready = await ensureBlobReady();
      if (!ready) {
        throw new Error('Could not load document data for viewing.');
      }

      if (Capacitor.isNativePlatform()) {
        const reader = new FileReader();
        reader.readAsDataURL(ready.blob);
        reader.onloadend = async () => {
          try {
            const base64Data = (reader.result as string).split(',')[1];
            const savedFile = await Filesystem.writeFile({
              path: ready.filename,
              data: base64Data,
              directory: Directory.Cache,
              recursive: true,
            });
            const canShare = await Share.canShare().then(s => s.value).catch(() => false);
            if (canShare) {
              await Share.share({
                title: sharedDoc.title || 'DocuVault Shared Document',
                text: `Opening ${ready.filename}`,
                url: savedFile.uri,
                dialogTitle: 'View Shared Document',
              });
            } else {
              alert(`Document ready in device cache: ${savedFile.uri}`);
            }
          } catch (e: any) {
            setErrorMessage('Could not open system viewer: ' + (e?.message || e));
          } finally {
            setIsOpeningExternal(false);
          }
        };
      } else {
        const url = blobPreviewUrl || URL.createObjectURL(ready.blob);
        window.open(url, '_blank');
        setIsOpeningExternal(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to open document preview.');
      setIsOpeningExternal(false);
    }
  };

  const handleViewPreviewClick = async () => {
    if (!sharedDoc) return;
    if (!showInlinePreview) {
      setShowInlinePreview(true);
    }
    if (!docBlob && !isLoadingPreview) {
      await ensureBlobReady();
    }
    if (previewContainerRef.current) {
      previewContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleDownloadFile = async () => {
    if (!sharedDoc || isDownloading) return;
    setIsDownloading(true);
    setErrorMessage(null);
    try {
      const ready = await ensureBlobReady();
      if (!ready) {
        throw new Error('Could not retrieve file for download.');
      }

      if (Capacitor.isNativePlatform()) {
        const reader = new FileReader();
        reader.readAsDataURL(ready.blob);
        reader.onloadend = async () => {
          try {
            const base64Data = (reader.result as string).split(',')[1];
            const savedFile = await Filesystem.writeFile({
              path: ready.filename,
              data: base64Data,
              directory: Directory.Cache,
              recursive: true,
            });

            showLocalNotification('DocuVault Download', `Downloaded: ${ready.filename}`);

            const canShare = await Share.canShare().then(s => s.value).catch(() => false);
            if (canShare) {
              await Share.share({
                title: sharedDoc.title || 'DocuVault Document',
                text: `Save or view ${ready.filename}`,
                url: savedFile.uri,
                dialogTitle: 'Save or View Document',
              });
            } else {
              alert(`Document saved to device cache: ${ready.filename}`);
            }
          } catch (nativeErr: any) {
            setErrorMessage('Could not save file to device: ' + (nativeErr?.message || nativeErr));
          } finally {
            setIsDownloading(false);
          }
        };
      } else {
        const url = window.URL.createObjectURL(ready.blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = ready.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => window.URL.revokeObjectURL(url), 1500);
        setIsDownloading(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Download failed.');
      setIsDownloading(false);
    }
  };

  const handleReset = () => {
    setSharedDoc(null);
    setScannedRawText(null);
    setTokenInput('');
    setPinInput('');
    setNeedsPin(false);
    setErrorMessage(null);
    setFamilyInviteJoined(null);
    setImportSuccessMessage(null);
    setIsImporting(false);
    setDocBlob(null);
    setBlobPreviewUrl(null);
    setDetectedMime(null);
    setResolvedFilename(null);
    setIsLoadingPreview(false);
    setIsZoomed(false);
    if (activeTab === 'camera') {
      startScanner();
    }
  };

  const copyText = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const rawMime = (detectedMime || sharedDoc?.mime_type || '').toLowerCase();
  const rawName = (resolvedFilename || sharedDoc?.original_filename || sharedDoc?.title || '').toLowerCase();
  const isPdf = rawMime.includes('pdf') || rawName.endsWith('.pdf');
  const isImage = rawMime.includes('image') ||
    rawName.endsWith('.jpg') ||
    rawName.endsWith('.jpeg') ||
    rawName.endsWith('.png') ||
    rawName.endsWith('.webp') ||
    rawName.endsWith('.gif') ||
    rawName.endsWith('.svg') ||
    rawName.endsWith('.bmp');

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 16,
    }}>
      <div style={{
        backgroundColor: colors.surface,
        borderRadius: 24,
        border: `1px solid ${colors.surfaceBorder}`,
        width: '100%',
        maxWidth: 480,
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${colors.surfaceBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: colors.text }}>Optical QR & Token Scanner</h2>
            <p style={{ fontSize: 12, color: colors.textMuted }}>
              Scan live QR codes or enter shared document tokens
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: colors.textMuted,
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Controls */}
        <div style={{
          display: 'flex',
          borderBottom: `1px solid ${colors.surfaceBorder}`,
          backgroundColor: colors.surfaceCard,
        }}>
          <button
            onClick={() => { setActiveTab('camera'); handleReset(); }}
            style={{
              flex: 1,
              padding: '12px 0',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'camera' ? `2px solid ${colors.accent}` : '2px solid transparent',
              color: activeTab === 'camera' ? colors.accentLight : colors.textMuted,
              fontWeight: 700,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <Camera size={16} />
            Live Camera Scan
          </button>
          <button
            onClick={() => { setActiveTab('manual'); stopScanner(); }}
            style={{
              flex: 1,
              padding: '12px 0',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === 'manual' ? `2px solid ${colors.accent}` : '2px solid transparent',
              color: activeTab === 'manual' ? colors.accentLight : colors.textMuted,
              fontWeight: 700,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              cursor: 'pointer',
            }}
          >
            <KeyRound size={16} />
            Manual Token
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: 20 }}>
          {errorMessage && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 12,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#FCA5A5',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 16,
            }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
          )}

          {familyInviteJoined && (
            <div style={{
              padding: '14px',
              borderRadius: 12,
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid #10B981',
              color: '#34D399',
              fontSize: 13,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
                <CheckCircle2 size={18} />
                <span>Family Invitation Accepted</span>
              </div>
              <div>{familyInviteJoined}</div>
              <button
                onClick={handleReset}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  backgroundColor: '#10B981',
                  color: '#FFF',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer',
                  alignSelf: 'flex-start'
                }}
              >
                Scan Another QR Code
              </button>
            </div>
          )}

          {/* Shared Document Result Card */}
          {sharedDoc ? (
            <div style={{
              backgroundColor: colors.surfaceCard,
              borderRadius: 16,
              border: `1px solid ${colors.surfaceBorder}`,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  backgroundColor: 'rgba(13, 148, 136, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.accentLight,
                  flexShrink: 0,
                }}>
                  <FileText size={24} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>
                    {sharedDoc.title}
                  </h3>
                  <p style={{ fontSize: 12, color: colors.textMuted }}>
                    {sharedDoc.category || 'Shared Vault Record'}
                  </p>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
                fontSize: 12,
                backgroundColor: colors.surface,
                padding: 12,
                borderRadius: 12,
              }}>
                <div>
                  <span style={{ color: colors.textMuted }}>Issuer: </span>
                  <span style={{ fontWeight: 600, color: colors.text }}>{sharedDoc.issuer || 'Official'}</span>
                </div>
                <div>
                  <span style={{ color: colors.textMuted }}>Issue Date: </span>
                  <span style={{ fontWeight: 600, color: colors.text }}>{sharedDoc.issue_date || 'N/A'}</span>
                </div>
                <div>
                  <span style={{ color: colors.textMuted }}>Expiry: </span>
                  <span style={{ fontWeight: 600, color: colors.text }}>{sharedDoc.expiry_date || 'None'}</span>
                </div>
                <div>
                  <span style={{ color: colors.textMuted }}>Access: </span>
                  <span style={{ fontWeight: 600, color: '#10B981' }}>Authorized</span>
                </div>
              </div>

              {/* Interactive In-App Document Preview Section (PDF & Image) */}
              {showInlinePreview && (
                <div
                  ref={previewContainerRef}
                  style={{
                    borderRadius: 14,
                    border: `1px solid ${colors.surfaceBorder}`,
                    backgroundColor: colors.surface,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Preview Mini Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderBottom: `1px solid ${colors.surfaceBorder}`,
                    backgroundColor: colors.surfaceCard,
                    fontSize: 11,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Eye size={13} color={colors.accentLight} />
                      <span style={{ fontWeight: 700, color: colors.text }}>
                        {isPdf ? 'PDF Document Preview' : isImage ? 'Image Preview' : 'Document Preview'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isImage && (blobPreviewUrl || sharedDoc.preview_url) && (
                        <button
                          type="button"
                          onClick={() => setIsZoomed(!isZoomed)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 6,
                            backgroundColor: colors.surface,
                            border: `1px solid ${colors.surfaceBorder}`,
                            color: colors.text,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          {isZoomed ? <ZoomOut size={12} /> : <ZoomIn size={12} />}
                          <span>{isZoomed ? 'Fit' : 'Zoom'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleOpenInNativeViewer}
                        disabled={isOpeningExternal}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          backgroundColor: 'rgba(13, 148, 136, 0.15)',
                          border: `1px solid ${colors.accent}`,
                          color: colors.accentLight,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <ExternalLink size={12} />
                        <span>{isOpeningExternal ? 'Opening...' : 'System Viewer'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Preview Viewport */}
                  {isLoadingPreview && !blobPreviewUrl ? (
                    <div style={{ padding: 32, textAlign: 'center' }}>
                      <Loader2 size={28} color={colors.accentLight} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
                      <div style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted }}>
                        Loading shared document preview...
                      </div>
                    </div>
                  ) : isImage && (blobPreviewUrl || sharedDoc.preview_url) ? (
                    <div style={{
                      padding: 10,
                      backgroundColor: '#020617',
                      maxHeight: isZoomed ? 420 : 260,
                      overflow: 'auto',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <img
                        src={blobPreviewUrl || sharedDoc.preview_url}
                        alt={sharedDoc.title}
                        style={{
                          maxWidth: isZoomed ? 'none' : '100%',
                          maxHeight: isZoomed ? 'none' : 240,
                          width: isZoomed ? '175%' : 'auto',
                          objectFit: 'contain',
                          borderRadius: 8,
                        }}
                      />
                    </div>
                  ) : isPdf && (docBlob || blobPreviewUrl || sharedDoc.preview_url) ? (
                    <div style={{ maxHeight: 420, overflow: 'hidden' }}>
                      <PDFPreviewViewer
                        blob={docBlob}
                        url={blobPreviewUrl || sharedDoc.preview_url}
                        docTitle={sharedDoc.title}
                        onOpenExternal={handleOpenInNativeViewer}
                        onDownload={handleDownloadFile}
                        isOpeningExternal={isOpeningExternal}
                        isDownloading={isDownloading}
                      />
                    </div>
                  ) : (
                    <div style={{ padding: 24, textAlign: 'center' }}>
                      <FileText size={32} color={colors.accentLight} style={{ margin: '0 auto 8px' }} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                        {sharedDoc.title}
                      </div>
                      <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                        Tap below to view in system viewer or download to your device.
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {importSuccessMessage ? (
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid #10B981',
                    color: '#34D399',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: 600,
                  }}>
                    <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
                    <span>{importSuccessMessage}</span>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => handleImportDoc(false)}
                      disabled={isImporting}
                      style={{
                        padding: '11px 8px',
                        borderRadius: 12,
                        backgroundColor: colors.surfaceCard,
                        border: `1px solid ${colors.surfaceBorder}`,
                        color: colors.text,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: isImporting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        opacity: isImporting ? 0.6 : 1,
                      }}
                    >
                      <Lock size={14} color={colors.accentLight} />
                      <span>{isImporting ? 'Saving...' : 'Save to Personal'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleImportDoc(true)}
                      disabled={isImporting}
                      style={{
                        padding: '11px 8px',
                        borderRadius: 12,
                        backgroundColor: 'rgba(13, 148, 136, 0.15)',
                        border: `1px solid ${colors.accent}`,
                        color: colors.accentLight,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: isImporting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        opacity: isImporting ? 0.6 : 1,
                      }}
                    >
                      <FolderLock size={14} />
                      <span>{isImporting ? 'Adding...' : 'Add to Family'}</span>
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (showInlinePreview && (docBlob || blobPreviewUrl)) {
                      handleOpenInNativeViewer();
                    } else {
                      handleViewPreviewClick();
                    }
                  }}
                  disabled={isOpeningExternal || isLoadingPreview}
                  style={{
                    padding: '12px',
                    borderRadius: 12,
                    backgroundColor: colors.accent,
                    color: '#FFF',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 14,
                    textAlign: 'center',
                    cursor: (isOpeningExternal || isLoadingPreview) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <ExternalLink size={16} />
                  <span>
                    {isOpeningExternal
                      ? 'Opening Document Viewer...'
                      : isLoadingPreview
                        ? 'Loading Preview...'
                        : 'View / Preview Document'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadFile}
                  disabled={isDownloading}
                  style={{
                    padding: '12px',
                    borderRadius: 12,
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.surfaceBorder}`,
                    color: colors.text,
                    fontWeight: 600,
                    fontSize: 14,
                    textAlign: 'center',
                    cursor: isDownloading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    opacity: isDownloading ? 0.7 : 1,
                  }}
                >
                  <Download size={16} />
                  <span>{isDownloading ? 'Downloading File...' : 'Download File'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  style={{
                    padding: '8px',
                    background: 'none',
                    border: 'none',
                    color: colors.textMuted,
                    fontSize: 12,
                    cursor: 'pointer',
                    marginTop: 4,
                  }}
                >
                  Scan another code
                </button>
              </div>
            </div>
          ) : scannedRawText && !needsPin ? (
            /* Scanned Generic QR or Family Token Card */
            <div style={{
              backgroundColor: colors.surfaceCard,
              borderRadius: 16,
              border: `1px solid ${colors.surfaceBorder}`,
              padding: 18,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={20} color="#10B981" />
                <span style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>QR Code Successfully Decoded</span>
              </div>

              <div style={{
                padding: 12,
                borderRadius: 10,
                backgroundColor: colors.surface,
                wordBreak: 'break-all',
                fontSize: 13,
                fontFamily: 'monospace',
                color: colors.accentLight,
              }}>
                {scannedRawText}
              </div>

              {scannedRawText.includes('faminv_') ? (
                <button
                  onClick={() => handleJoinFamily(tokenInput)}
                  disabled={isLoading}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: colors.accent,
                    color: '#FFF',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <Users size={16} />
                  {isLoading ? 'Joining Group...' : 'Accept & Join Family Vault'}
                </button>
              ) : scannedRawText.startsWith('http') ? (
                <a
                  href={scannedRawText}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: colors.accent,
                    color: '#FFF',
                    fontWeight: 700,
                    fontSize: 14,
                    textAlign: 'center',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <ExternalLink size={16} />
                  Open Link in Browser
                </a>
              ) : (
                <button
                  onClick={() => copyText(scannedRawText)}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.surfaceBorder}`,
                    color: colors.text,
                    fontWeight: 600,
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {copied ? <Check size={16} color="#10B981" /> : <Copy size={16} />}
                  {copied ? 'Copied to Clipboard!' : 'Copy Decoded Text'}
                </button>
              )}

              <button
                onClick={handleReset}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.textMuted,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Scan another code
              </button>
            </div>
          ) : activeTab === 'camera' ? (
            /* Live Camera View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Camera Scanner Viewport */}
              <div style={{
                position: 'relative',
                borderRadius: 18,
                overflow: 'hidden',
                backgroundColor: '#000000',
                border: `2px solid ${colors.surfaceBorder}`,
                minHeight: 260,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div id="qr-reader-container" style={{ width: '100%', minHeight: 260 }} />

                {/* Laser scan line overlay */}
                {isScanning && (
                  <div style={{
                    position: 'absolute',
                    top: '25%',
                    left: '15%',
                    right: '15%',
                    height: 2,
                    backgroundColor: '#10B981',
                    boxShadow: '0 0 12px #10B981',
                    animation: 'pulse 1.2s infinite',
                    pointerEvents: 'none',
                  }} />
                )}

                {/* Camera Flip Switch */}
                <div style={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  zIndex: 20,
                  display: 'flex',
                  gap: 8,
                }}>
                  <button
                    onClick={() => setCameraFacing(prev => prev === 'environment' ? 'user' : 'environment')}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 20,
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: '#FFF',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <RefreshCw size={12} />
                    Flip ({cameraFacing === 'environment' ? 'Rear' : 'Front'})
                  </button>
                </div>
              </div>

              {/* Auxiliary Camera Actions */}
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  style={{
                    flex: 1,
                    padding: '11px',
                    borderRadius: 12,
                    backgroundColor: colors.surfaceCard,
                    border: `1px solid ${colors.surfaceBorder}`,
                    color: colors.text,
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    cursor: 'pointer',
                  }}
                >
                  <ImageIcon size={16} color={colors.accentLight} />
                  Upload QR Image
                </button>

                <button
                  onClick={() => startScanner()}
                  disabled={isScanning}
                  style={{
                    padding: '11px 16px',
                    borderRadius: 12,
                    backgroundColor: colors.surfaceCard,
                    border: `1px solid ${colors.surfaceBorder}`,
                    color: isScanning ? colors.textMuted : colors.accentLight,
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw size={14} />
                  Restart Camera
                </button>
              </div>

              <div style={{ textAlign: 'center', fontSize: 12, color: colors.textMuted }}>
                Point your camera directly at the QR code on another screen or printed document.
              </div>
            </div>
          ) : (
            /* Manual Token View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6, display: 'block' }}>
                  Share Token or Invitation Link
                </label>
                <input
                  type="text"
                  placeholder="Paste token or link (e.g. shtk_..., faminv_...)"
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 12,
                    backgroundColor: colors.surfaceCard,
                    border: `1px solid ${colors.surfaceBorder}`,
                    color: colors.text,
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
              </div>

              {needsPin && (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6, display: 'block' }}>
                    Security PIN (Required)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    placeholder="Enter 4-digit PIN..."
                    value={pinInput}
                    onChange={e => setPinInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 12,
                      backgroundColor: colors.surfaceCard,
                      border: `1px solid ${colors.surfaceBorder}`,
                      color: colors.text,
                      fontSize: 16,
                      outline: 'none',
                      letterSpacing: 4,
                      fontWeight: 700,
                    }}
                  />
                </div>
              )}

              <button
                onClick={() => handleResolveToken()}
                disabled={isLoading || !tokenInput.trim()}
                style={{
                  padding: 13,
                  borderRadius: 12,
                  backgroundColor: colors.accent,
                  color: '#FFF',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: (isLoading || !tokenInput.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (isLoading || !tokenInput.trim()) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Resolving Access...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={16} />
                    <span>Access Shared Record</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
