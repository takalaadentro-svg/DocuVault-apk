import React, { useState } from 'react';
import { X, ShieldAlert, AlertTriangle, FileText, Download, CheckCircle2, HeartPulse } from 'lucide-react';
import { api } from '../services/api';
import { EmergencyContact, DocumentItem, EmergencyMedicalInfo } from '../types';
import { useTheme } from '../context/ThemeContext';

interface EmergencyAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: EmergencyContact[];
}

export const EmergencyAccessModal: React.FC<EmergencyAccessModalProps> = ({
  isOpen,
  onClose,
  contacts,
}) => {
  const { colors } = useTheme();
  const [selectedContactId, setSelectedContactId] = useState<string>(contacts[0]?.id || '');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [vaultData, setVaultData] = useState<{
    owner_name: string;
    owner_phone?: string;
    owner_email: string;
    medical_info?: EmergencyMedicalInfo;
    eligible_documents: DocumentItem[];
  } | null>(null);

  if (!isOpen) return null;

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMessage('A valid clinical or legal justification reason is strictly required.');
      return;
    }

    const contact = contacts.find(c => c.id === selectedContactId) || contacts[0];
    if (!contact) {
      setErrorMessage('No configured emergency relationship selected.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const data = await api.accessEmergencyVault(contact.user_id, {
        reason: reason.trim(),
        emergency_contact_id: contact.id,
      });
      setVaultData(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Emergency access authorization check failed.');
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
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      backdropFilter: 'blur(6px)',
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
        maxWidth: 580,
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px',
          borderBottom: `1px solid ${colors.surfaceBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.danger,
            }}>
              <ShieldAlert size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: colors.text }}>Emergency Vault Access Protocol</h2>
              <p style={{ fontSize: 11, color: colors.textMuted }}>Cryptographically audited urgent access workflow</p>
            </div>
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
          {vaultData ? (
            /* Unlocked Emergency Vault Card */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                padding: '12px 16px',
                borderRadius: 12,
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid #10B981',
                color: '#6EE7B7',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <CheckCircle2 size={18} />
                <span>Emergency Access Authorized • Immutable audit log written to secure ledger</span>
              </div>

              {/* Owner Card */}
              <div style={{
                padding: 14,
                borderRadius: 12,
                backgroundColor: colors.surfaceCard,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 11, color: colors.textMuted }}>Vault Owner</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: colors.text, marginTop: 2 }}>
                    {vaultData.owner_name}
                  </div>
                  <div style={{ fontSize: 12, color: colors.accentLight, marginTop: 2 }}>
                    {vaultData.owner_phone || vaultData.owner_email}
                  </div>
                </div>
              </div>

              {/* Medical Information */}
              {vaultData.medical_info && (
                <div style={{
                  padding: 16,
                  borderRadius: 14,
                  backgroundColor: colors.surfaceCard,
                  border: `1px solid ${colors.surfaceBorder}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <HeartPulse size={18} color={colors.danger} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>
                      Emergency Medical Profile
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
                    <div>
                      <span style={{ color: colors.textMuted }}>Blood Group: </span>
                      <span style={{ fontWeight: 700, color: colors.danger }}>
                        {vaultData.medical_info.blood_group || 'Not recorded'}
                      </span>
                    </div>
                    <div>
                      <span style={{ color: colors.textMuted }}>Organ Donor: </span>
                      <span style={{ fontWeight: 600, color: colors.text }}>
                        {vaultData.medical_info.organ_donor ? 'YES' : 'NO'}
                      </span>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: colors.textMuted }}>Known Allergies: </span>
                      <span style={{ fontWeight: 600, color: colors.text }}>
                        {vaultData.medical_info.allergies || 'None reported'}
                      </span>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: colors.textMuted }}>Chronic Conditions: </span>
                      <span style={{ fontWeight: 600, color: colors.text }}>
                        {vaultData.medical_info.chronic_conditions || 'None'}
                      </span>
                    </div>
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: colors.textMuted }}>Current Medications: </span>
                      <span style={{ fontWeight: 600, color: colors.text }}>
                        {vaultData.medical_info.current_medications || 'None'}
                      </span>
                    </div>
                    {vaultData.medical_info.emergency_notes && (
                      <div style={{ gridColumn: 'span 2', marginTop: 4, padding: 8, borderRadius: 8, backgroundColor: colors.surface }}>
                        <span style={{ color: colors.textMuted, display: 'block', fontSize: 11, marginBottom: 2 }}>
                          Emergency Instructions:
                        </span>
                        <span style={{ fontWeight: 500, color: colors.text }}>
                          {vaultData.medical_info.emergency_notes}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Eligible Documents List */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, marginBottom: 8 }}>
                  Emergency-Eligible Documents ({vaultData.eligible_documents.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {vaultData.eligible_documents.map(doc => (
                    <div
                      key={doc.id}
                      style={{
                        padding: 12,
                        borderRadius: 10,
                        backgroundColor: colors.surfaceCard,
                        border: `1px solid ${colors.surfaceBorder}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FileText size={18} color={colors.accentLight} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                            {doc.title}
                          </div>
                          <div style={{ fontSize: 11, color: colors.textMuted }}>
                            {doc.category} • {doc.issuer || 'Official'}
                          </div>
                        </div>
                      </div>
                      <a
                        href={api.getDocumentPreviewUrl(doc.id)}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          backgroundColor: colors.accent,
                          color: '#FFF',
                          fontSize: 12,
                          fontWeight: 600,
                          textDecoration: 'none',
                        }}
                      >
                        Preview
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Emergency Request Form */
            <form onSubmit={handleRequestAccess} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                  <AlertTriangle size={16} />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div style={{
                padding: 14,
                borderRadius: 12,
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: colors.warning,
                fontSize: 12,
                lineHeight: 1.5,
              }}>
                <strong>Important Notice:</strong> Emergency access is recorded in an immutable, permanent audit log with your digital signature, timestamp, and IP address. The vault owner receives immediate notification.
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
                  Select Delegated Emergency Contact Authority
                </label>
                <select
                  value={selectedContactId}
                  onChange={e => setSelectedContactId(e.target.value)}
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
                >
                  {contacts.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.relationship_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
                  Reason for Emergency Access *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="State the emergency reason (e.g. Urgent hospitalization, medical emergency, ICU admission)..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    backgroundColor: colors.surfaceCard,
                    border: `1px solid ${colors.surfaceBorder}`,
                    color: colors.text,
                    fontSize: 14,
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  backgroundColor: colors.danger,
                  color: '#FFF',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                }}
              >
                <ShieldAlert size={18} />
                <span>{isLoading ? 'Verifying Authorization...' : 'Confirm & Request Emergency Access'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
