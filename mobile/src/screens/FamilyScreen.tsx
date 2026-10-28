import React, { useState } from 'react';
import { 
  Users, UserPlus, ShieldAlert, HeartPulse, FileText, 
  Check, X, Trash2, Plus, ShieldCheck, Phone, Mail, ArrowRight, Eye, AlertTriangle, KeyRound,
  Lock, Unlock, FolderLock, User as UserIcon, UserCheck, RefreshCw, Filter, Download
} from 'lucide-react';
import { FamilyGroup, FamilyInvitation, DocumentItem, EmergencyContact, EmergencyMedicalInfo } from '../types';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { showLocalNotification } from '../services/pushNotifications';

interface FamilyScreenProps {
  families: FamilyGroup[];
  invitations: FamilyInvitation[];
  sharedWithMe: DocumentItem[];
  sharedByMe: DocumentItem[];
  emergencyContacts: EmergencyContact[];
  medicalInfo: EmergencyMedicalInfo | null;
  documents?: DocumentItem[];
  onRefresh: () => void;
  onOpenInvite: (familyId: string) => void;
  onOpenDocument: (doc: DocumentItem) => void;
  onOpenEmergencyAccess: () => void;
}

export const FamilyScreen: React.FC<FamilyScreenProps> = ({
  families,
  invitations,
  sharedWithMe,
  sharedByMe,
  emergencyContacts,
  medicalInfo,
  documents = [],
  onRefresh,
  onOpenInvite,
  onOpenDocument,
  onOpenEmergencyAccess,
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'members' | 'shared_vault' | 'emergency'>('members');
  const [docsFilter, setDocsFilter] = useState<'all' | 'others' | 'mine'>('all');
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);

  // Create Family state
    // Manual Token Input state
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [isJoiningWithToken, setIsJoiningWithToken] = useState(false);
const [showCreateFamily, setShowCreateFamily] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [isCreatingFamily, setIsCreatingFamily] = useState(false);

  // Medical info edit state
  const [isEditingMedical, setIsEditingMedical] = useState(false);
  const [bloodGroup, setBloodGroup] = useState(medicalInfo?.blood_group || 'O+');
  const [allergies, setAllergies] = useState(medicalInfo?.allergies || '');
  const [medications, setMedications] = useState(medicalInfo?.current_medications || '');
  const [emergencyNotes, setEmergencyNotes] = useState(medicalInfo?.emergency_notes || '');
  const [physicianName, setPhysicianName] = useState(medicalInfo?.physician_name || '');
  const [physicianPhone, setPhysicianPhone] = useState(medicalInfo?.physician_phone || '');
  const [organDonor, setOrganDonor] = useState(medicalInfo?.organ_donor || false);
  const [isSavingMedical, setIsSavingMedical] = useState(false);

  React.useEffect(() => {
    if (medicalInfo) {
      setBloodGroup(medicalInfo.blood_group || (medicalInfo as any).bloodGroup || 'O+');
      setAllergies(medicalInfo.allergies || '');
      setMedications(medicalInfo.current_medications || (medicalInfo as any).currentMedications || '');
      setEmergencyNotes(medicalInfo.emergency_notes || (medicalInfo as any).emergencyNotes || '');
      setPhysicianName(medicalInfo.physician_name || (medicalInfo as any).physicianName || '');
      setPhysicianPhone(medicalInfo.physician_phone || (medicalInfo as any).physicianPhone || '');
      setOrganDonor(Boolean(medicalInfo.organ_donor ?? (medicalInfo as any).organDonor));
    }
  }, [medicalInfo]);

  // Add Contact state
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactRelationship, setContactRelationship] = useState('Spouse');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);

  const [selectedFamilyId, setSelectedFamilyId] = useState<string>('');

  const primaryFamily = React.useMemo(() => {
    if (!families || families.length === 0) return null;
    if (selectedFamilyId) {
      const match = families.find(f => (f.id || (f as any)._id) === selectedFamilyId);
      if (match) return match;
    }
    const multiMember = families.find(f => (f.members?.length || 0) > 1);
    if (multiMember) return multiMember;
    const joined = families.find(f => f.owner_id !== user?.id && (f as any).ownerId !== user?.id);
    if (joined) return joined;
    return families[0];
  }, [families, selectedFamilyId, user?.id]);

  // Unified list of all shared documents in this family group
  const allVaultDocuments = React.useMemo(() => {
    const map = new Map<string, DocumentItem>();

    // 1. Documents shared by other members with current user
    (sharedWithMe || []).forEach(doc => {
      if (doc && doc.id) {
        map.set(doc.id, doc);
      }
    });

    // 2. Documents shared by current user into family vault
    (sharedByMe || []).forEach(doc => {
      if (doc && doc.id) {
        map.set(doc.id, doc);
      }
    });

    // 3. User's own family vault documents
    (documents || []).forEach(doc => {
      if (doc && doc.id && (doc.is_family_vault || (doc as any).isFamilyVault || (doc as any).family_vault)) {
        map.set(doc.id, doc);
      }
    });

    // 4. Primary family group documents if populated
    (primaryFamily?.documents || []).forEach((doc: any) => {
      if (doc && doc.id && !map.has(doc.id)) {
        map.set(doc.id, doc);
      }
    });

    return Array.from(map.values());
  }, [sharedWithMe, sharedByMe, documents, primaryFamily?.documents]);

  const isSender = (doc: DocumentItem): boolean => {
    const docUserId = (doc as any).userId || (doc as any).user_id || (doc as any).ownerId || (doc as any).owner_id;
    return Boolean(docUserId && user?.id && docUserId === user.id);
  };

  const isFamilyAdmin = React.useMemo(() => {
    if (!primaryFamily || !user) return false;
    const isOwner = primaryFamily.owner_id === user.id || (primaryFamily as any).ownerId === user.id;
    if (isOwner) return true;
    const member = (primaryFamily.members || []).find((m: any) => {
      const mUid = m.userId || m.user_id || m.id;
      const mEmail = m.email || (m as any).user_email;
      return mUid === user.id || (mEmail && user.email && mEmail.toLowerCase() === user.email.toLowerCase());
    });
    return member?.role === 'ADMIN' || member?.role === 'OWNER';
  }, [primaryFamily, user]);

  const canDeleteOrManage = (doc: DocumentItem): boolean => {
    return isSender(doc) || isFamilyAdmin;
  };

  const getSenderName = (doc: DocumentItem): string => {
    if (isSender(doc)) {
      return 'You';
    }
    const docUserId = (doc as any).userId || (doc as any).user_id;
    if (primaryFamily?.members && docUserId) {
      const match = primaryFamily.members.find((m: any) => {
        const mUid = m.userId || m.user_id || m.id;
        return mUid === docUserId;
      });
      if (match) {
        const name = (match as any).fullName || (match as any).full_name || (match as any).user_name || match.email;
        if (name) return name;
      }
    }
    if (doc.issuer && doc.issuer.startsWith('Shared by ')) {
      return doc.issuer.replace('Shared by ', '');
    }
    if (doc.holder_name && doc.holder_name !== user?.full_name) {
      return doc.holder_name;
    }
    if (doc.issuer && doc.issuer !== 'Personal' && doc.issuer !== 'Personal Record') {
      return doc.issuer;
    }
    return 'Group Member';
  };

  const filteredVaultDocs = React.useMemo(() => {
    if (docsFilter === 'others') {
      return allVaultDocuments.filter(d => !isSender(d));
    }
    if (docsFilter === 'mine') {
      return allVaultDocuments.filter(d => isSender(d));
    }
    return allVaultDocuments;
  }, [allVaultDocuments, docsFilter, user?.id]);

  const handleMakePersonal = async (e: React.MouseEvent, doc: DocumentItem) => {
    e.stopPropagation();
    const docTitle = doc.title || 'Document';
    if (!window.confirm(`Make "${docTitle}" personal?\n\nThis will remove the document from the Family Vault. Only you will have access to it in your Personal Locker.`)) {
      return;
    }
    setProcessingDocId(doc.id);
    try {
      await api.updateDocument(doc.id, { 
        is_family_vault: false, 
        isFamilyVault: false,
        family_vault: false 
      });
      showLocalNotification('Removed from Family Vault', `"${docTitle}" moved to Personal Locker.`);
      alert(`"${docTitle}" has been made personal and removed from the Family Vault.`);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to remove document from Family Vault');
    } finally {
      setProcessingDocId(null);
    }
  };

  const handleDeleteSharedDoc = async (e: React.MouseEvent, doc: DocumentItem) => {
    e.stopPropagation();
    const docTitle = doc.title || 'Document';
    const sender = isSender(doc);
    const confirmMessage = sender
      ? `Delete "${docTitle}"?\n\nAs the sender, this will permanently delete this document from both your personal locker and the Family Vault. This action cannot be undone.`
      : `Delete "${docTitle}" as Family Admin?\n\nThis will permanently remove this shared document from the Family Vault. This action cannot be undone.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }
    setProcessingDocId(doc.id);
    try {
      await api.deleteDocument(doc.id);
      showLocalNotification('Document Deleted', `"${docTitle}" deleted from vault.`);
      alert(`"${docTitle}" has been deleted.`);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete document');
    } finally {
      setProcessingDocId(null);
    }
  };

    // Auto-accept invitation from email deep link if token is present
  React.useEffect(() => {
    const pendingToken = localStorage.getItem('pending_invite_token');
    if (pendingToken) {
      localStorage.removeItem('pending_invite_token');
      handleRespondInvitation(pendingToken, 'ACCEPT');
    }
  }, []);

    const handleJoinWithToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    setIsJoiningWithToken(true);
    try {
      await api.respondToInvitation(manualToken.trim(), 'ACCEPT');
      showLocalNotification('DocuVault Family', 'Successfully joined Family Vault!');
      alert('Successfully joined Family Vault!');
      setManualToken('');
      setShowTokenModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Invalid or expired invitation token.');
    } finally {
      setIsJoiningWithToken(false);
    }
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName.trim()) return;
    setIsCreatingFamily(true);
    try {
      await api.createFamily(familyName.trim());
      setFamilyName('');
      setShowCreateFamily(false);
      onRefresh();
    } catch (e: any) {
      alert(e.message || 'Failed to create family group');
    } finally {
      setIsCreatingFamily(false);
    }
  };

  const handleRespondInvitation = async (invId: string, action: 'ACCEPT' | 'REJECT') => {
    try {
      await api.respondToInvitation(invId, action);
      onRefresh();
    } catch (e: any) {
      alert(e.message || 'Action failed');
    }
  };

  const handleSaveMedicalInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingMedical(true);
    try {
      await api.updateEmergencyMedicalInfo({
        blood_group: bloodGroup,
        allergies,
        current_medications: medications,
        emergency_notes: emergencyNotes,
        physician_name: physicianName,
        physician_phone: physicianPhone,
        organ_donor: organDonor,
      });
      setIsEditingMedical(false);
      onRefresh();
    } catch (e: any) {
      alert(e.message || 'Failed to save medical info');
    } finally {
      setIsSavingMedical(false);
    }
  };

  const handleAddEmergencyContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) return;
    setIsSavingContact(true);
    try {
      await api.addEmergencyContact({
        name: contactName.trim(),
        relationship_type: contactRelationship,
        phone_number: contactPhone.trim(),
        email: contactEmail.trim() || undefined,
        can_access_medical: true,
        can_access_identity: true,
        can_access_financial: false,
        is_active: true,
      });
      setContactName('');
      setContactPhone('');
      setContactEmail('');
      setShowAddContact(false);
      onRefresh();
    } catch (e: any) {
      alert(e.message || 'Failed to add emergency contact');
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleDeleteEmergencyContact = async (contactId: string) => {
    if (!confirm('Remove this emergency contact?')) return;
    try {
      await api.deleteEmergencyContact(contactId);
      onRefresh();
    } catch (e: any) {
      alert(e.message || 'Failed to remove contact');
    }
  };

  const handleToggleEmergencyDoc = async (doc: DocumentItem, makeEligible: boolean) => {
    try {
      await api.updateDocument(doc.id, {
        is_emergency_eligible: makeEligible,
      });
      showLocalNotification('Emergency Vault', `"${doc.title}" ${makeEligible ? 'added to' : 'removed from'} Emergency Vault.`);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update document emergency eligibility');
    }
  };

    const handleRemoveMember = async (memberIdOrUserId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} from this Family Vault?`)) {
      return;
    }
    try {
      await api.removeFamilyMember(memberIdOrUserId);
      showLocalNotification('Family Vault Updated', `${name} was removed from the family vault.`);
      onRefresh();
    } catch (e: any) {
      alert(e.message || 'Failed to remove member from family group');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 24 }}>
      {/* Screen Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: colors.text }}>Family & Emergency Vault</h1>
          <p style={{ fontSize: 12, color: colors.textMuted }}>Delegated permissions and emergency access</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setShowTokenModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 10,
              backgroundColor: colors.surfaceCard,
              color: colors.accentLight,
              border: `1px solid ${colors.surfaceBorder}`,
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <KeyRound size={14} />
            <span>Enter Token</span>
          </button>

          {primaryFamily && (
            <button
              onClick={() => onOpenInvite(primaryFamily.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 10,
                backgroundColor: colors.accent,
                color: '#FFF',
                border: 'none',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(13, 148, 136, 0.35)',
              }}
            >
              <UserPlus size={14} />
              <span>Invite</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderRadius: 12,
        backgroundColor: colors.surfaceCard,
        padding: 4,
        gap: 4,
      }}>
        {[
          { id: 'members', label: 'Members', icon: Users },
          { id: 'shared_vault', label: `Shared Vault (${allVaultDocuments.length})`, icon: FolderLock },
          { id: 'emergency', label: 'Emergency', icon: ShieldAlert },
        ].map(tab => {
          const isSelected = activeTab === tab.id || (tab.id === 'shared_vault' && ((activeTab as any) === 'shared_with_me' || (activeTab as any) === 'shared_by_me'));
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                flex: 1,
                padding: '9px 4px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: isSelected ? colors.accent : 'transparent',
                color: isSelected ? '#FFF' : colors.textMuted,
                fontSize: 12,
                fontWeight: isSelected ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                transition: 'all 0.15s ease',
              }}
            >
              <tab.icon size={13} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab: Members */}
      {activeTab === 'members' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Pending Invitations Banner */}
          {invitations.length > 0 && (
            <div style={{
              padding: 16,
              borderRadius: 14,
              backgroundColor: 'rgba(59, 130, 246, 0.12)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#3B82F6', marginBottom: 8 }}>
                Pending Invitations for You ({invitations.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {invitations.map(inv => (
                  <div
                    key={inv.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 10,
                      borderRadius: 10,
                      backgroundColor: colors.surface,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                        {inv.family_name || 'Family Vault'}
                      </div>
                      <div style={{ fontSize: 11, color: colors.textMuted }}>
                        Invited by {inv.inviter_name || 'Family Admin'} as {inv.role || 'Member'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => handleRespondInvitation((inv as any).token || inv.id, 'ACCEPT')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 6,
                          backgroundColor: colors.accent,
                          color: '#FFF',
                          border: 'none',
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRespondInvitation((inv as any).token || inv.id, 'REJECT')}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 6,
                          backgroundColor: colors.surfaceCard,
                          color: colors.textMuted,
                          border: `1px solid ${colors.surfaceBorder}`,
                          fontSize: 12,
                          cursor: 'pointer',
                        }}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {primaryFamily ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {families.length > 1 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  overflowX: 'auto',
                  paddingBottom: 4,
                  scrollbarWidth: 'none',
                }}>
                  {families.map(f => {
                    const isSelected = f.id === primaryFamily.id;
                    const isOwner = f.owner_id === user?.id || (f as any).ownerId === user?.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedFamilyId(f.id)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 20,
                          backgroundColor: isSelected ? colors.accent : colors.surfaceCard,
                          color: isSelected ? '#FFF' : colors.textMuted,
                          border: `1px solid ${isSelected ? colors.accent : colors.surfaceBorder}`,
                          fontSize: 12,
                          fontWeight: isSelected ? 700 : 500,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Users size={12} />
                        <span>{f.name}</span>
                        <span style={{
                          fontSize: 10,
                          backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(13,148,136,0.15)',
                          color: isSelected ? '#FFF' : colors.accentLight,
                          padding: '1px 6px',
                          borderRadius: 10,
                          fontWeight: 700,
                        }}>
                          {f.members?.length || 0}
                        </span>
                        <span style={{
                          fontSize: 9,
                          opacity: 0.8,
                          textTransform: 'uppercase',
                          fontWeight: 700,
                        }}>
                          {isOwner ? 'Admin' : 'Member'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              <div style={{
                padding: 16,
                borderRadius: 16,
                backgroundColor: colors.surfaceCard,
                border: `1px solid ${colors.surfaceBorder}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', fontWeight: 600 }}>
                    Active Family Vault
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: colors.text, marginTop: 2 }}>
                    {primaryFamily.name}
                  </div>
                  <div style={{ fontSize: 11, color: colors.accentLight, marginTop: 2 }}>
                    {primaryFamily.owner_id === user?.id ? 'Organized by You' : 'Shared Group Locker'}
                  </div>
                </div>
                <div style={{
                  padding: '4px 10px',
                  borderRadius: 20,
                  backgroundColor: 'rgba(13, 148, 136, 0.15)',
                  color: colors.accentLight,
                  fontSize: 12,
                  fontWeight: 700,
                }}>
                  {primaryFamily.members?.length || 0} Members
                </div>
              </div>

              {/* Shared Documents Quick Access Strip */}
              <div
                onClick={() => setActiveTab('shared_vault')}
                style={{
                  padding: '13px 15px',
                  borderRadius: 14,
                  backgroundColor: 'rgba(59, 130, 246, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#3B82F6',
                    flexShrink: 0,
                  }}>
                    <FileText size={18} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>
                      {allVaultDocuments.length} Document{allVaultDocuments.length === 1 ? '' : 's'} Available in this Vault
                    </div>
                    <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                      Tap to view all documents shared by family members
                    </div>
                  </div>
                </div>
                <ArrowRight size={16} color="#3B82F6" />
              </div>

              {/* Members List */}
              <div style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted, marginTop: 4 }}>
                Vault Members & Roles
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(primaryFamily.members || []).map(member => {
                  const mName = (member as any)?.fullName || (member as any)?.full_name || (member as any)?.user_name || member?.email || 'Family Member';
                  const mEmail = member?.email || (member as any)?.user_email || '';
                  const mUserId = (member as any)?.userId || (member as any)?.user_id || member?.id;
                  const isCurrent = mUserId === user?.id || (mEmail && user?.email && mEmail.toLowerCase() === user.email.toLowerCase());
                  const isOwner = primaryFamily?.owner_id === user?.id || (primaryFamily as any)?.ownerId === user?.id;

                  return (
                    <div
                      key={member.id || mUserId}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                        <div style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: colors.accent,
                          color: '#FFF',
                          fontWeight: 700,
                          fontSize: 15,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          boxShadow: '0 2px 8px rgba(13, 148, 136, 0.3)',
                        }}>
                          {mName.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0, flex: 1, paddingRight: 8 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span>{mName}</span>
                            {isCurrent && (
                              <span style={{ fontSize: 11, fontWeight: 600, color: colors.accentLight, backgroundColor: 'rgba(13, 148, 136, 0.15)', padding: '1px 6px', borderRadius: 6 }}>
                                You
                              </span>
                            )}
                          </div>
                          {mEmail && (
                            <div style={{ fontSize: 12, color: colors.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {mEmail}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{
                          padding: '4px 10px',
                          borderRadius: 8,
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor: (member?.role === 'OWNER' || member?.role === 'ADMIN') ? 'rgba(13, 148, 136, 0.2)' : 'rgba(59, 130, 246, 0.15)',
                          color: (member?.role === 'OWNER' || member?.role === 'ADMIN') ? colors.accentLight : '#3B82F6',
                        }}>
                          {member?.role || 'MEMBER'}
                        </span>

                        {isOwner && member?.role !== 'OWNER' && !isCurrent && (
                          <button
                            title={`Remove ${mName}`}
                            onClick={() => handleRemoveMember(mUserId, mName)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: 'rgba(239, 68, 68, 0.12)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              color: '#EF4444',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* No Family Vault Created Yet */
            <div style={{
              padding: 30,
              textAlign: 'center',
              backgroundColor: colors.surfaceCard,
              borderRadius: 16,
              border: `1px solid ${colors.surfaceBorder}`,
            }}>
              <Users size={40} color={colors.accentLight} style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>Create Your Family Vault</div>
              <p style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, marginBottom: 16 }}>
                Securely coordinate and delegate document permissions for your spouse, children, or parents.
              </p>
              {showCreateFamily ? (
                <form onSubmit={handleCreateFamily} style={{ display: 'flex', gap: 8, maxWidth: 360, margin: '0 auto' }}>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sharma Family Vault"
                    value={familyName}
                    onChange={e => setFamilyName(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      borderRadius: 10,
                      backgroundColor: colors.surface,
                      border: `1px solid ${colors.surfaceBorder}`,
                      color: colors.text,
                      fontSize: 14,
                      outline: 'none',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isCreatingFamily}
                    style={{
                      padding: '10px 16px',
                      borderRadius: 10,
                      backgroundColor: colors.accent,
                      color: '#FFF',
                      border: 'none',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {isCreatingFamily ? 'Creating...' : 'Create'}
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setShowCreateFamily(true)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: 10,
                    backgroundColor: colors.accent,
                    color: '#FFF',
                    border: 'none',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Create Family Vault Group
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: Shared Vault (All shared documents from group members) */}
      {(activeTab === 'shared_vault' || (activeTab as any) === 'shared_with_me' || (activeTab as any) === 'shared_by_me') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Header Info & Sub-filters */}
          <div style={{
            padding: 16,
            borderRadius: 16,
            backgroundColor: colors.surfaceCard,
            border: `1px solid ${colors.surfaceBorder}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  backgroundColor: 'rgba(13, 148, 136, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.accentLight,
                }}>
                  <FolderLock size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: colors.text }}>
                    Group Shared Documents
                  </div>
                  <div style={{ fontSize: 11, color: colors.textMuted }}>
                    {primaryFamily?.name ? `${primaryFamily.name} • ` : ''}
                    {allVaultDocuments.length} document{allVaultDocuments.length === 1 ? '' : 's'} shared in total
                  </div>
                </div>
              </div>
              <button
                onClick={onRefresh}
                title="Refresh shared documents"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.surfaceBorder}`,
                  color: colors.textMuted,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {/* Permission notice banner */}
            <div style={{
              padding: '8px 12px',
              borderRadius: 8,
              backgroundColor: 'rgba(59, 130, 246, 0.08)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              fontSize: 11,
              color: colors.textMuted,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}>
              <ShieldCheck size={14} color="#3B82F6" style={{ flexShrink: 0 }} />
              <span>
                {isFamilyAdmin 
                  ? 'As Family Admin, you have authority to view, unshare, or delete shared documents in this vault.'
                  : 'Only the document sender and the Family Admin have permission to delete or remove shared documents.'}
              </span>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: `All (${allVaultDocuments.length})` },
                { id: 'others', label: `From Members (${allVaultDocuments.filter(d => !isSender(d)).length})` },
                { id: 'mine', label: `Uploaded by Me (${allVaultDocuments.filter(d => isSender(d)).length})` },
              ].map(f => {
                const isActive = docsFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setDocsFilter(f.id as any)}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 16,
                      border: `1px solid ${isActive ? colors.accent : colors.surfaceBorder}`,
                      backgroundColor: isActive ? 'rgba(13, 148, 136, 0.15)' : colors.surface,
                      color: isActive ? colors.accentLight : colors.textMuted,
                      fontSize: 11,
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Documents List */}
          {filteredVaultDocs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredVaultDocs.map(doc => {
                const sender = isSender(doc);
                const senderName = getSenderName(doc);
                const canManage = canDeleteOrManage(doc);
                const isProcessing = processingDocId === doc.id;

                return (
                  <div
                    key={doc.id}
                    onClick={() => onOpenDocument(doc)}
                    style={{
                      padding: 16,
                      borderRadius: 16,
                      backgroundColor: colors.surfaceCard,
                      border: `1px solid ${colors.surfaceBorder}`,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {/* Top Row: Icon + Title + Sender badge */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        backgroundColor: sender ? 'rgba(13, 148, 136, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: sender ? colors.accentLight : '#3B82F6',
                        marginTop: 2,
                      }}>
                        <FileText size={20} />
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: colors.text,
                          lineHeight: 1.3,
                          wordBreak: 'break-word',
                        }}>
                          {doc.title}
                        </div>

                        {/* Metadata row */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          flexWrap: 'wrap',
                          marginTop: 6,
                        }}>
                          {/* Sender badge */}
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 700,
                            backgroundColor: sender ? 'rgba(13, 148, 136, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                            color: sender ? colors.accentLight : '#3B82F6',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}>
                            {sender ? <UserCheck size={11} /> : <Users size={11} />}
                            <span>{sender ? 'Uploaded by You' : `Shared by ${senderName}`}</span>
                          </span>

                          {/* Category badge */}
                          <span style={{
                            padding: '2px 7px',
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 600,
                            backgroundColor: colors.surface,
                            color: colors.textMuted,
                            border: `1px solid ${colors.surfaceBorder}`,
                          }}>
                            {doc.category || 'General'}
                          </span>

                          {/* File format */}
                          {doc.file_format && (
                            <span style={{
                              padding: '2px 7px',
                              borderRadius: 6,
                              fontSize: 10,
                              fontWeight: 600,
                              backgroundColor: colors.surface,
                              color: colors.textMuted,
                              textTransform: 'uppercase',
                              border: `1px solid ${colors.surfaceBorder}`,
                            }}>
                              {doc.file_format}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Divider */}
                    <div style={{ height: 1, backgroundColor: colors.surfaceBorder, width: '100%' }} />

                    {/* Bottom Action Bar */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}>
                      {/* Permission status tag */}
                      <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {canManage ? (
                          <span style={{ color: colors.accentLight, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <ShieldCheck size={13} />
                            <span>{sender ? 'Sender' : 'Admin'} permissions</span>
                          </span>
                        ) : (
                          <span style={{ color: colors.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Lock size={12} />
                            <span>View-only member access</span>
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        {/* View Button (Available to all) */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenDocument(doc);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            padding: '6px 12px',
                            borderRadius: 8,
                            backgroundColor: colors.accent,
                            border: 'none',
                            color: '#FFF',
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>

                        {/* Make Personal / Remove from Vault (Sender & Admin only) */}
                        {canManage && (
                          <button
                            disabled={isProcessing}
                            title={sender ? "Make Personal (Remove from Family Vault)" : "Remove from Family Vault"}
                            onClick={(e) => handleMakePersonal(e, doc)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '6px 10px',
                              borderRadius: 8,
                              backgroundColor: colors.surface,
                              border: `1px solid ${colors.surfaceBorder}`,
                              color: colors.text,
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: isProcessing ? 'wait' : 'pointer',
                              opacity: isProcessing ? 0.6 : 1,
                            }}
                          >
                            <Lock size={12} color={colors.accentLight} />
                            <span>{sender ? 'Make Personal' : 'Unshare'}</span>
                          </button>
                        )}

                        {/* Delete Button (Sender & Admin only) */}
                        {canManage && (
                          <button
                            disabled={isProcessing}
                            title="Delete Document"
                            onClick={(e) => handleDeleteSharedDoc(e, doc)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                              padding: '6px 10px',
                              borderRadius: 8,
                              backgroundColor: 'rgba(239, 68, 68, 0.12)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              color: '#EF4444',
                              fontSize: 11,
                              fontWeight: 600,
                              cursor: isProcessing ? 'wait' : 'pointer',
                              opacity: isProcessing ? 0.6 : 1,
                            }}
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div style={{
              padding: 40,
              borderRadius: 16,
              backgroundColor: colors.surfaceCard,
              border: `1px solid ${colors.surfaceBorder}`,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}>
              <FolderLock size={44} color={colors.accentLight} style={{ opacity: 0.8, marginBottom: 4 }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>
                {docsFilter === 'all' 
                  ? 'No Documents in Family Vault Yet' 
                  : docsFilter === 'mine' 
                    ? 'You Haven\'t Shared Any Documents Yet'
                    : 'No Documents From Other Members Yet'}
              </div>
              <p style={{ fontSize: 12, color: colors.textMuted, maxWidth: 320, lineHeight: 1.5 }}>
                {docsFilter === 'all'
                  ? 'Any group member can share documents into this Family Locker from their Personal Locker using the toggle switch.'
                  : docsFilter === 'mine'
                    ? 'Go to "My Vault" and toggle the Family Locker switch on any document to share it with your family.'
                    : 'When other members in your family group share their documents, they will appear here.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Emergency */}
      {activeTab === 'emergency' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Emergency Trigger Button */}
          <button
            onClick={onOpenEmergencyAccess}
            style={{
              padding: 16,
              borderRadius: 14,
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <ShieldAlert size={24} color={colors.danger} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: colors.danger }}>
                  Simulate Emergency Vault Access
                </div>
                <div style={{ fontSize: 11, color: colors.textMuted }}>
                  Test clinical authorization protocol with audit logging
                </div>
              </div>
            </div>
            <ArrowRight size={18} color={colors.danger} />
          </button>

          {/* Medical Info Card */}
          <div style={{
            padding: 18,
            borderRadius: 16,
            backgroundColor: colors.surfaceCard,
            border: `1px solid ${colors.surfaceBorder}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <HeartPulse size={18} color={colors.danger} />
                <span style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>
                  Emergency Medical Card
                </span>
              </div>
              <button
                onClick={() => setIsEditingMedical(!isEditingMedical)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.accentLight,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isEditingMedical ? 'Cancel' : 'Edit Card'}
              </button>
            </div>

            {isEditingMedical ? (
              <form onSubmit={handleSaveMedicalInfo} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, color: colors.textMuted }}>Blood Group</label>
                    <input
                      type="text"
                      value={bloodGroup}
                      onChange={e => setBloodGroup(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: 8,
                        backgroundColor: colors.surface,
                        border: `1px solid ${colors.surfaceBorder}`,
                        color: colors.text,
                        fontSize: 13,
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: colors.textMuted }}>Organ Donor</label>
                    <div style={{ display: 'flex', alignItems: 'center', height: 36, gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={organDonor}
                        onChange={e => setOrganDonor(e.target.checked)}
                        style={{ width: 18, height: 18, accentColor: colors.accent }}
                      />
                      <span style={{ fontSize: 13, color: colors.text }}>Registered Donor</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: colors.textMuted }}>Allergies</label>
                  <input
                    type="text"
                    value={allergies}
                    placeholder="e.g. Penicillin, Peanuts"
                    onChange={e => setAllergies(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      backgroundColor: colors.surface,
                      border: `1px solid ${colors.surfaceBorder}`,
                      color: colors.text,
                      fontSize: 13,
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, color: colors.textMuted }}>Current Medications</label>
                  <input
                    type="text"
                    value={medications}
                    placeholder="e.g. Inhaler, Insulin"
                    onChange={e => setMedications(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      backgroundColor: colors.surface,
                      border: `1px solid ${colors.surfaceBorder}`,
                      color: colors.text,
                      fontSize: 13,
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, color: colors.textMuted }}>Emergency Instructions</label>
                  <textarea
                    rows={2}
                    value={emergencyNotes}
                    placeholder="Special instructions for emergency responders..."
                    onChange={e => setEmergencyNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      backgroundColor: colors.surface,
                      border: `1px solid ${colors.surfaceBorder}`,
                      color: colors.text,
                      fontSize: 13,
                      resize: 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingMedical}
                  style={{
                    padding: '10px',
                    borderRadius: 8,
                    backgroundColor: colors.accent,
                    color: '#FFF',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginTop: 6,
                  }}
                >
                  {isSavingMedical ? 'Saving...' : 'Save Medical Card'}
                </button>
              </form>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
                <div>
                  <span style={{ color: colors.textMuted }}>Blood Group: </span>
                  <span style={{ fontWeight: 700, color: colors.danger }}>{medicalInfo?.blood_group || 'O+'}</span>
                </div>
                <div>
                  <span style={{ color: colors.textMuted }}>Organ Donor: </span>
                  <span style={{ fontWeight: 600, color: colors.text }}>{medicalInfo?.organ_donor ? 'YES' : 'NO'}</span>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: colors.textMuted }}>Allergies: </span>
                  <span style={{ fontWeight: 600, color: colors.text }}>{medicalInfo?.allergies || 'None specified'}</span>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: colors.textMuted }}>Medications: </span>
                  <span style={{ fontWeight: 600, color: colors.text }}>{medicalInfo?.current_medications || 'None specified'}</span>
                </div>
              </div>
            )}
          </div>

          {/* Emergency Contacts List */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: colors.textMuted }}>
                Delegated Emergency Contacts ({emergencyContacts.length})
              </div>
              <button
                onClick={() => setShowAddContact(!showAddContact)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: colors.accentLight,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Plus size={14} />
                <span>Add Contact</span>
              </button>
            </div>

            {showAddContact && (
              <form onSubmit={handleAddEmergencyContact} style={{
                padding: 14,
                borderRadius: 12,
                backgroundColor: colors.surfaceCard,
                border: `1px solid ${colors.surfaceBorder}`,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                marginBottom: 12,
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>
                  Add Trusted Emergency Contact
                </div>
                <input
                  type="text"
                  required
                  placeholder="Full Name (e.g. Dr. Verma, Spouse)"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.surfaceBorder}`,
                    color: colors.text,
                    fontSize: 13,
                  }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input
                    type="text"
                    required
                    placeholder="Relationship (e.g. Spouse)"
                    value={contactRelationship}
                    onChange={e => setContactRelationship(e.target.value)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      backgroundColor: colors.surface,
                      border: `1px solid ${colors.surfaceBorder}`,
                      color: colors.text,
                      fontSize: 13,
                    }}
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Phone number"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      backgroundColor: colors.surface,
                      border: `1px solid ${colors.surfaceBorder}`,
                      color: colors.text,
                      fontSize: 13,
                    }}
                  />
                </div>
                <input
                  type="email"
                  placeholder="Email (Optional, matches account)"
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.surfaceBorder}`,
                    color: colors.text,
                    fontSize: 13,
                  }}
                />
                <button
                  type="submit"
                  disabled={isSavingContact}
                  style={{
                    padding: '10px',
                    borderRadius: 8,
                    backgroundColor: colors.accent,
                    color: '#FFF',
                    border: 'none',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isSavingContact ? 'Saving...' : 'Add Emergency Contact'}
                </button>
              </form>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {emergencyContacts.map(contact => (
                <div
                  key={contact.id}
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: colors.surfaceCard,
                    border: `1px solid ${colors.surfaceBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                      {contact.name || (contact as any).contact_name || 'Contact'} ({contact.relationship_type || (contact as any).relationship || 'Contact'})
                    </div>
                    <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                      {contact.phone_number || (contact as any).phone || ''} {contact.email ? `• ${contact.email}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {(contact.phone_number || (contact as any).phone) && (
                      <a
                        href={`tel:${contact.phone_number || (contact as any).phone}`}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 8,
                          backgroundColor: '#10B981',
                          color: '#FFF',
                          textDecoration: 'none',
                          fontSize: 11,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Phone size={12} />
                        <span>Call</span>
                      </a>
                    )}
                    <button
                      onClick={() => handleDeleteEmergencyContact(contact.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: colors.danger,
                        cursor: 'pointer',
                        padding: 6,
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Emergency Accessible Documents */}
          <div style={{
            padding: 16,
            borderRadius: 16,
            backgroundColor: colors.surfaceCard,
            border: `1px solid ${colors.surfaceBorder}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldAlert size={18} color={colors.danger} />
                <span style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>
                  Emergency Accessible Documents ({documents.filter(d => Boolean(d.is_emergency_eligible ?? (d as any).emergency_eligible ?? (d as any).isEmergencyEligible)).length})
                </span>
              </div>
            </div>

            <p style={{ fontSize: 11, color: colors.textMuted, margin: '0 0 12px 0', lineHeight: 1.4 }}>
              These critical documents are immediately decrypted and made available to emergency responders and verified delegated contacts during a Break-Glass event.
            </p>

            {documents.filter(d => Boolean(d.is_emergency_eligible ?? (d as any).emergency_eligible ?? (d as any).isEmergencyEligible)).length === 0 ? (
              <div style={{
                padding: 16,
                borderRadius: 12,
                backgroundColor: colors.surface,
                border: `1px dashed ${colors.surfaceBorder}`,
                textAlign: 'center',
              }}>
                <FileText size={28} color={colors.textMuted} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: colors.text }}>No Emergency Documents Configured</div>
                <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                  Mark health insurance, ID cards, or medical records for emergency access below or from My Vault.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {documents.filter(d => Boolean(d.is_emergency_eligible ?? (d as any).emergency_eligible ?? (d as any).isEmergencyEligible)).map(doc => (
                  <div
                    key={doc.id}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: colors.surface,
                      border: `1px solid ${colors.surfaceBorder}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}
                  >
                    <div
                      onClick={() => onOpenDocument(doc)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, cursor: 'pointer' }}
                    >
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        backgroundColor: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <ShieldAlert size={18} color={colors.danger} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: colors.text,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}>
                          {doc.title}
                        </div>
                        <div style={{ fontSize: 11, color: colors.textMuted, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <span>{doc.category || 'Emergency'}</span>
                          {doc.doc_number && <span>• {doc.doc_number}</span>}
                          {doc.expiry_date && <span>• Exp: {doc.expiry_date}</span>}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button
                        onClick={() => onOpenDocument(doc)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: 8,
                          backgroundColor: colors.surfaceCard,
                          border: `1px solid ${colors.surfaceBorder}`,
                          color: colors.text,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Eye size={12} />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => handleToggleEmergencyDoc(doc, false)}
                        title="Remove from Emergency Vault"
                        style={{
                          padding: '6px 8px',
                          borderRadius: 8,
                          backgroundColor: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          color: colors.danger,
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick-Add other personal documents */}
            {documents.filter(d => !d.is_emergency_eligible && !(d as any).emergency_eligible && !(d as any).isEmergencyEligible).length > 0 && (
              <details style={{ marginTop: 12 }}>
                <summary style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: colors.accentLight,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}>
                  + Add more documents to Emergency Vault
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, maxHeight: 180, overflowY: 'auto' }}>
                  {documents
                    .filter(d => !d.is_emergency_eligible && !(d as any).emergency_eligible && !(d as any).isEmergencyEligible)
                    .map(d => (
                      <div
                        key={d.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          borderRadius: 8,
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.surfaceBorder}`,
                        }}
                      >
                        <span style={{ fontSize: 12, color: colors.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {d.title}
                        </span>
                        <button
                          onClick={() => handleToggleEmergencyDoc(d, true)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 6,
                            backgroundColor: colors.accent,
                            color: '#FFF',
                            border: 'none',
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Enable Emergency
                        </button>
                      </div>
                    ))}
                </div>
              </details>
            )}
          </div>
        </div>
      )}
          {/* Manual Token Entry Modal */}
      {showTokenModal && (
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
          padding: 20,
          zIndex: 9999,
        }}>
          <div style={{
            width: '100%',
            maxWidth: 400,
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 24,
            border: `1px solid ${colors.surfaceBorder}`,
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <KeyRound size={20} color={colors.accent} />
                <h3 style={{ fontSize: 16, fontWeight: 800, color: colors.text, margin: 0 }}>
                  Enter Invitation Token
                </h3>
              </div>
              <button
                onClick={() => setShowTokenModal(false)}
                style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: 13, color: colors.textMuted, marginBottom: 16, lineHeight: 1.4 }}>
              Paste the invitation token from your email to instantly join the family vault:
            </p>

            <form onSubmit={handleJoinWithToken} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input
                type="text"
                required
                placeholder="e.g. 92763adb-a7b5-4e5a-8582-870e35a96565"
                value={manualToken}
                onChange={e => setManualToken(e.target.value.trim())}
                style={{
                  padding: '12px 14px',
                  borderRadius: 12,
                  backgroundColor: colors.surfaceCard,
                  border: `1px solid ${colors.surfaceBorder}`,
                  color: colors.text,
                  fontSize: 13,
                  fontFamily: 'monospace',
                  outline: 'none',
                }}
              />

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  onClick={() => setShowTokenModal(false)}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 10,
                    backgroundColor: colors.surfaceCard,
                    border: `1px solid ${colors.surfaceBorder}`,
                    color: colors.textMuted,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isJoiningWithToken || !manualToken.trim()}
                  style={{
                    flex: 2,
                    padding: 12,
                    borderRadius: 10,
                    backgroundColor: colors.accent,
                    border: 'none',
                    color: '#FFF',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: isJoiningWithToken ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isJoiningWithToken ? 'Joining Vault...' : 'Join Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
