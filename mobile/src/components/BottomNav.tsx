import React from 'react';
import { Home, FolderLock, Users, Bell, UserCircle } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export type NavTab = 'home' | 'vault' | 'family' | 'alerts' | 'profile';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  unreadAlertsCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  unreadAlertsCount = 0,
}) => {
  const { colors } = useTheme();

  const tabs: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Home', icon: <Home size={20} /> },
    { id: 'vault', label: 'My Vault', icon: <FolderLock size={20} /> },
    { id: 'family', label: 'Family', icon: <Users size={20} /> },
    { id: 'alerts', label: 'Alerts', icon: <Bell size={20} /> },
    { id: 'profile', label: 'Profile', icon: <UserCircle size={20} /> },
  ];

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      backgroundColor: colors.bottomNavBg,
      borderTop: `1px solid ${colors.surfaceBorder}`,
      padding: '8px 10px calc(8px + env(safe-area-inset-bottom, 0px)) 10px',
      position: 'relative',
      flexShrink: 0,
      width: '100%',
      zIndex: 40,
      boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.15)',
    }}>
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 0',
              position: 'relative',
              color: isActive ? colors.accentLight : colors.textMuted,
              transition: 'all 0.2s ease',
            }}
          >
            {/* Active glow pip */}
            {isActive && (
              <span style={{
                position: 'absolute',
                top: 0,
                width: 24,
                height: 3,
                borderRadius: 2,
                backgroundColor: colors.accent,
                boxShadow: `0 0 8px ${colors.accent}`,
              }} />
            )}

            <div style={{
              position: 'relative',
              transform: isActive ? 'scale(1.1)' : 'scale(1)',
              transition: 'transform 0.15s ease',
            }}>
              {tab.icon}
              {tab.id === 'alerts' && unreadAlertsCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: -4,
                  right: -6,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.danger,
                }} />
              )}
            </div>

            <span style={{
              fontSize: 11,
              fontWeight: isActive ? 700 : 500,
              letterSpacing: 0.2,
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
