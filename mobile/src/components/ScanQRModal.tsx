import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Camera, KeyRound, Download, FileText, AlertCircle, 
  CheckCircle2, ShieldCheck, Image as ImageIcon, RefreshCw, 
  ExternalLink, Copy, Check, Users, FolderLock, Lock
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { api, extractShareToken } from '../services/api';
import { SharedDocumentViewData } from '../types';
import { useTheme } from '../context/ThemeContext';

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

  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
    if (isOpen && activeTab === 'camera') {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isOpen, activeTab, cameraFacing]);

  const startScanner = async () => {
    // Wait for DOM element
    setTimeout(async () => {
      const container = document.getElementById('qr-reader-container');
      if (!container) return;

      try {
        if (qrScannerRef.current) {
          try {
            await qrScannerRef.current.stop();
          } catch (e) {}
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
      } catch (e) {}
      qrScannerRef.current = null;
    }
    setIsScanning(false);
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
    let rawToken = (tokenToUse || tokenInput).trim();
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
      const data = await api.viewSharedDocument(cleanToken, pinInput.trim() || undefined);
      setSharedDoc(data);
      setNeedsPin(false);
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
        maxHeight: '90vh',
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
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
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
                }}>
                  <FileText size={24} />
                </div>
                <div>
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

              {sharedDoc.mime_type?.startsWith('image/') && (
                <div style={{
                  padding: 8,
                  backgroundColor: '#020617',
                  borderRadius: 12,
                  border: `1px solid ${colors.surfaceBorder}`,
                  textAlign: 'center',
                  maxHeight: 220,
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <img
                    src={sharedDoc.preview_url}
                    alt={sharedDoc.title}
                    style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain', borderRadius: 8 }}
                  />
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

                <a
                  href={sharedDoc.preview_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '12px',
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
                  View / Preview Document
                </a>

                <a
                  href={sharedDoc.download_url}
                  style={{
                    padding: '12px',
                    borderRadius: 12,
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.surfaceBorder}`,
                    color: colors.text,
                    fontWeight: 600,
                    fontSize: 14,
                    textAlign: 'center',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <Download size={16} />
                  Download File
                </a>

                <button
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
