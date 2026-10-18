import React, { useState } from 'react';
import { X, Camera, KeyRound, Download, FileText, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { SharedDocumentViewData } from '../types';
import { useTheme } from '../context/ThemeContext';

interface ScanQRModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScanQRModal: React.FC<ScanQRModalProps> = ({ isOpen, onClose }) => {
  const { colors } = useTheme();
  const [tokenInput, setTokenInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [needsPin, setNeedsPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sharedDoc, setSharedDoc] = useState<SharedDocumentViewData | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  if (!isOpen) return null;

  const handleResolveToken = async (tokenToUse?: string) => {
    let cleanToken = (tokenToUse || tokenInput).trim();
    if (!cleanToken) return;

    // If user pasted a full URL like http://.../share/XYZ
    if (cleanToken.includes('/share/')) {
      cleanToken = cleanToken.split('/share/').pop()?.split('?')[0] || cleanToken;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await api.viewSharedDocument(cleanToken, pinInput.trim() || undefined);
      setSharedDoc(data);
      setNeedsPin(false);
    } catch (err: any) {
      if (err.message?.includes('PIN') || err.message?.includes('401')) {
        setNeedsPin(true);
        setErrorMessage('This shared document is protected by a PIN. Please enter the PIN code.');
      } else {
        setErrorMessage(err.message || 'Invalid or expired share token.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulateScan = () => {
    setIsCameraActive(true);
    setTimeout(async () => {
      setIsCameraActive(false);
      // Fetch latest active share token or prompt user
      try {
        const shares = await api.getActiveShares();
        if (shares.length > 0) {
          setTokenInput(shares[0].token);
          handleResolveToken(shares[0].token);
        } else {
          setErrorMessage('No test share tokens found. Please paste a token or share URL.');
        }
      } catch (e) {
        setErrorMessage('Please paste a token or share URL manually.');
      }
    }, 1200);
  };

  const handleReset = () => {
    setSharedDoc(null);
    setTokenInput('');
    setPinInput('');
    setNeedsPin(false);
    setErrorMessage(null);
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
        maxWidth: 500,
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: `1px solid ${colors.surfaceBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: colors.text }}>Scan / Open Shared Document</h2>
            <p style={{ fontSize: 12, color: colors.textMuted }}>
              Access documents shared via DocuVault QR or Token
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

        <div style={{ padding: 22 }}>
          {sharedDoc ? (
            /* Document Display Card */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                textAlign: 'center',
                padding: '16px 0',
                borderBottom: `1px solid ${colors.surfaceBorder}`,
              }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '4px 12px',
                  borderRadius: 20,
                  backgroundColor: 'rgba(13, 148, 136, 0.15)',
                  color: colors.accentLight,
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 10,
                }}>
                  <ShieldCheck size={14} />
                  <span>VERIFIED SHARED ARTIFACT</span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: colors.text }}>
                  {sharedDoc.title}
                </h3>
                <p style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
                  Issued by {sharedDoc.issuer || 'Official Authority'} • Shared by {sharedDoc.owner_name}
                </p>
              </div>

              {/* Metadata Box */}
              <div style={{
                padding: 14,
                borderRadius: 12,
                backgroundColor: colors.surfaceCard,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                fontSize: 12,
              }}>
                <div>
                  <span style={{ color: colors.textMuted }}>Category: </span>
                  <span style={{ fontWeight: 600, color: colors.text }}>{sharedDoc.category}</span>
                </div>
                <div>
                  <span style={{ color: colors.textMuted }}>File Size: </span>
                  <span style={{ fontWeight: 600, color: colors.text }}>{(sharedDoc.file_size / 1024).toFixed(1)} KB</span>
                </div>
                <div>
                  <span style={{ color: colors.textMuted }}>Issue Date: </span>
                  <span style={{ fontWeight: 600, color: colors.text }}>{sharedDoc.issue_date || 'N/A'}</span>
                </div>
                <div>
                  <span style={{ color: colors.textMuted }}>Expiry: </span>
                  <span style={{ fontWeight: 600, color: colors.text }}>{sharedDoc.expiry_date || 'None'}</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <a
                  href={sharedDoc.preview_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '12px',
                    borderRadius: 10,
                    backgroundColor: colors.accent,
                    color: '#FFF',
                    fontWeight: 700,
                    fontSize: 14,
                    textAlign: 'center',
                    textDecoration: 'none',
                    boxShadow: '0 4px 14px rgba(13, 148, 136, 0.4)',
                  }}
                >
                  View / Preview Document
                </a>

                <a
                  href={sharedDoc.download_url}
                  style={{
                    padding: '12px',
                    borderRadius: 10,
                    backgroundColor: colors.surfaceCard,
                    border: `1px solid ${colors.surfaceBorder}`,
                    color: colors.text,
                    fontWeight: 600,
                    fontSize: 14,
                    textAlign: 'center',
                    textDecoration: 'none',
                  }}
                >
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
                    marginTop: 6,
                  }}
                >
                  Scan another code
                </button>
              </div>
            </div>
          ) : (
            /* Scanning / Input View */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {errorMessage && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#FCA5A5',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                  <AlertCircle size={16} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Simulated Camera Viewfinder */}
              <div
                onClick={handleSimulateScan}
                style={{
                  height: 180,
                  borderRadius: 16,
                  backgroundColor: '#000000',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: `2px solid ${colors.surfaceBorder}`,
                }}
              >
                {/* Reticle brackets */}
                <div style={{
                  width: 120,
                  height: 120,
                  border: `2px solid ${isCameraActive ? '#10B981' : colors.accent}`,
                  borderRadius: 12,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {isCameraActive ? (
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      height: 2,
                      backgroundColor: '#10B981',
                      boxShadow: '0 0 10px #10B981',
                      animation: 'scan 1.2s infinite ease-in-out',
                    }} />
                  ) : null}
                  <Camera size={32} color={colors.accentLight} opacity={0.8} />
                </div>

                <div style={{
                  position: 'absolute',
                  bottom: 12,
                  fontSize: 12,
                  color: '#94A3B8',
                  fontWeight: 600,
                }}>
                  {isCameraActive ? 'Scanning optical code...' : 'Tap to simulate QR Camera Scan'}
                </div>
              </div>

              <div style={{ textAlign: 'center', fontSize: 12, color: colors.textMuted }}>
                — OR ENTER SHARE TOKEN MANUALLY —
              </div>

              {/* Manual Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 4, display: 'block' }}>
                    Share Token or Link
                  </label>
                  <input
                    type="text"
                    placeholder="Paste token or share URL here..."
                    value={tokenInput}
                    onChange={e => setTokenInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 10,
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
                    <label style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 4, display: 'block' }}>
                      Security PIN
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      placeholder="Enter 4-digit PIN..."
                      value={pinInput}
                      onChange={e => setPinInput(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        backgroundColor: colors.surfaceCard,
                        border: `1px solid ${colors.surfaceBorder}`,
                        color: colors.text,
                        fontSize: 14,
                        outline: 'none',
                        letterSpacing: 3,
                        fontWeight: 700,
                      }}
                    />
                  </div>
                )}

                <button
                  onClick={() => handleResolveToken()}
                  disabled={isLoading || !tokenInput.trim()}
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    backgroundColor: colors.accent,
                    color: '#FFF',
                    border: 'none',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: (isLoading || !tokenInput.trim()) ? 'not-allowed' : 'pointer',
                    opacity: (isLoading || !tokenInput.trim()) ? 0.6 : 1,
                  }}
                >
                  {isLoading ? 'Verifying Token...' : 'Access Shared Document'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
