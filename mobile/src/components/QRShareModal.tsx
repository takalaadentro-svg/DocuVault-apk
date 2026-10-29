import React, { useState, useEffect } from 'react';
import { X, QrCode, Copy, Check, ShieldCheck, Clock, Eye, Lock, AlertCircle, Trash2, Share2, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Share } from '@capacitor/share';
import { DocumentItem, ShareTokenItem } from '../types';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface QRShareModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QRShareModal: React.FC<QRShareModalProps> = ({
  document: initialDoc,
  isOpen,
  onClose,
}) => {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<'create' | 'active'>('create');
  const [expiresInHours, setExpiresInHours] = useState<number>(24);
  const [maxAccessCount, setMaxAccessCount] = useState<number | undefined>(undefined);
  const [pin, setPin] = useState('');
  const [usePin, setUsePin] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [createdShare, setCreatedShare] = useState<ShareTokenItem | null>(null);
  const [activeShares, setActiveShares] = useState<ShareTokenItem[]>([]);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadActiveShares();
      setCreatedShare(null);
      setCopied(false);
      setErrorMessage(null);
    }
  }, [isOpen]);

  const loadActiveShares = async () => {
    try {
      const shares = await api.getActiveShares();
      setActiveShares(shares);
    } catch (e) {}
  };

  if (!isOpen || !initialDoc) return null;

  const handleGenerateShare = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const share = await api.createShareToken({
        document_id: initialDoc.id,
        expires_in_hours: expiresInHours,
        max_access_count: maxAccessCount,
        pin: usePin && pin.trim().length >= 4 ? pin.trim() : undefined,
      });
      setCreatedShare(share);
      loadActiveShares();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate share token');
    } finally {
      setIsLoading(false);
    }
  };

  const fullShareUrl = createdShare 
    ? (createdShare.share_url && !createdShare.share_url.includes('localhost') 
        ? createdShare.share_url 
        : api.getPublicShareViewUrl(createdShare.token))
    : '';

  const handleCopyLink = () => {
    if (!fullShareUrl) return;
    navigator.clipboard.writeText(fullShareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareViaApp = async () => {
    if (!fullShareUrl) return;
    try {
      await Share.share({
        title: `DocuVault: ${initialDoc.title}`,
        text: `Access securely shared document "${initialDoc.title}" via DocuVault:`,
        url: fullShareUrl,
        dialogTitle: 'Share Document with DocuVault',
      });
    } catch (e) {
      if (navigator.share) {
        try {
          await navigator.share({
            title: `DocuVault: ${initialDoc.title}`,
            text: `Access securely shared document "${initialDoc.title}":`,
            url: fullShareUrl,
          });
          return;
        } catch (ignored) {}
      }
      handleCopyLink();
    }
  };

  const handleRevokeShare = async (shareId: string) => {
    try {
      await api.revokeShareToken(shareId);
      loadActiveShares();
      if (createdShare?.id === shareId) {
        setCreatedShare(null);
      }
    } catch (e: any) {
      alert(e.message || 'Failed to revoke share link');
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
        maxWidth: 520,
        maxHeight: '90vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
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
            <h2 style={{ fontSize: 18, fontWeight: 700, color: colors.text }}>QR-Code Document Share</h2>
            <p style={{ fontSize: 12, color: colors.textMuted }}>
              Zero-knowledge tokenized sharing with expiry & limits
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

        {/* Tab switch */}
        <div style={{
          display: 'flex',
          borderBottom: `1px solid ${colors.surfaceBorder}`,
          backgroundColor: colors.surfaceCard,
        }}>
          <button
            onClick={() => setActiveTab('create')}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              background: 'none',
              fontSize: 13,
              fontWeight: activeTab === 'create' ? 700 : 500,
              color: activeTab === 'create' ? colors.accentLight : colors.textMuted,
              borderBottom: activeTab === 'create' ? `2px solid ${colors.accent}` : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            Create Share Token
          </button>
          <button
            onClick={() => setActiveTab('active')}
            style={{
              flex: 1,
              padding: '10px',
              border: 'none',
              background: 'none',
              fontSize: 13,
              fontWeight: activeTab === 'active' ? 700 : 500,
              color: activeTab === 'active' ? colors.accentLight : colors.textMuted,
              borderBottom: activeTab === 'active' ? `2px solid ${colors.accent}` : '2px solid transparent',
              cursor: 'pointer',
            }}
          >
            Active Shares ({activeShares.length})
          </button>
        </div>

        <div style={{ padding: 22, overflowY: 'auto' }}>
          {activeTab === 'create' ? (
            <div>
              {createdShare ? (
                /* Generated QR Code View */
                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    padding: 16,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    display: 'inline-block',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                    margin: '12px auto 20px',
                  }}>
                    <QRCodeSVG
                      value={fullShareUrl}
                      size={200}
                      level="H"
                      includeMargin={false}
                    />
                  </div>

                  <div style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginBottom: 4 }}>
                    {initialDoc.title}
                  </div>
                  <div style={{ fontSize: 12, color: colors.textMuted, marginBottom: 20 }}>
                    Recipient can scan this code or open the link below.
                  </div>

                  {/* Share Link Box */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 10,
                    backgroundColor: colors.surfaceCard,
                    border: `1px solid ${colors.surfaceBorder}`,
                    marginBottom: 20,
                  }}>
                    <input
                      type="text"
                      readOnly
                      value={fullShareUrl}
                      style={{
                        flex: 1,
                        background: 'none',
                        border: 'none',
                        color: colors.text,
                        fontSize: 12,
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={handleCopyLink}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        backgroundColor: colors.surface,
                        border: `1px solid ${colors.surfaceBorder}`,
                        color: colors.text,
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                      <span>{copied ? 'Copied!' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={handleShareViaApp}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        backgroundColor: colors.accent,
                        color: '#FFF',
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Share2 size={14} />
                      <span>Share</span>
                    </button>
                  </div>

                  {/* Share Security Specs */}
                  <div style={{
                    padding: 12,
                    borderRadius: 10,
                    backgroundColor: colors.surfaceCard,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10,
                    textAlign: 'left',
                    fontSize: 12,
                    marginBottom: 20,
                  }}>
                    <div>
                      <span style={{ color: colors.textMuted }}>Expires: </span>
                      <span style={{ fontWeight: 600, color: colors.text }}>
                        {createdShare.expires_at ? new Date(createdShare.expires_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' }) : 'Never'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: colors.textMuted }}>Access Limit: </span>
                      <span style={{ fontWeight: 600, color: colors.text }}>
                        {createdShare.max_access_count ? `${createdShare.max_access_count} view max` : 'Unlimited'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setCreatedShare(null)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: 10,
                      backgroundColor: colors.surfaceCard,
                      border: `1px solid ${colors.surfaceBorder}`,
                      color: colors.text,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Configure Another Share
                  </button>
                </div>
              ) : (
                /* Share Configuration Form */
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

                  <div style={{
                    padding: 14,
                    borderRadius: 12,
                    backgroundColor: colors.surfaceCard,
                    border: `1px solid ${colors.surfaceBorder}`,
                  }}>
                    <div style={{ fontSize: 11, color: colors.textMuted }}>Sharing Document</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: colors.text, marginTop: 2 }}>
                      {initialDoc.title}
                    </div>
                    <div style={{ fontSize: 11, color: colors.accentLight, marginTop: 2 }}>
                      Category: {initialDoc.category}
                    </div>
                  </div>

                  {/* Expiration Presets */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 8 }}>
                      Link Expiration Duration
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                      {[
                        { hours: 1, label: '1 Hour' },
                        { hours: 24, label: '24 Hours' },
                        { hours: 168, label: '7 Days' },
                        { hours: 720, label: '30 Days' },
                      ].map(opt => (
                        <button
                          key={opt.hours}
                          type="button"
                          onClick={() => setExpiresInHours(opt.hours)}
                          style={{
                            padding: '10px 4px',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: expiresInHours === opt.hours ? 700 : 500,
                            backgroundColor: expiresInHours === opt.hours ? colors.accent : colors.surfaceCard,
                            color: expiresInHours === opt.hours ? '#FFF' : colors.text,
                            border: `1px solid ${expiresInHours === opt.hours ? colors.accent : colors.surfaceBorder}`,
                            cursor: 'pointer',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Access Limit Presets */}
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 8 }}>
                      Maximum View Limit
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {[
                        { limit: 1, label: '1 View (Burn)' },
                        { limit: 5, label: '5 Views' },
                        { limit: undefined, label: 'Unlimited' },
                      ].map((opt, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setMaxAccessCount(opt.limit)}
                          style={{
                            padding: '10px 4px',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: maxAccessCount === opt.limit ? 700 : 500,
                            backgroundColor: maxAccessCount === opt.limit ? colors.accent : colors.surfaceCard,
                            color: maxAccessCount === opt.limit ? '#FFF' : colors.text,
                            border: `1px solid ${maxAccessCount === opt.limit ? colors.accent : colors.surfaceBorder}`,
                            cursor: 'pointer',
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* PIN Code Protection Toggle */}
                  <div style={{
                    padding: 12,
                    borderRadius: 10,
                    backgroundColor: colors.surfaceCard,
                    border: `1px solid ${colors.surfaceBorder}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Lock size={16} color={usePin ? colors.accentLight : colors.textMuted} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                          Require 4-Digit Security PIN
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={usePin}
                        onChange={e => setUsePin(e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: colors.accent, cursor: 'pointer' }}
                      />
                    </div>
                    {usePin && (
                      <div style={{ marginTop: 10 }}>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="e.g. 5432"
                          value={pin}
                          onChange={e => setPin(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            borderRadius: 8,
                            backgroundColor: colors.surface,
                            border: `1px solid ${colors.surfaceBorder}`,
                            color: colors.text,
                            fontSize: 14,
                            outline: 'none',
                            letterSpacing: 2,
                            fontWeight: 700,
                          }}
                        />
                        <div style={{ fontSize: 10, color: colors.textMuted, marginTop: 4 }}>
                          Recipient must enter this PIN code before viewing the document.
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleGenerateShare}
                    disabled={isLoading}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      backgroundColor: colors.accent,
                      color: '#FFF',
                      border: 'none',
                      fontSize: 15,
                      fontWeight: 700,
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 4px 14px rgba(13, 148, 136, 0.4)',
                    }}
                  >
                    <QrCode size={18} />
                    <span>{isLoading ? 'Generating Encrypted Token...' : 'Generate QR Share Code'}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Active Shares List */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeShares.length > 0 ? (
                activeShares.map(share => (
                  <div
                    key={share.id}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      backgroundColor: colors.surfaceCard,
                      border: `1px solid ${colors.surfaceBorder}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>
                        {share.document_title || initialDoc.title || 'Shared Document'}
                      </div>
                      <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                        Views: {share.access_count ?? 0} {share.max_access_count ? `/ ${share.max_access_count}` : ''} • 
                        Expires: {share.expires_at ? new Date(share.expires_at).toLocaleDateString() : 'Never'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => {
                          const url = share.share_url && !share.share_url.includes('localhost') 
                            ? share.share_url 
                            : api.getPublicShareViewUrl(share.token);
                          navigator.clipboard.writeText(url);
                          alert('Share link copied to clipboard!');
                        }}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 8,
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.surfaceBorder}`,
                          color: colors.text,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Copy size={13} />
                        <span>Copy</span>
                      </button>
                      <button
                        onClick={() => handleRevokeShare(share.id)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: colors.danger,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Trash2 size={13} />
                        <span>Revoke</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: 30, color: colors.textMuted, fontSize: 13 }}>
                  No active share links. Create one from the tab above!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
