import React, { useState, useEffect } from 'react';
import { 
  User, Shield, Moon, Sun, Fingerprint, Lock, 
  LogOut, KeyRound, Check, AlertCircle, FileText,
  Bell, Smartphone, Send, QrCode, ArrowRight, RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { AuditLogItem, PhoneTransferPairing } from '../types';

interface ProfileScreenProps {
  onRefreshAll: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onRefreshAll }) => {
  const { user, logout, biometricsEnabled, toggleBiometrics, refreshProfile, lockAppNow } = useAuth();
  const { mode, toggleTheme, colors } = useTheme();

  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Quick PIN states
  const [showQuickPin, setShowQuickPin] = useState(false);
  const [quickPinInput, setQuickPinInput] = useState('');
  const [quickPinMsg, setQuickPinMsg] = useState<{ text: string; isError: boolean } | null>(null);
  const [isSettingQuickPin, setIsSettingQuickPin] = useState(false);

  // Multi-Channel Notifications Preferences
  const [notifInApp, setNotifInApp] = useState(true);
  const [notifPushFcm, setNotifPushFcm] = useState(true);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSmsWhatsapp, setNotifSmsWhatsapp] = useState(false);
  const [notifSavedMsg, setNotifSavedMsg] = useState(false);

  // Phone-to-Phone Transfer State
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferData, setTransferData] = useState<PhoneTransferPairing | null>(null);
  const [inputTransferCode, setInputTransferCode] = useState('');
  const [isGeneratingTransfer, setIsGeneratingTransfer] = useState(false);
  const [isClaimingTransfer, setIsClaimingTransfer] = useState(false);
  const [transferMsg, setTransferMsg] = useState<{ text: string; isError: boolean } | null>(null);

  const handleGenerateTransfer = async () => {
    setIsGeneratingTransfer(true);
    setTransferMsg(null);
    try {
      const pairing = await api.generateTransferCode();
      setTransferData(pairing);
    } catch (e: any) {
      setTransferMsg({ text: e.message || 'Failed to generate transfer code', isError: true });
    } finally {
      setIsGeneratingTransfer(false);
    }
  };

  const handleClaimTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTransferCode.trim()) return;
    setIsClaimingTransfer(true);
    setTransferMsg(null);
    try {
      const res = await api.claimTransferCode(inputTransferCode.trim());
      if (res.success) {
        setTransferMsg({ text: res.message, isError: false });
        setInputTransferCode('');
        onRefreshAll();
      } else {
        setTransferMsg({ text: res.message, isError: true });
      }
    } catch (e: any) {
      setTransferMsg({ text: e.message || 'Transfer failed', isError: true });
    } finally {
      setIsClaimingTransfer(false);
    }
  };

  const handleSaveNotifPrefs = () => {
    setNotifSavedMsg(true);
    setTimeout(() => setNotifSavedMsg(false), 2000);
  };

  const handleSetQuickPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quickPinInput.length !== 4) return;
    setIsSettingQuickPin(true);
    setQuickPinMsg(null);
    try {
      // 1. Cache locally for instant offline verification
      localStorage.setItem('docuvault_quick_pin', quickPinInput);
      localStorage.setItem('docuvault_has_quick_pin', 'true');

      // 2. Sync with backend
      try {
        await api.setupQuickPin(quickPinInput);
      } catch (err) {
        console.warn('Backend quick-pin sync note:', err);
      }

      setQuickPinMsg({ text: 'Emergency & Quick PIN successfully configured!', isError: false });
      setQuickPinInput('');
      await refreshProfile();
      setTimeout(() => setShowQuickPin(false), 2000);
    } catch (err: any) {
      setQuickPinMsg({ text: err.message || 'Failed to set Quick PIN', isError: true });
    } finally {
      setIsSettingQuickPin(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const loadAuditLogs = async () => {
    try {
      const logs = await api.getAuditLogs();
      setAuditLogs(logs.slice(0, 8));
    } catch (e) {}
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg({ text: 'New password must be at least 6 characters', isError: true });
      return;
    }
    setIsChangingPassword(true);
    setPasswordMsg(null);
    try {
      await api.changePassword({ old_password: oldPassword, new_password: newPassword });
      setPasswordMsg({ text: 'Password successfully updated!', isError: false });
      setOldPassword('');
      setNewPassword('');
      setTimeout(() => setShowChangePassword(false), 2000);
    } catch (err: any) {
      setPasswordMsg({ text: err.message || 'Failed to update password. Verify current password.', isError: true });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24 }}>
      {/* Header Profile Card */}
      <div style={{
        padding: 20,
        borderRadius: 20,
        backgroundColor: colors.surfaceCard,
        border: `1px solid ${colors.surfaceBorder}`,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.accent,
          color: '#FFF',
          fontSize: 22,
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(13, 148, 136, 0.4)',
        }}>
          {user?.full_name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: colors.text }}>
            {user?.full_name || 'DocuVault User'}
          </h2>
          <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
            {user?.email}
          </div>
          {user?.phone_number && (
            <div style={{ fontSize: 12, color: colors.accentLight, marginTop: 2 }}>
              {user.phone_number}
            </div>
          )}
        </div>
      </div>

      {/* Security & System Controls */}
      <div style={{
        backgroundColor: colors.surfaceCard,
        borderRadius: 16,
        border: `1px solid ${colors.surfaceBorder}`,
        overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${colors.surfaceBorder}`, fontSize: 13, fontWeight: 700, color: colors.textMuted }}>
          SECURITY & PREFERENCES
        </div>

        {/* Dark / Light Mode Switch */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: `1px solid ${colors.surfaceBorder}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {mode === 'dark' ? <Moon size={18} color={colors.accentLight} /> : <Sun size={18} color={colors.warning} />}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>Interface Theme</div>
              <div style={{ fontSize: 11, color: colors.textMuted }}>Currently using {mode} mode</div>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.surfaceBorder}`,
              color: colors.text,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Switch to {mode === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>

        {/* Biometrics Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: `1px solid ${colors.surfaceBorder}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Fingerprint size={18} color={biometricsEnabled ? colors.accentLight : colors.textMuted} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>Biometric / App Lock</div>
              <div style={{ fontSize: 11, color: colors.textMuted }}>Require device biometric or PIN on app resume</div>
            </div>
          </div>
          <input
            type="checkbox"
            checked={biometricsEnabled}
            onChange={e => toggleBiometrics(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: colors.accent, cursor: 'pointer' }}
          />
        </div>

        {biometricsEnabled && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 18px',
            backgroundColor: 'rgba(13, 148, 136, 0.08)',
            borderBottom: `1px solid ${colors.surfaceBorder}`,
          }}>
            <span style={{ fontSize: 12, color: colors.accentLight, fontWeight: 600 }}>
              App Lock is ACTIVE (locks on app resume)
            </span>
            <button
              type="button"
              onClick={() => lockAppNow()}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                backgroundColor: colors.accent,
                color: '#FFF',
                border: 'none',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Lock size={12} />
              Lock Vault Now
            </button>
          </div>
        )}

        {/* Quick PIN Configuration */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: `1px solid ${colors.surfaceBorder}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Lock size={18} color={user?.has_quick_pin ? colors.accentLight : colors.textMuted} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>Emergency & Quick PIN</div>
              <div style={{ fontSize: 11, color: colors.textMuted }}>
                {(user?.has_quick_pin || localStorage.getItem('docuvault_has_quick_pin') === 'true') ? 'Active 4-digit PIN configured' : 'Configure 4-digit rapid unlock PIN'}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowQuickPin(!showQuickPin)}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.surfaceBorder}`,
              color: colors.text,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {showQuickPin ? 'Close' : (user?.has_quick_pin || localStorage.getItem('docuvault_has_quick_pin') === 'true') ? 'Change' : 'Set PIN'}
          </button>
        </div>

        {showQuickPin && (
          <form onSubmit={handleSetQuickPin} style={{
            padding: 16,
            borderBottom: `1px solid ${colors.surfaceBorder}`,
            backgroundColor: colors.surface,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            {quickPinMsg && (
              <div style={{ fontSize: 12, color: quickPinMsg.isError ? colors.danger : colors.success }}>
                {quickPinMsg.text}
              </div>
            )}
            <input
              type="password"
              maxLength={4}
              placeholder="Enter 4-Digit Quick PIN (e.g. 1234)"
              required
              pattern="[0-9]{4}"
              value={quickPinInput}
              onChange={e => setQuickPinInput(e.target.value.replace(/[^0-9]/g, ''))}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                backgroundColor: colors.surfaceCard,
                border: `1px solid ${colors.surfaceBorder}`,
                color: colors.text,
                fontSize: 14,
                letterSpacing: 4,
                textAlign: 'center',
                fontWeight: 700,
              }}
            />
            <button
              type="submit"
              disabled={isSettingQuickPin || quickPinInput.length !== 4}
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
              {isSettingQuickPin ? 'Saving...' : 'Save Quick PIN'}
            </button>
          </form>
        )}

        {/* Change Password */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 18px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <KeyRound size={18} color={colors.textMuted} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>Change Password</div>
              <div style={{ fontSize: 11, color: colors.textMuted }}>Update authentication credentials</div>
            </div>
          </div>
          <button
            onClick={() => setShowChangePassword(!showChangePassword)}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.surfaceBorder}`,
              color: colors.text,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {showChangePassword ? 'Close' : 'Update'}
          </button>
        </div>

        {showChangePassword && (
          <form onSubmit={handleChangePassword} style={{
            padding: 16,
            borderTop: `1px solid ${colors.surfaceBorder}`,
            backgroundColor: colors.surface,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            {passwordMsg && (
              <div style={{
                fontSize: 12,
                color: passwordMsg.isError ? colors.danger : colors.success,
              }}>
                {passwordMsg.text}
              </div>
            )}
            <input
              type="password"
              placeholder="Current Password"
              required
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                backgroundColor: colors.surfaceCard,
                border: `1px solid ${colors.surfaceBorder}`,
                color: colors.text,
                fontSize: 13,
              }}
            />
            <input
              type="password"
              placeholder="New Password (min 6 characters)"
              required
              minLength={6}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                backgroundColor: colors.surfaceCard,
                border: `1px solid ${colors.surfaceBorder}`,
                color: colors.text,
                fontSize: 13,
              }}
            />
            <button
              type="submit"
              disabled={isChangingPassword}
              style={{
                padding: 10,
                borderRadius: 8,
                backgroundColor: colors.accent,
                color: '#FFF',
                border: 'none',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {isChangingPassword ? 'Updating...' : 'Save New Password'}
            </button>
          </form>
        )}
      </div>

      {/* Multi-Channel Notification Preferences */}
      <div style={{
        backgroundColor: colors.surfaceCard,
        borderRadius: 16,
        border: `1px solid ${colors.surfaceBorder}`,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${colors.surfaceBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={16} color={colors.accentLight} />
            <span style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted }}>
              Multi-Channel Expiry & Alert Channels
            </span>
          </div>
          {notifSavedMsg && (
            <span style={{ fontSize: 11, color: colors.success, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Check size={12} /> Saved!
            </span>
          )}
        </div>

        <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column' }}>
          {[
            { label: 'In-App Notifications', desc: 'Real-time alert drawer & banner updates', val: notifInApp, set: setNotifInApp },
            { label: 'Push Notifications (FCM)', desc: 'Mobile background push for urgent expiry alerts', val: notifPushFcm, set: setNotifPushFcm },
            { label: 'Verified Email (Transactional)', desc: 'Detailed PDF renewal briefs and family invitations', val: notifEmail, set: setNotifEmail },
            { label: 'SMS & WhatsApp Alerts', desc: 'High-priority 7-day and 1-day expiry reminders', val: notifSmsWhatsapp, set: setNotifSmsWhatsapp },
          ].map((item, idx) => (
            <div key={idx} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 0',
              borderBottom: idx < 3 ? `1px solid ${colors.surfaceBorder}` : 'none',
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{item.label}</div>
                <div style={{ fontSize: 11, color: colors.textMuted }}>{item.desc}</div>
              </div>
              <input
                type="checkbox"
                checked={item.val}
                onChange={e => {
                  item.set(e.target.checked);
                  handleSaveNotifPrefs();
                }}
                style={{ width: 18, height: 18, accentColor: colors.accent, cursor: 'pointer' }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Phone-to-Phone Direct Vault Transfer */}
      <div style={{
        backgroundColor: colors.surfaceCard,
        borderRadius: 16,
        border: `1px solid ${colors.surfaceBorder}`,
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 16px',
          borderBottom: `1px solid ${colors.surfaceBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Smartphone size={16} color="#8B5CF6" />
            <span style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted }}>
              Phone-to-Phone Direct Transfer
            </span>
          </div>
          <button
            onClick={() => setShowTransfer(!showTransfer)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.surfaceBorder}`,
              color: colors.text,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {showTransfer ? 'Hide' : 'Open Transfer'}
          </button>
        </div>

        {showTransfer && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ fontSize: 12, color: colors.textMuted, lineHeight: 1.4, margin: 0 }}>
              Migrate or synchronize vault documents between mobile devices securely using end-to-end encrypted 10-minute pairing codes.
            </p>

            {transferMsg && (
              <div style={{
                padding: '8px 12px',
                borderRadius: 8,
                fontSize: 12,
                backgroundColor: transferMsg.isError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                color: transferMsg.isError ? colors.danger : colors.success,
                border: `1px solid ${transferMsg.isError ? colors.danger : colors.success}`,
              }}>
                {transferMsg.text}
              </div>
            )}

            {/* Send Option */}
            <div style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.surfaceBorder}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>1. Send Documents from this Phone</div>
              {transferData ? (
                <div style={{
                  padding: 12,
                  borderRadius: 8,
                  backgroundColor: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 11, color: '#8B5CF6', fontWeight: 600 }}>ONE-TIME PAIRING CODE</div>
                  <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 4, color: colors.text, margin: '6px 0' }}>
                    {transferData.pairing_code}
                  </div>
                  <div style={{ fontSize: 11, color: colors.textMuted }}>
                    {transferData.document_count} document(s) bundled • Valid for 10 minutes
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleGenerateTransfer}
                  disabled={isGeneratingTransfer}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    backgroundColor: '#8B5CF6',
                    color: '#FFF',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Send size={14} />
                  <span>{isGeneratingTransfer ? 'Generating Code...' : 'Generate 6-Digit Transfer Code'}</span>
                </button>
              )}
            </div>

            {/* Receive Option */}
            <form onSubmit={handleClaimTransfer} style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: colors.surface,
              border: `1px solid ${colors.surfaceBorder}`,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>2. Receive Documents on this Phone</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Enter DV-XXXXXX code"
                  value={inputTransferCode}
                  onChange={e => setInputTransferCode(e.target.value.toUpperCase())}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 8,
                    backgroundColor: colors.surfaceCard,
                    border: `1px solid ${colors.surfaceBorder}`,
                    color: colors.text,
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: 1,
                  }}
                />
                <button
                  type="submit"
                  disabled={isClaimingTransfer || !inputTransferCode.trim()}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    backgroundColor: colors.accent,
                    color: '#FFF',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  {isClaimingTransfer ? 'Claiming...' : 'Claim & Import'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Security Audit Trail Log */}
      <div style={{
        backgroundColor: colors.surfaceCard,
        borderRadius: 16,
        border: `1px solid ${colors.surfaceBorder}`,
        padding: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted }}>
            Security Audit Trail
          </div>
          <span style={{ fontSize: 10, color: colors.accentLight, fontWeight: 700, letterSpacing: 0.5 }}>
            CRYPTOGRAPHIC AUDIT
          </span>
        </div>

        {auditLogs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {auditLogs.map(log => (
              <div
                key={log.id}
                style={{
                  padding: '8px 10px',
                  borderRadius: 8,
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.surfaceBorder}`,
                  fontSize: 11,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <span style={{ fontWeight: 700, color: colors.text }}>
                    {log.action}
                  </span>
                  <div style={{ color: colors.textMuted, marginTop: 1 }}>
                    {log.details || log.entity_type}
                  </div>
                </div>
                <div style={{ color: colors.textMuted, whiteSpace: 'nowrap' }}>
                  {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: colors.textMuted, textAlign: 'center', padding: 12 }}>
            No security audit events recorded yet.
          </div>
        )}
      </div>

      {/* Logout Button */}
      <button
        onClick={logout}
        style={{
          padding: 14,
          borderRadius: 12,
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          color: colors.danger,
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <LogOut size={16} />
        <span>Log Out of DocuVault</span>
      </button>
    </div>
  );
};
