import React from 'react';
import { 
  FileText, QrCode, UploadCloud, Users, ShieldAlert, 
  AlertTriangle, ArrowRight, ShieldCheck, Clock, Plus, Sparkles, FolderLock 
} from 'lucide-react';
import { DocumentItem, DashboardStats, NotificationItem, FamilyInvitation } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface HomeScreenProps {
  stats: DashboardStats | null;
  documents: DocumentItem[];
  sharedWithMe?: DocumentItem[];
  invitations?: FamilyInvitation[];
  notifications: NotificationItem[];
  onOpenUpload: () => void;
  onOpenScan: () => void;
  onOpenDocument: (doc: DocumentItem) => void;
  onSelectCategory: (category: string) => void;
  onNavigateTab: (tab: any) => void;
  onOpenEmergency: () => void;
  onOpenAssistant?: () => void;
}

const CATEGORIES = [
  { name: 'Identity', icon: '🪪', color: '#3B82F6' },
  { name: 'Education', icon: '🎓', color: '#8B5CF6' },
  { name: 'Medical', icon: '🏥', color: '#EF4444' },
  { name: 'Finance', icon: '💳', color: '#10B981' },
  { name: 'Travel', icon: '✈️', color: '#06B6D4' },
  { name: 'Employment', icon: '💼', color: '#F97316' },
  { name: 'Property', icon: '🏡', color: '#F59E0B' },
  { name: 'Other', icon: '📁', color: '#64748B' },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  stats,
  documents,
  sharedWithMe = [],
  invitations = [],
  notifications,
  onOpenUpload,
  onOpenScan,
  onOpenDocument,
  onSelectCategory,
  onNavigateTab,
  onOpenEmergency,
  onOpenAssistant,
}) => {
  const { user } = useAuth();
  const { colors } = useTheme();

  // Find expiring documents (within 30 days)
  const safeDocs = Array.isArray(documents) ? documents : [];
  const expiringDocs = safeDocs.filter(d => 
    !d.is_expired && d.days_until_expiry !== null && d.days_until_expiry !== undefined && d.days_until_expiry <= 30
  ).sort((a, b) => (a.days_until_expiry || 0) - (b.days_until_expiry || 0));

  // Recent uploads (last 4)
  const recentDocs = [...safeDocs].sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  ).slice(0, 4);

  const getCategoryCount = (categoryName: string) => {
    return safeDocs.filter(d => (d.category || '').toLowerCase() === categoryName.toLowerCase()).length;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 24 }}>
      {/* Personalized Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0F2444 0%, #173663 100%)',
        borderRadius: 20,
        padding: '22px 20px',
        border: `1px solid ${colors.surfaceBorder}`,
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative background glow */}
        <div style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(13, 148, 136, 0.35) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <Sparkles size={14} color={colors.accentLight} />
            <span style={{ fontSize: 11, fontWeight: 700, color: colors.accentLight, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              SECURE DIGITAL VAULT
            </span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#FFFFFF', letterSpacing: -0.3 }}>
            Welcome back, {user?.full_name?.split(' ')[0] || 'User'}
          </h1>
          <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>
            Your encrypted vault is synchronized and tamper-protected.
          </p>

          {/* Quick Metrics Strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 8,
            marginTop: 18,
            paddingTop: 16,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF' }}>
                {safeDocs.length}
              </div>
              <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, marginTop: 2 }}>Documents</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: expiringDocs.length > 0 ? colors.warning : '#FFFFFF' }}>
                {expiringDocs.length}
              </div>
              <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, marginTop: 2 }}>Expiring</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#FFFFFF' }}>
                {stats?.family_members_count ?? 0}
              </div>
              <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, marginTop: 2 }}>Family</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: colors.accentLight }}>
                {stats?.active_shares_count ?? 0}
              </div>
              <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, marginTop: 2 }}>Shares</div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Family Invitations Banner on Home Screen */}
      {invitations.length > 0 && (
        <div style={{
          padding: 16,
          borderRadius: 16,
          backgroundColor: 'rgba(59, 130, 246, 0.14)',
          border: '1px solid rgba(59, 130, 246, 0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: '#3B82F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
              flexShrink: 0,
            }}>
              <Users size={20} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>
                Family Vault Invitation Received
              </div>
              <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {invitations[0].inviter_name || 'A family member'} invited you to "{invitations[0].family_name || 'Family Vault'}"
              </div>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('family')}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              backgroundColor: '#3B82F6',
              color: '#FFF',
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            Review & Join
          </button>
        </div>
      )}

      {/* DocuVault 2.0 Personal Document Assistant Dashboard */}
      {onOpenAssistant && (
        <div style={{
          backgroundColor: colors.surfaceCard,
          borderRadius: 18,
          padding: 18,
          border: `1.5px solid ${colors.accentLight}`,
          boxShadow: '0 8px 24px rgba(13, 148, 136, 0.15)',
          background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.08) 0%, rgba(30, 58, 138, 0.08) 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color={colors.accentLight} />
              <span style={{ fontSize: 14, fontWeight: 800, color: colors.text }}>
                Personal Assistant Command Center
              </span>
            </div>
            <button
              onClick={onOpenAssistant}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                backgroundColor: colors.accent,
                color: '#FFF',
                border: 'none',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <span>Launch Suite</span>
              <ArrowRight size={12} />
            </button>
          </div>

          <div style={{ fontSize: 12, color: colors.text, marginBottom: 12, lineHeight: 1.4 }}>
            💡 <b>Recommended Action:</b>{' '}
            {expiringDocs.length > 0 ? (
              <span>Your <b>{expiringDocs[0].title}</b> expires in {expiringDocs[0].days_until_expiry} day(s). Review your renewal checklist and prepare replacement paperwork.</span>
            ) : (
              <span>All documents active. Run a <b>Cross-Document Consistency Check</b> or generate a <b>College / Job Onboarding Pack</b>.</span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            <button
              onClick={onOpenAssistant}
              style={{
                padding: 10,
                borderRadius: 10,
                backgroundColor: colors.surface,
                border: `1px solid ${colors.surfaceBorder}`,
                color: colors.text,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              💬 Chat RAG
            </button>
            <button
              onClick={onOpenAssistant}
              style={{
                padding: 10,
                borderRadius: 10,
                backgroundColor: colors.surface,
                border: `1px solid ${colors.surfaceBorder}`,
                color: colors.text,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              📦 Smart Packs
            </button>
            <button
              onClick={onOpenAssistant}
              style={{
                padding: 10,
                borderRadius: 10,
                backgroundColor: colors.surface,
                border: `1px solid ${colors.surfaceBorder}`,
                color: colors.text,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              📋 Form Autofill
            </button>
          </div>
        </div>
      )}

      {/* Quick Actions Bar */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Quick Vault Actions
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <button
            onClick={onOpenUpload}
            style={{
              padding: '14px 6px',
              borderRadius: 14,
              backgroundColor: colors.surfaceCard,
              border: `1px solid ${colors.surfaceBorder}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              color: colors.text,
              transition: 'transform 0.1s',
            }}
          >
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: 'rgba(13, 148, 136, 0.15)',
              color: colors.accentLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <UploadCloud size={20} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600 }}>Upload</span>
          </button>

          <button
            onClick={onOpenScan}
            style={{
              padding: '14px 6px',
              borderRadius: 14,
              backgroundColor: colors.surfaceCard,
              border: `1px solid ${colors.surfaceBorder}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              color: colors.text,
            }}
          >
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              color: '#3B82F6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <QrCode size={20} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600 }}>Scan QR</span>
          </button>

          <button
            onClick={() => onNavigateTab('family')}
            style={{
              padding: '14px 6px',
              borderRadius: 14,
              backgroundColor: colors.surfaceCard,
              border: `1px solid ${colors.surfaceBorder}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              color: colors.text,
            }}
          >
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: 'rgba(139, 92, 246, 0.15)',
              color: '#8B5CF6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Users size={20} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600 }}>Family</span>
          </button>

          <button
            onClick={onOpenEmergency}
            style={{
              padding: '14px 6px',
              borderRadius: 14,
              backgroundColor: colors.surfaceCard,
              border: `1px solid ${colors.surfaceBorder}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
              color: colors.text,
            }}
          >
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: colors.danger,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <ShieldAlert size={20} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600 }}>Emergency</span>
          </button>
        </div>
      </div>

      {/* Expiry Alerts Card (if any documents nearing expiry) */}
      {expiringDocs.length > 0 && (
        <div style={{
          padding: '14px 16px',
          borderRadius: 16,
          backgroundColor: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={18} color={colors.warning} />
              <span style={{ fontSize: 13, fontWeight: 700, color: colors.warning }}>
                Documents Nearing Expiration ({expiringDocs.length})
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('alerts')}
              style={{
                background: 'none',
                border: 'none',
                color: colors.warning,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <span>View Alerts</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {expiringDocs.slice(0, 2).map(doc => (
              <div
                key={doc.id}
                onClick={() => onOpenDocument(doc)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 10,
                  backgroundColor: colors.surface,
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                  {doc.title}
                </div>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: (doc.days_until_expiry || 0) <= 7 ? colors.danger : colors.warning,
                }}>
                  Expires in {doc.days_until_expiry} day{(doc.days_until_expiry || 0) === 1 ? '' : 's'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document Categories Grid */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Document Categories
          </div>
          <button
            onClick={() => onNavigateTab('vault')}
            style={{
              background: 'none',
              border: 'none',
              color: colors.accentLight,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            View All ({documents.length})
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {CATEGORIES.map(cat => {
            const count = getCategoryCount(cat.name);
            return (
              <div
                key={cat.name}
                onClick={() => {
                  onSelectCategory(cat.name);
                  onNavigateTab('vault');
                }}
                style={{
                  padding: '14px 12px',
                  borderRadius: 14,
                  backgroundColor: colors.surfaceCard,
                  border: `1px solid ${colors.surfaceBorder}`,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: 24 }}>{cat.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>
                    {cat.name}
                  </div>
                  <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                    {count} document{count === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Vault Activity */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Recent Vault Items
          </div>
          <button
            onClick={() => onNavigateTab('vault')}
            style={{
              background: 'none',
              border: 'none',
              color: colors.accentLight,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            See all
          </button>
        </div>

        {recentDocs.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentDocs.map(doc => (
              <div
                key={doc.id}
                onClick={() => onOpenDocument(doc)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: 12,
                  backgroundColor: colors.surfaceCard,
                  border: `1px solid ${colors.surfaceBorder}`,
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: 'rgba(13, 148, 136, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: colors.accentLight,
                  }}>
                    <FileText size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                      {doc.title}
                    </div>
                    <div style={{ fontSize: 11, color: colors.textMuted }}>
                      {doc.category} • {doc.issuer || 'Official'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {doc.is_emergency_eligible && (
                    <span style={{
                      padding: '2px 6px',
                      borderRadius: 4,
                      backgroundColor: 'rgba(239, 68, 68, 0.12)',
                      color: colors.danger,
                      fontSize: 10,
                      fontWeight: 700,
                    }}>
                      EMERGENCY
                    </span>
                  )}
                  <ArrowRight size={14} color={colors.textMuted} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            padding: 24,
            textAlign: 'center',
            backgroundColor: colors.surfaceCard,
            borderRadius: 14,
            border: `1px solid ${colors.surfaceBorder}`,
          }}>
            <FolderLock size={32} color={colors.accentLight} style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>Your Vault is Empty</div>
            <p style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, marginBottom: 12 }}>
              Upload your Aadhaar, Passport, or Health Insurance to get started.
            </p>
            <button
              onClick={onOpenUpload}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                backgroundColor: colors.accent,
                color: '#FFF',
                border: 'none',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Upload Document
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
