import React, { useState } from 'react';
import { X, UserPlus, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface FamilyInviteModalProps {
  familyId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const FamilyInviteModal: React.FC<FamilyInviteModalProps> = ({
  familyId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'MEMBER' | 'EMERGENCY_CONTACT'>('MEMBER');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    try {
      await api.inviteFamilyMember(familyId, {
        invitee_email: email.trim(),
        role,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send invitation');
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
      backdropFilter: 'blur(4px)',
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
        maxWidth: 460,
        padding: 22,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: colors.text }}>Invite Family Member</h2>
            <p style={{ fontSize: 12, color: colors.textMuted }}>Invite trusted members to your Family Vault</p>
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
            marginBottom: 16,
          }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
              Family Member Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="e.g. spouse@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
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

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: colors.textMuted, marginBottom: 6 }}>
              Vault Access Role
            </label>
            <select
              value={role}
              onChange={e => setRole(e.target.value as any)}
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
              <option value="MEMBER">Member (Can access documents explicitly shared with them)</option>
              <option value="ADMIN">Admin (Can manage settings and invite other members)</option>
              <option value="EMERGENCY_CONTACT">Emergency Contact (Access during emergency workflows)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{
              padding: 12,
              borderRadius: 10,
              backgroundColor: colors.accent,
              color: '#FFF',
              border: 'none',
              fontSize: 14,
              fontWeight: 700,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: 6,
            }}
          >
            <UserPlus size={16} />
            <span>{isLoading ? 'Sending Invitation...' : 'Send Invitation'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
