import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './context/AuthContext';
import { useTheme } from './context/ThemeContext';
import { api } from './services/api';
import { DocumentItem, FamilyGroup, FamilyInvitation, EmergencyContact, EmergencyMedicalInfo, NotificationItem, DashboardStats } from './types';

import { Header } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { HomeScreen } from './screens/HomeScreen';
import { VaultScreen } from './screens/VaultScreen';
import { FamilyScreen } from './screens/FamilyScreen';
import { AlertsScreen } from './screens/AlertsScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { AuthScreen } from './screens/AuthScreen';

import { UploadModal } from './components/UploadModal';
import { DocumentDetailsModal } from './components/DocumentDetailsModal';
import { QRShareModal } from './components/QRShareModal';
import { ScanQRModal } from './components/ScanQRModal';
import { FamilyInviteModal } from './components/FamilyInviteModal';
import { EmergencyAccessModal } from './components/EmergencyAccessModal';
import { BiometricLockOverlay } from './components/BiometricLockOverlay';
import { AssistantModal } from './components/AssistantModal';

export const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading: authLoading, isLocked } = useAuth();
  const { colors } = useTheme();
  const queryClient = useQueryClient();

  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [selectedDocForDetails, setSelectedDocForDetails] = useState<DocumentItem | null>(null);
  const [selectedDocForShare, setSelectedDocForShare] = useState<DocumentItem | null>(null);
  const [inviteFamilyId, setInviteFamilyId] = useState<string | null>(null);
  const [isEmergencyAccessOpen, setIsEmergencyAccessOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Queries with Real-time automatic updates (every 12 seconds)
  const { data: documents = [], refetch: refetchDocs } = useQuery<DocumentItem[]>({
    queryKey: ['documents'],
    queryFn: () => api.getDocuments(),
    enabled: isAuthenticated,
    refetchInterval: 12000,
  });

  const { data: stats = null, refetch: refetchStats } = useQuery<DashboardStats>({
    queryKey: ['dashboard_stats'],
    queryFn: () => api.getDashboardStats(),
    enabled: isAuthenticated,
    refetchInterval: 12000,
  });

  const { data: notifications = [], refetch: refetchNotifs } = useQuery<NotificationItem[]>({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(),
    enabled: isAuthenticated,
    refetchInterval: 12000,
  });

  const { data: families = [], refetch: refetchFamilies } = useQuery<FamilyGroup[]>({
    queryKey: ['families'],
    queryFn: () => api.getFamilies(),
    enabled: isAuthenticated,
  });

  const { data: invitations = [], refetch: refetchInvites } = useQuery<FamilyInvitation[]>({
    queryKey: ['invitations'],
    queryFn: () => api.getPendingInvitations(),
    enabled: isAuthenticated,
  });

  const { data: sharedWithMe = [], refetch: refetchSharedWithMe } = useQuery<DocumentItem[]>({
    queryKey: ['shared_with_me'],
    queryFn: () => api.getSharedWithMe(),
    enabled: isAuthenticated,
  });

  const { data: sharedByMe = [], refetch: refetchSharedByMe } = useQuery<DocumentItem[]>({
    queryKey: ['shared_by_me'],
    queryFn: () => api.getSharedByMe(),
    enabled: isAuthenticated,
  });

  const { data: emergencyContacts = [], refetch: refetchEmergencyContacts } = useQuery<EmergencyContact[]>({
    queryKey: ['emergency_contacts'],
    queryFn: () => api.getEmergencyContacts(),
    enabled: isAuthenticated,
  });

  const { data: medicalInfo = null, refetch: refetchMedicalInfo } = useQuery<EmergencyMedicalInfo | null>({
    queryKey: ['medical_info'],
    queryFn: () => api.getEmergencyMedicalInfo(),
    enabled: isAuthenticated,
  });

  const handleRefreshAll = () => {
    queryClient.invalidateQueries();
  };

  if (authLoading) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        backgroundColor: colors.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors.textMuted,
        fontSize: 14,
        fontWeight: 600,
        gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: colors.accent,
            boxShadow: `0 0 12px ${colors.accent}`,
          }} />
          <span>Initializing DocuVault Secure Session...</span>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('docuvault_access_token');
            localStorage.removeItem('digivault_access_token');
            window.location.reload();
          }}
          style={{
            padding: '8px 16px',
            fontSize: 12,
            fontWeight: 500,
            borderRadius: 8,
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: colors.text,
            cursor: 'pointer',
          }}
        >
          Reset Session & Go to Login
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  const unreadAlertsCount = notifications.filter(n => !n.is_read).length;

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      backgroundColor: colors.bg,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'stretch',
      overflow: 'hidden',
    }}>
      {/* Biometric lock overlay */}
      {isLocked && <BiometricLockOverlay />}

      {/* Mobile Screen Shell container (responsive on mobile & simulated phone frame on desktop) */}
      <div style={{
        width: '100%',
        maxWidth: 480,
        height: '100vh',
        backgroundColor: colors.surface,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxShadow: '0 0 40px rgba(0, 0, 0, 0.4)',
        borderLeft: `1px solid ${colors.surfaceBorder}`,
        borderRight: `1px solid ${colors.surfaceBorder}`,
        overflow: 'hidden',
      }}>
        {/* Header (pinned at top) */}
        <div style={{ flexShrink: 0, zIndex: 30 }}>
          <Header
            unreadCount={unreadAlertsCount}
            onOpenAlerts={() => setCurrentTab('alerts')}
          />
        </div>

        {/* Scrollable Main Screen Content */}
        <main style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          padding: '16px 16px 16px 16px',
        }}>
          {currentTab === 'home' && (
            <HomeScreen
              stats={stats}
              documents={documents}
              notifications={notifications}
              onOpenUpload={() => setIsUploadOpen(true)}
              onOpenScan={() => setIsScanOpen(true)}
              onOpenDocument={doc => setSelectedDocForDetails(doc)}
              onSelectCategory={cat => setSelectedCategory(cat)}
              onNavigateTab={tab => setCurrentTab(tab)}
              onOpenEmergency={() => setIsEmergencyAccessOpen(true)}
              onOpenAssistant={() => setIsAssistantOpen(true)}
            />
          )}

          {currentTab === 'vault' && (
            <VaultScreen
              documents={documents}
              selectedCategory={selectedCategory}
              onSelectCategory={cat => setSelectedCategory(cat)}
              onOpenUpload={() => setIsUploadOpen(true)}
              onOpenDocument={doc => setSelectedDocForDetails(doc)}
              onOpenQRShare={doc => setSelectedDocForShare(doc)}
              onOpenAssistant={() => setIsAssistantOpen(true)}
            />
          )}

          {currentTab === 'family' && (
            <FamilyScreen
              families={families}
              invitations={invitations}
              sharedWithMe={sharedWithMe}
              sharedByMe={sharedByMe}
              emergencyContacts={emergencyContacts}
              medicalInfo={medicalInfo}
              onRefresh={handleRefreshAll}
              onOpenInvite={fId => setInviteFamilyId(fId)}
              onOpenDocument={doc => setSelectedDocForDetails(doc)}
              onOpenEmergencyAccess={() => setIsEmergencyAccessOpen(true)}
            />
          )}

          {currentTab === 'alerts' && (
            <AlertsScreen
              notifications={notifications}
              onRefresh={handleRefreshAll}
            />
          )}

          {currentTab === 'profile' && (
            <ProfileScreen
              onRefreshAll={handleRefreshAll}
            />
          )}
        </main>

        {/* Bottom Navigation Taskbar (permanently pinned at bottom) */}
        <div style={{ flexShrink: 0, zIndex: 30 }}>
          <BottomNav
            currentTab={currentTab}
            onSelectTab={tab => setCurrentTab(tab)}
            unreadAlertsCount={unreadAlertsCount}
          />
        </div>

        {/* Global Modals */}
        <UploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onSuccess={handleRefreshAll}
        />

        <DocumentDetailsModal
          document={selectedDocForDetails}
          isOpen={!!selectedDocForDetails}
          onClose={() => setSelectedDocForDetails(null)}
          onRefresh={handleRefreshAll}
          onOpenQRShare={doc => setSelectedDocForShare(doc)}
        />

        <QRShareModal
          document={selectedDocForShare}
          isOpen={!!selectedDocForShare}
          onClose={() => setSelectedDocForShare(null)}
        />

        <ScanQRModal
          isOpen={isScanOpen}
          onClose={() => setIsScanOpen(false)}
        />

        <FamilyInviteModal
          familyId={inviteFamilyId || ''}
          isOpen={!!inviteFamilyId}
          onClose={() => setInviteFamilyId(null)}
          onSuccess={handleRefreshAll}
        />

        <EmergencyAccessModal
          contacts={emergencyContacts}
          isOpen={isEmergencyAccessOpen}
          onClose={() => setIsEmergencyAccessOpen(false)}
        />

        <AssistantModal
          isOpen={isAssistantOpen}
          onClose={() => setIsAssistantOpen(false)}
          documents={documents}
        />
      </div>
    </div>
  );
};
