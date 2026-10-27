import React, { useState } from 'react';
import { 
  Bell, CheckCheck, RefreshCw, AlertTriangle, 
  Calendar, Users, ShieldAlert, Sparkles, Check, FileText 
} from 'lucide-react';
import { NotificationItem } from '../types';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';

interface AlertsScreenProps {
  notifications: NotificationItem[];
  onRefresh: () => void;
  onOpenDocumentById?: (docId: string) => void;
}

export const AlertsScreen: React.FC<AlertsScreenProps> = ({
  notifications,
  onRefresh,
  onOpenDocumentById,
}) => {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<'all' | 'unread' | 'expiry' | 'family'>('all');
  const [isChecking, setIsChecking] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const filteredNotifs = notifications.filter(n => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'expiry') return n.type.includes('EXPIRY') || n.type.includes('EXPIRED');
    if (filter === 'family') return n.type.includes('FAMILY');
    return true;
  });

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      onRefresh();
    } catch (e) {}
  };

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true);
    try {
      await api.markAllNotificationsRead();
      onRefresh();
    } catch (e) {} finally {
      setIsMarkingAll(false);
    }
  };

  const handleRunExpiryCheck = async () => {
    setIsChecking(true);
    try {
      const res = await api.checkExpiry();
      alert(res.message);
      onRefresh();
    } catch (e: any) {
      alert(e.message || 'Failed to check expiry');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24 }}>
      {/* Screen Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: colors.text }}>Alerts & Expiry Notices</h1>
          <p style={{ fontSize: 12, color: colors.textMuted }}>
            Proactive tracking and scheduled reminders
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={handleRunExpiryCheck}
            disabled={isChecking}
            title="Scan all documents for expiry"
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              backgroundColor: colors.surfaceCard,
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
            <RefreshCw size={14} className={isChecking ? 'animate-spin' : ''} />
            <span>Scan Expiry</span>
          </button>
          <button
            onClick={handleMarkAllRead}
            disabled={isMarkingAll}
            title="Mark all notifications as read"
            style={{
              padding: '8px 12px',
              borderRadius: 10,
              backgroundColor: colors.accent,
              border: 'none',
              color: '#FFF',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <CheckCheck size={14} />
            <span>Mark All</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[
          { id: 'all', label: `All (${notifications.length})` },
          { id: 'unread', label: `Unread (${notifications.filter(n => !n.is_read).length})` },
          { id: 'expiry', label: 'Expiry Alerts' },
          { id: 'family', label: 'Family Vault' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: filter === tab.id ? 700 : 500,
              backgroundColor: filter === tab.id ? colors.accent : colors.surfaceCard,
              color: filter === tab.id ? '#FFF' : colors.textMuted,
              border: `1px solid ${filter === tab.id ? colors.accent : colors.surfaceBorder}`,
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications Feed */}
      {filteredNotifs.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredNotifs.map(n => {
            const isExpiry = n.type.includes('EXPIRY') || n.type.includes('EXPIRED');
            const isFamily = n.type.includes('FAMILY');

            return (
              <div
                key={n.id}
                onClick={() => {
                  if (n.related_document_id && onOpenDocumentById) {
                    if (!n.is_read) handleMarkAsRead(n.id);
                    onOpenDocumentById(n.related_document_id);
                  }
                }}
                style={{
                  padding: 16,
                  borderRadius: 14,
                  backgroundColor: n.is_read ? colors.surfaceCard : colors.surface,
                  border: `1px solid ${!n.is_read ? colors.accent : colors.surfaceBorder}`,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 12,
                  boxShadow: !n.is_read ? '0 4px 12px rgba(13, 148, 136, 0.15)' : 'none',
                  cursor: (n.related_document_id && onOpenDocumentById) ? 'pointer' : 'default',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: isExpiry 
                      ? 'rgba(245, 158, 11, 0.15)' 
                      : isFamily 
                        ? 'rgba(59, 130, 246, 0.15)' 
                        : 'rgba(13, 148, 136, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isExpiry ? colors.warning : isFamily ? '#3B82F6' : colors.accentLight,
                    flexShrink: 0,
                    marginTop: 2,
                  }}>
                    {isExpiry ? <AlertTriangle size={18} /> : isFamily ? <Users size={18} /> : <Bell size={18} />}
                  </div>

                  <div>
                    <div style={{
                      fontSize: 14,
                      fontWeight: n.is_read ? 600 : 700,
                      color: colors.text,
                    }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: 13, color: colors.textMuted, marginTop: 4, lineHeight: 1.4 }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>
                      {new Date(n.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                    {n.related_document_id && onOpenDocumentById && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!n.is_read) handleMarkAsRead(n.id);
                          onOpenDocumentById(n.related_document_id!);
                        }}
                        style={{
                          marginTop: 8,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '4px 10px',
                          borderRadius: 8,
                          backgroundColor: 'rgba(13, 148, 136, 0.15)',
                          border: `1px solid ${colors.accent}`,
                          color: colors.accentLight,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <FileText size={12} /> View Linked Document
                      </button>
                    )}
                  </div>
                </div>

                {!n.is_read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkAsRead(n.id);
                    }}
                    title="Mark as read"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: colors.accentLight,
                      cursor: 'pointer',
                      padding: 4,
                    }}
                  >
                    <Check size={18} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{
          padding: 40,
          textAlign: 'center',
          backgroundColor: colors.surfaceCard,
          borderRadius: 16,
          border: `1px solid ${colors.surfaceBorder}`,
        }}>
          <Bell size={36} color={colors.accentLight} style={{ margin: '0 auto 10px', opacity: 0.8 }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: colors.text }}>All caught up!</div>
          <p style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
            No alerts matching your current filter. You're in good shape!
          </p>
        </div>
      )}

      {/* Reminder Strategy Settings Card */}
      <div style={{
        padding: 16,
        borderRadius: 14,
        backgroundColor: colors.surfaceCard,
        border: `1px solid ${colors.surfaceBorder}`,
        marginTop: 8,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, marginBottom: 4 }}>
          Scheduled Expiry Reminder Cadence
        </div>
        <div style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12 }}>
          Configured notification intervals automatically triggered by background task:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 12, textAlign: 'center' }}>
          <div style={{ padding: '8px', borderRadius: 8, backgroundColor: colors.surface, border: `1px solid ${colors.surfaceBorder}` }}>
            <div style={{ fontWeight: 700, color: colors.text }}>30 Days</div>
            <div style={{ fontSize: 10, color: colors.textMuted }}>Advance Notice</div>
          </div>
          <div style={{ padding: '8px', borderRadius: 8, backgroundColor: colors.surface, border: `1px solid ${colors.surfaceBorder}` }}>
            <div style={{ fontWeight: 700, color: colors.warning }}>7 Days</div>
            <div style={{ fontSize: 10, color: colors.textMuted }}>Urgent Notice</div>
          </div>
          <div style={{ padding: '8px', borderRadius: 8, backgroundColor: colors.surface, border: `1px solid ${colors.surfaceBorder}` }}>
            <div style={{ fontWeight: 700, color: colors.danger }}>1 Day / Expired</div>
            <div style={{ fontSize: 10, color: colors.textMuted }}>Critical Notice</div>
          </div>
        </div>
      </div>
    </div>
  );
};
