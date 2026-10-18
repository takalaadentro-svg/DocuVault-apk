import React from 'react';
import { ShieldCheck, Bell, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  onOpenAlerts: () => void;
  unreadCount?: number;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAlerts, unreadCount = 0 }) => {
  const { user } = useAuth();
  const { colors } = useTheme();

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 20px',
      backgroundColor: colors.surface,
      borderBottom: `1px solid ${colors.surfaceBorder}`,
      position: 'relative',
      flexShrink: 0,
      width: '100%',
      zIndex: 40,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          background: 'linear-gradient(135deg, #0D9488 0%, #1E3A8A 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)',
        }}>
          <ShieldCheck size={22} color="#FFFFFF" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: 19,
              fontWeight: 800,
              letterSpacing: 0.3,
              color: colors.text,
            }}>
              Docu<span style={{ color: colors.accent }}>Vault</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              display: 'inline-block',
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: colors.accent,
            }} />
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 0.8,
              color: colors.textMuted,
              textTransform: 'uppercase',
            }}>
              AES-256 Vault Protected
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Alerts Bell */}
        <button
          onClick={onOpenAlerts}
          aria-label="View notifications"
          style={{
            position: 'relative',
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: colors.surfaceCard,
            border: `1px solid ${colors.surfaceBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: colors.text,
            transition: 'background-color 0.2s',
          }}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: -3,
              right: -3,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: colors.danger,
              color: '#FFF',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              border: `2px solid ${colors.surface}`,
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Avatar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 10px 4px 4px',
          borderRadius: 24,
          backgroundColor: colors.surfaceCard,
          border: `1px solid ${colors.surfaceBorder}`,
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: colors.accent,
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <span style={{
            fontSize: 12,
            fontWeight: 600,
            color: colors.text,
            maxWidth: 80,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {user?.full_name?.split(' ')[0] || 'User'}
          </span>
        </div>
      </div>
    </header>
  );
};
