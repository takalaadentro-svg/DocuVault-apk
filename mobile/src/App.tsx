import { App as CapApp } from '@capacitor/app';
import { CheckCircle2 } from 'lucide-react';
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
  const [uploadDefaultFamily, setUploadDefaultFamily] = useState(false);
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [selectedDocForDetails, setSelectedDocForDetails] = useState<DocumentItem | null>(null);
  const [selectedDocForShare, setSelectedDocForShare] = useState<DocumentItem | null>(null);
  const [inviteFamilyId, setInviteFamilyId] = useState<string | null>(null);
  const [isEmergencyAccessOpen, setIsEmergencyAccessOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Deep linking: Handle docuvault:// and https:// URLs
  React.useEffect(() => {
    const handleUrl = (urlStr: string) => {
      try {
        const match = urlStr.match(/token=([a-zA-Z0-9\-]+)/);
        if (match && match[1]) {
          const token = match[1];
          localStorage.setItem('pending_invite_token', token);
          setCurrentTab('family');
          showToast('Family invitation detected! Opening Vault...');
        }
      } catch (e) {
        console.warn('Deep link parse error:', e);
      }
    };

    handleUrl(window.location.href);

    let handle: any = null;
    CapApp.addListener('appUrlOpen', (data) => {
      if (data?.url) {
        handleUrl(data.url);
      }
    }).then(h => {
      handle = h;
    }).catch(() => {});

    return () => {
      if (handle?.remove) handle.remove();
    };
  }, []);

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

  const handleOpenDocumentById = async (docId: string) => {
    const doc = documents.find(d => d.id === docId) || sharedWithMe.find(d => d.id === docId);
    if (doc) {
      setSelectedDocForDetails(doc);
    } else {
      try {
        const fetched = await api.getDocument(docId);
        if (fetched) setSelectedDocForDetails(fetched);
      } catch (e) {
        showToast('Document could not be found or access has expired.');
      }
    }
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

  const isSampleNotification = (n: any) => {
    const title = (n?.title || '').toLowerCase();
    const msg = (n?.message || '').toLowerCase();
    return (
      title.includes('health insurance expiry') ||
      title.includes('passport expiry alert') ||
      msg.includes('floater policy') ||
      msg.includes('republic of india passport') ||
      !n?.id ||
      n.id === 'null' ||
      n.id === 'None' ||
      n.id === 'undefined'
    );
  };

  const unreadAlertsCount = notifications.filter(n => !n.is_read && !isSampleNotification(n)).length;

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
        {/* Floating Toast Notification */}
        {toastMessage && (
          <div style={{
            position: 'absolute',
            top: 72,
            left: 16,
            right: 16,
            zIndex: 9999,
            backgroundColor: '#0D9488',
            color: '#FFFFFF',
            padding: '12px 16px',
            borderRadius: 14,
            boxShadow: '0 8px 24px rgba(13, 148, 136, 0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
            fontWeight: 700,
          }}>
            <CheckCircle2 size={20} color="#FFFFFF" style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{toastMessage}</span>
          </div>
        )}

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
              sharedWithMe={sharedWithMe}
              invitations={invitations}
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
              sharedWithMe={sharedWithMe}
              selectedCategory={selectedCategory}
              onSelectCategory={cat => setSelectedCategory(cat)}
              onOpenUpload={(isFamily) => {
                setUploadDefaultFamily(Boolean(isFamily));
                setIsUploadOpen(true);
              }}
              onOpenDocument={doc => setSelectedDocForDetails(doc)}
              onOpenQRShare={doc => setSelectedDocForShare(doc)}
              onOpenAssistant={() => setIsAssistantOpen(true)}
              onRefresh={handleRefreshAll}
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
              documents={documents}
              onRefresh={handleRefreshAll}
              onOpenDocumentById={handleOpenDocumentById}
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
          defaultFamilyVault={uploadDefaultFamily}
          onClose={() => {
            setIsUploadOpen(false);
            setUploadDefaultFamily(false);
          }}
          onSuccess={(docTitle) => {
            handleRefreshAll();
            showToast(`File "${docTitle || 'Document'}" successfully uploaded to your vault!`);
          }}
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
          medicalInfo={medicalInfo}
          documents={documents}
          isOpen={isEmergencyAccessOpen}
          onClose={() => setIsEmergencyAccessOpen(false)}
          onRefresh={handleRefreshAll}
          onOpenDocument={doc => setSelectedDocForDetails(doc)}
          onOpenUpload={() => {
            setIsEmergencyAccessOpen(false);
            setIsUploadOpen(true);
          }}
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
