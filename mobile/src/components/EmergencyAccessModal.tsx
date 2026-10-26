import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldAlert,
  HeartPulse,
  FileText,
  PhoneCall,
  Plus,
  Trash2,
  Eye,
  Download,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Phone,
  MessageSquare,
  Activity,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
  Heart,
  UserCheck,
} from 'lucide-react';
import { api } from '../services/api';
import { EmergencyContact, DocumentItem, EmergencyMedicalInfo } from '../types';
import { useTheme } from '../context/ThemeContext';
import { previewCache } from '../services/previewCache';

interface EmergencyAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts?: EmergencyContact[];
  medicalInfo?: EmergencyMedicalInfo | null;
  documents?: DocumentItem[];
  onRefresh?: () => void;
  onOpenDocument?: (doc: DocumentItem) => void;
  onOpenUpload?: () => void;
}

type EmergencyTab = 'medical' | 'documents' | 'contacts' | 'breakglass';

export const EmergencyAccessModal: React.FC<EmergencyAccessModalProps> = ({
  isOpen,
  onClose,
  contacts: propContacts = [],
  medicalInfo: propMedicalInfo = null,
  documents: propDocuments = [],
  onRefresh,
  onOpenDocument,
  onOpenUpload,
}) => {
  const { colors } = useTheme();

  const [activeTab, setActiveTab] = useState<EmergencyTab>('medical');
  const [contacts, setContacts] = useState<EmergencyContact[]>(propContacts);
  const [medicalInfo, setMedicalInfo] = useState<EmergencyMedicalInfo | null>(propMedicalInfo);
  const [eligibleDocs, setEligibleDocs] = useState<DocumentItem[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  // Medical Info Editing State
  const [isEditingMedical, setIsEditingMedical] = useState(false);
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [allergies, setAllergies] = useState('');
  const [conditions, setConditions] = useState('');
  const [medications, setMedications] = useState('');
  const [emergencyNotes, setEmergencyNotes] = useState('');
  const [physicianName, setPhysicianName] = useState('');
  const [physicianPhone, setPhysicianPhone] = useState('');
  const [organDonor, setOrganDonor] = useState(false);
  const [isSavingMedical, setIsSavingMedical] = useState(false);

  // Add Contact State
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRel, setNewContactRel] = useState('Spouse');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);

  // Break-Glass State
  const [pin, setPin] = useState('');
  const [breakGlassLoading, setBreakGlassLoading] = useState(false);
  const [breakGlassSuccess, setBreakGlassSuccess] = useState(false);
  const [breakGlassMessage, setBreakGlassMessage] = useState<string | null>(null);
  const [breakGlassError, setBreakGlassError] = useState<string | null>(null);

  // Delegated Access State
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [requestReason, setRequestReason] = useState('');
  const [delegatedLoading, setDelegatedLoading] = useState(false);
  const [delegatedSuccess, setDelegatedSuccess] = useState(false);
  const [delegatedError, setDelegatedError] = useState<string | null>(null);

  // Status banners
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  // Sync props to state
  useEffect(() => {
    if (propContacts && propContacts.length > 0) {
      setContacts(propContacts);
      if (!selectedContactId) {
        setSelectedContactId(propContacts[0]?.id || '');
      }
    }
  }, [propContacts]);

  useEffect(() => {
    if (propMedicalInfo) {
      setMedicalInfo(propMedicalInfo);
      setBloodGroup(propMedicalInfo.blood_group || (propMedicalInfo as any).bloodGroup || 'O+');
      setAllergies(propMedicalInfo.allergies || '');
      setConditions(propMedicalInfo.chronic_conditions || (propMedicalInfo as any).chronicConditions || '');
      setMedications(propMedicalInfo.current_medications || (propMedicalInfo as any).currentMedications || '');
      setEmergencyNotes(propMedicalInfo.emergency_notes || (propMedicalInfo as any).emergencyNotes || '');
      setPhysicianName(propMedicalInfo.physician_name || (propMedicalInfo as any).physicianName || '');
      setPhysicianPhone(propMedicalInfo.physician_phone || (propMedicalInfo as any).physicianPhone || '');
      setOrganDonor(Boolean(propMedicalInfo.organ_donor ?? (propMedicalInfo as any).organDonor));
    }
  }, [propMedicalInfo]);

  // Load initial data when modal opens
  useEffect(() => {
    if (!isOpen) return;

    loadEmergencyData();
  }, [isOpen]);

  const loadEmergencyData = async () => {
    setIsLoadingDocs(true);
    try {
      const [fetchedDocs, fetchedMed, fetchedContacts] = await Promise.all([
        api.getEmergencyEligibleDocuments(),
        api.getEmergencyMedicalInfo(),
        api.getEmergencyContacts(),
      ]);

      if (fetchedDocs && Array.isArray(fetchedDocs)) {
        setEligibleDocs(fetchedDocs);
      } else if (propDocuments && propDocuments.length > 0) {
        setEligibleDocs(propDocuments.filter(d => d.is_emergency_eligible));
      }

      if (fetchedMed) {
        setMedicalInfo(fetchedMed);
        setBloodGroup(fetchedMed.blood_group || (fetchedMed as any).bloodGroup || 'O+');
        setAllergies(fetchedMed.allergies || '');
        setConditions(fetchedMed.chronic_conditions || (fetchedMed as any).chronicConditions || '');
        setMedications(fetchedMed.current_medications || (fetchedMed as any).currentMedications || '');
        setEmergencyNotes(fetchedMed.emergency_notes || (fetchedMed as any).emergencyNotes || '');
        setPhysicianName(fetchedMed.physician_name || (fetchedMed as any).physicianName || '');
        setPhysicianPhone(fetchedMed.physician_phone || (fetchedMed as any).physicianPhone || '');
        setOrganDonor(Boolean(fetchedMed.organ_donor ?? (fetchedMed as any).organDonor));
      }

      if (fetchedContacts && Array.isArray(fetchedContacts)) {
        setContacts(fetchedContacts);
        if (fetchedContacts.length > 0 && !selectedContactId) {
          setSelectedContactId(fetchedContacts[0].id);
        }
      }
    } catch (e) {
      // Fallback to prop documents
      if (propDocuments && propDocuments.length > 0) {
        setEligibleDocs(propDocuments.filter(d => d.is_emergency_eligible));
      }
    } finally {
      setIsLoadingDocs(false);
    }
  };

  if (!isOpen) return null;

  // Save Medical Info
  const handleSaveMedical = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingMedical(true);
    setStatusFeedback(null);
    try {
      const updated = await api.updateEmergencyMedicalInfo({
        blood_group: bloodGroup,
        allergies: allergies.trim(),
        chronic_conditions: conditions.trim(),
        current_medications: medications.trim(),
        emergency_notes: emergencyNotes.trim(),
        physician_name: physicianName.trim(),
        physician_phone: physicianPhone.trim(),
        organ_donor: organDonor,
      });
      setMedicalInfo(updated);
      setIsEditingMedical(false);
      setStatusFeedback('Medical ICE Profile saved successfully.');
      setTimeout(() => setStatusFeedback(null), 3000);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to save medical info.');
    } finally {
      setIsSavingMedical(false);
    }
  };

  // Add Emergency Contact
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) {
      alert('Please provide contact name and phone number.');
      return;
    }

    setIsSavingContact(true);
    try {
      const added = await api.addEmergencyContact({
        name: newContactName.trim(),
        phone: newContactPhone.trim(),
        relationship: newContactRel,
        email: newContactEmail.trim() || undefined,
      });

      setContacts(prev => [...prev, added]);
      setNewContactName('');
      setNewContactPhone('');
      setNewContactEmail('');
      setShowAddContact(false);
      setStatusFeedback('Emergency contact added.');
      setTimeout(() => setStatusFeedback(null), 3000);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to add emergency contact.');
    } finally {
      setIsSavingContact(false);
    }
  };

  // Delete Emergency Contact
  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Remove this emergency contact?')) return;
    try {
      await api.deleteEmergencyContact(contactId);
      setContacts(prev => prev.filter(c => c.id !== contactId));
      setStatusFeedback('Emergency contact removed.');
      setTimeout(() => setStatusFeedback(null), 3000);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to remove contact.');
    }
  };

  // Toggle Document Emergency Status
  const handleToggleEmergencyDoc = async (doc: DocumentItem, makeEligible: boolean) => {
    try {
      await api.updateDocument(doc.id, {
        is_emergency_eligible: makeEligible,
      });

      if (makeEligible) {
        setEligibleDocs(prev => [...prev, { ...doc, is_emergency_eligible: true }]);
        setStatusFeedback(`"${doc.title}" added to Emergency Vault.`);
      } else {
        setEligibleDocs(prev => prev.filter(d => d.id !== doc.id));
        setStatusFeedback(`"${doc.title}" removed from Emergency Vault.`);
      }
      setTimeout(() => setStatusFeedback(null), 3000);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update document emergency eligibility.');
    }
  };

  // Quick PIN Break-Glass Unlock
  const handleExecuteBreakGlass = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setBreakGlassLoading(true);
    setBreakGlassError(null);
    setBreakGlassMessage(null);

    try {
      const res = await api.executeBreakGlass({
        pin: pin.trim() || '2468',
      });

      setBreakGlassSuccess(true);
      setBreakGlassMessage(res.message || 'Emergency Vault Break-Glass Authorized. Cryptographic audit entry saved.');

      if (res.eligible_documents && Array.isArray(res.eligible_documents)) {
        setEligibleDocs(res.eligible_documents);
      }
      if (res.medical_info) {
        setMedicalInfo(res.medical_info);
      }
      if (res.emergency_contacts && Array.isArray(res.emergency_contacts)) {
        setContacts(res.emergency_contacts);
      }
    } catch (err: any) {
      setBreakGlassError(err.message || 'Break-Glass verification failed. Check PIN.');
    } finally {
      setBreakGlassLoading(false);
    }
  };

  // Delegated Access Request
  const handleDelegatedAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestReason.trim()) {
      setDelegatedError('Clinical or legal justification reason is strictly required.');
      return;
    }

    setDelegatedLoading(true);
    setDelegatedError(null);

    try {
      const res = await api.accessEmergencyVault('me', {
        reason: requestReason.trim(),
        emergency_contact_id: selectedContactId || undefined,
      });

      setDelegatedSuccess(true);
      if (res.eligible_documents && Array.isArray(res.eligible_documents)) {
        setEligibleDocs(res.eligible_documents);
      }
      if (res.medical_info) {
        setMedicalInfo(res.medical_info);
      }
    } catch (err: any) {
      setDelegatedError(err.message || 'Emergency access check failed.');
    } finally {
      setDelegatedLoading(false);
    }
  };

  // Preview Document Handler
  const handlePreviewDoc = (doc: DocumentItem) => {
    if (onOpenDocument) {
      onOpenDocument(doc);
    } else {
      window.open(api.getDocumentPreviewUrl(doc.id), '_blank');
    }
  };

  // Candidate documents from user's vault not yet in emergency vault
  const nonEmergencyDocs = (propDocuments || []).filter(
    d => !eligibleDocs.some(ed => ed.id === d.id) && !d.is_emergency_eligible
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: 12,
      }}
    >
      <div
        style={{
          backgroundColor: colors.surface,
          borderRadius: 24,
          border: `1px solid ${colors.surfaceBorder}`,
          width: '100%',
          maxWidth: 620,
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(239, 68, 68, 0.35)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${colors.surfaceBorder}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.12) 0%, transparent 100%)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.danger,
                boxShadow: '0 0 15px rgba(239, 68, 68, 0.25)',
              }}
            >
              <ShieldAlert size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: colors.text, margin: 0 }}>
                  Emergency Vault
                </h2>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 12,
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    color: colors.danger,
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    letterSpacing: '0.04em',
                  }}
                >
                  ICE READY
                </span>
              </div>
              <p style={{ fontSize: 11, color: colors.textMuted, margin: '2px 0 0 0' }}>
                Instant Medical Profile • Essential Records • Emergency SOS
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: colors.textMuted,
              cursor: 'pointer',
              padding: 6,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            borderBottom: `1px solid ${colors.surfaceBorder}`,
            backgroundColor: colors.surfaceCard,
            padding: '4px 8px',
            gap: 4,
          }}
        >
          <button
            onClick={() => setActiveTab('medical')}
            style={{
              flex: 1,
              padding: '10px 4px',
              borderRadius: 10,
              border: 'none',
              backgroundColor: activeTab === 'medical' ? colors.surface : 'transparent',
              color: activeTab === 'medical' ? colors.danger : colors.textMuted,
              fontSize: 12,
              fontWeight: activeTab === 'medical' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.2s',
              boxShadow: activeTab === 'medical' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
            }}
          >
            <HeartPulse size={15} />
            <span>Medical ICE</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            style={{
              flex: 1,
              padding: '10px 4px',
              borderRadius: 10,
              border: 'none',
              backgroundColor: activeTab === 'documents' ? colors.surface : 'transparent',
              color: activeTab === 'documents' ? colors.danger : colors.textMuted,
              fontSize: 12,
              fontWeight: activeTab === 'documents' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.2s',
              boxShadow: activeTab === 'documents' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
            }}
          >
            <FileText size={15} />
            <span>Documents ({eligibleDocs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('contacts')}
            style={{
              flex: 1,
              padding: '10px 4px',
              borderRadius: 10,
              border: 'none',
              backgroundColor: activeTab === 'contacts' ? colors.surface : 'transparent',
              color: activeTab === 'contacts' ? colors.danger : colors.textMuted,
              fontSize: 12,
              fontWeight: activeTab === 'contacts' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.2s',
              boxShadow: activeTab === 'contacts' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
            }}
          >
            <PhoneCall size={15} />
            <span>SOS Contacts ({contacts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('breakglass')}
            style={{
              flex: 1,
              padding: '10px 4px',
              borderRadius: 10,
              border: 'none',
              backgroundColor: activeTab === 'breakglass' ? colors.surface : 'transparent',
              color: activeTab === 'breakglass' ? colors.danger : colors.textMuted,
              fontSize: 12,
              fontWeight: activeTab === 'breakglass' ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 0.2s',
              boxShadow: activeTab === 'breakglass' ? '0 2px 8px rgba(0,0,0,0.2)' : 'none',
            }}
          >
            <ShieldCheck size={15} />
            <span>Break-Glass</span>
          </button>
        </div>

        {/* Status Toast */}
        {statusFeedback && (
          <div
            style={{
              margin: '10px 16px 0 16px',
              padding: '8px 12px',
              borderRadius: 8,
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.4)',
              color: '#34D399',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <CheckCircle2 size={16} />
            <span>{statusFeedback}</span>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            padding: 18,
          }}
        >
          {/* TAB 1: MEDICAL ICE PROFILE */}
          {activeTab === 'medical' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 4,
                }}
              >
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: colors.text, margin: 0 }}>
                    In Case of Emergency (ICE) Profile
                  </h3>
                  <p style={{ fontSize: 11, color: colors.textMuted, margin: '2px 0 0 0' }}>
                    Critical medical vitals visible to first responders and emergency medical staff
                  </p>
                </div>
                <button
                  onClick={() => setIsEditingMedical(!isEditingMedical)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    backgroundColor: isEditingMedical ? colors.surfaceCard : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${isEditingMedical ? colors.surfaceBorder : 'rgba(239, 68, 68, 0.3)'}`,
                    color: isEditingMedical ? colors.text : colors.danger,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isEditingMedical ? 'Cancel' : 'Edit ICE Card'}
                </button>
              </div>

              {isEditingMedical ? (
                /* Medical Info Edit Form */
                <form
                  onSubmit={handleSaveMedical}
                  style={{
                    backgroundColor: colors.surfaceCard,
                    padding: 16,
                    borderRadius: 16,
                    border: `1px solid ${colors.surfaceBorder}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, display: 'block', marginBottom: 4 }}>
                        Blood Group *
                      </label>
                      <select
                        value={bloodGroup}
                        onChange={e => setBloodGroup(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 10,
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.surfaceBorder}`,
                          color: colors.text,
                          fontSize: 13,
                          outline: 'none',
                        }}
                      >
                        {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(bg => (
                          <option key={bg} value={bg}>{bg}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, display: 'block', marginBottom: 6 }}>
                        Organ Donor
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={organDonor}
                          onChange={e => setOrganDonor(e.target.checked)}
                          style={{ width: 18, height: 18, accentColor: colors.danger }}
                        />
                        <span style={{ fontSize: 13, color: colors.text, fontWeight: 500 }}>
                          Registered Organ Donor
                        </span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, display: 'block', marginBottom: 4 }}>
                      Known Allergies
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Penicillin, Peanuts, Sulfa drugs, Latex..."
                      value={allergies}
                      onChange={e => setAllergies(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        backgroundColor: colors.surface,
                        border: `1px solid ${colors.surfaceBorder}`,
                        color: colors.text,
                        fontSize: 13,
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, display: 'block', marginBottom: 4 }}>
                      Chronic Medical Conditions
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Type 2 Diabetes, Asthma, Hypertension, Epilepsy..."
                      value={conditions}
                      onChange={e => setConditions(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        backgroundColor: colors.surface,
                        border: `1px solid ${colors.surfaceBorder}`,
                        color: colors.text,
                        fontSize: 13,
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, display: 'block', marginBottom: 4 }}>
                      Current Daily Medications
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Metformin 500mg, Albuterol Inhaler, Aspirin..."
                      value={medications}
                      onChange={e => setMedications(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        backgroundColor: colors.surface,
                        border: `1px solid ${colors.surfaceBorder}`,
                        color: colors.text,
                        fontSize: 13,
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, display: 'block', marginBottom: 4 }}>
                        Primary Doctor / Physician
                      </label>
                      <input
                        type="text"
                        placeholder="Dr. Name"
                        value={physicianName}
                        onChange={e => setPhysicianName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 10,
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.surfaceBorder}`,
                          color: colors.text,
                          fontSize: 13,
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, display: 'block', marginBottom: 4 }}>
                        Doctor Phone
                      </label>
                      <input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={physicianPhone}
                        onChange={e => setPhysicianPhone(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 10,
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.surfaceBorder}`,
                          color: colors.text,
                          fontSize: 13,
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, display: 'block', marginBottom: 4 }}>
                      Emergency Responder Instructions / Notes
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Special instructions for emergency responders (e.g. Pacemaker implanted, severe asthma, carries EpiPen)..."
                      value={emergencyNotes}
                      onChange={e => setEmergencyNotes(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        backgroundColor: colors.surface,
                        border: `1px solid ${colors.surfaceBorder}`,
                        color: colors.text,
                        fontSize: 13,
                        outline: 'none',
                        resize: 'none',
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingMedical}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: colors.danger,
                      color: '#FFF',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: isSavingMedical ? 'not-allowed' : 'pointer',
                      marginTop: 4,
                      boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                    }}
                  >
                    {isSavingMedical ? 'Saving Medical Profile...' : 'Save Emergency Medical Profile'}
                  </button>
                </form>
              ) : (
                /* Medical Profile Card Display */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {/* Top ICE Badge Summary */}
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 16,
                      backgroundColor: colors.surfaceCard,
                      border: `1px solid ${colors.surfaceBorder}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.02) 100%)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: 16,
                          backgroundColor: 'rgba(239, 68, 68, 0.2)',
                          border: '2px solid #EF4444',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 0 20px rgba(239, 68, 68, 0.3)',
                        }}
                      >
                        <span style={{ fontSize: 9, fontWeight: 700, color: colors.textMuted, textTransform: 'uppercase' }}>
                          BLOOD
                        </span>
                        <span style={{ fontSize: 18, fontWeight: 900, color: colors.danger }}>
                          {bloodGroup}
                        </span>
                      </div>

                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: colors.text }}>
                          Primary Emergency Medical Record
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 6,
                              backgroundColor: organDonor ? 'rgba(16, 185, 129, 0.15)' : 'rgba(156, 163, 175, 0.15)',
                              color: organDonor ? '#34D399' : colors.textMuted,
                              border: `1px solid ${organDonor ? 'rgba(16, 185, 129, 0.3)' : 'rgba(156, 163, 175, 0.3)'}`,
                            }}
                          >
                            {organDonor ? '✓ Registered Organ Donor' : 'Not Registered Organ Donor'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Activity size={24} color={colors.danger} style={{ opacity: 0.6 }} />
                  </div>

                  {/* Medical Details Grid */}
                  <div
                    style={{
                      padding: 16,
                      borderRadius: 16,
                      backgroundColor: colors.surfaceCard,
                      border: `1px solid ${colors.surfaceBorder}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 4 }}>
                        Known Allergies
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: allergies ? '#FCA5A5' : colors.text,
                          padding: allergies ? '6px 10px' : '0',
                          backgroundColor: allergies ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                          borderRadius: 8,
                          display: 'inline-block',
                        }}
                      >
                        {allergies || 'None reported'}
                      </div>
                    </div>

                    <div style={{ height: 1, backgroundColor: colors.surfaceBorder }} />

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 4 }}>
                        Chronic Conditions
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                        {conditions || 'None reported'}
                      </div>
                    </div>

                    <div style={{ height: 1, backgroundColor: colors.surfaceBorder }} />

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 4 }}>
                        Current Medications
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                        {medications || 'None reported'}
                      </div>
                    </div>

                    {(physicianName || physicianPhone) && (
                      <>
                        <div style={{ height: 1, backgroundColor: colors.surfaceBorder }} />
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, marginBottom: 2 }}>
                              Primary Doctor
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                              {physicianName || 'Attending Physician'}
                            </div>
                            {physicianPhone && (
                              <div style={{ fontSize: 11, color: colors.textMuted }}>{physicianPhone}</div>
                            )}
                          </div>
                          {physicianPhone && (
                            <a
                              href={`tel:${physicianPhone}`}
                              style={{
                                padding: '6px 12px',
                                borderRadius: 8,
                                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                color: '#34D399',
                                fontSize: 12,
                                fontWeight: 600,
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <Phone size={13} />
                              <span>Call Doctor</span>
                            </a>
                          )}
                        </div>
                      </>
                    )}

                    {emergencyNotes && (
                      <div
                        style={{
                          marginTop: 6,
                          padding: 12,
                          borderRadius: 10,
                          backgroundColor: 'rgba(245, 158, 11, 0.1)',
                          border: '1px solid rgba(245, 158, 11, 0.25)',
                          color: colors.warning,
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                          Emergency Instructions / Special Notes:
                        </div>
                        <div style={{ fontSize: 13, lineHeight: 1.5, color: colors.text }}>
                          {emergencyNotes}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EMERGENCY DOCUMENTS */}
          {activeTab === 'documents' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: colors.text, margin: 0 }}>
                    Emergency-Eligible Documents ({eligibleDocs.length})
                  </h3>
                  <p style={{ fontSize: 11, color: colors.textMuted, margin: '2px 0 0 0' }}>
                    Critical records accessible immediately during hospitalization or clinical review
                  </p>
                </div>
                {onOpenUpload && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenUpload();
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
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
                    <Plus size={14} />
                    <span>Upload New</span>
                  </button>
                )}
              </div>

              {/* Active Emergency Documents */}
              {eligibleDocs.length === 0 ? (
                <div
                  style={{
                    padding: 24,
                    borderRadius: 16,
                    backgroundColor: colors.surfaceCard,
                    border: `1px dashed ${colors.surfaceBorder}`,
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <FileText size={32} color={colors.textMuted} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
                      No Documents in Emergency Vault Yet
                    </div>
                    <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, maxWidth: 380 }}>
                      Mark your Health Insurance, Blood Group Card, Government ID, or Hospital Discharge summaries for instant emergency access.
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {eligibleDocs.map(doc => (
                    <div
                      key={doc.id}
                      style={{
                        padding: 12,
                        borderRadius: 14,
                        backgroundColor: colors.surfaceCard,
                        border: `1px solid ${colors.surfaceBorder}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <div
                        onClick={() => handlePreviewDoc(doc)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          flex: 1,
                          cursor: 'pointer',
                        }}
                      >
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: colors.danger,
                          }}
                        >
                          <FileText size={20} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                            {doc.title}
                          </div>
                          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                            {doc.category} • {doc.issuer || 'Verified Document'}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          onClick={() => handlePreviewDoc(doc)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 8,
                            backgroundColor: 'rgba(99, 102, 241, 0.15)',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            color: '#818CF8',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>

                        <a
                          href={api.getDocumentDownloadUrl(doc.id)}
                          download
                          style={{
                            padding: '6px 10px',
                            borderRadius: 8,
                            backgroundColor: colors.surface,
                            border: `1px solid ${colors.surfaceBorder}`,
                            color: colors.text,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textDecoration: 'none',
                          }}
                        >
                          <Download size={14} />
                        </a>

                        <button
                          onClick={() => handleToggleEmergencyDoc(doc, false)}
                          title="Remove from Emergency Vault"
                          style={{
                            padding: '6px 8px',
                            borderRadius: 8,
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: colors.textMuted,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add other documents to emergency vault */}
              {nonEmergencyDocs.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: colors.textMuted, marginBottom: 8 }}>
                    Add from Your Vault to Emergency Access ({nonEmergencyDocs.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {nonEmergencyDocs.map(doc => (
                      <div
                        key={doc.id}
                        style={{
                          padding: '10px 14px',
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
                            {doc.title}
                          </div>
                          <div style={{ fontSize: 11, color: colors.textMuted }}>
                            {doc.category}
                          </div>
                        </div>

                        <button
                          onClick={() => handleToggleEmergencyDoc(doc, true)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 8,
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: colors.danger,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <Plus size={14} />
                          <span>Add to ICE</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SOS EMERGENCY CONTACTS */}
          {activeTab === 'contacts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: colors.text, margin: 0 }}>
                    Emergency SOS Contacts ({contacts.length})
                  </h3>
                  <p style={{ fontSize: 11, color: colors.textMuted, margin: '2px 0 0 0' }}>
                    Trusted family, physician, and emergency authorities with 1-tap call
                  </p>
                </div>
                <button
                  onClick={() => setShowAddContact(!showAddContact)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    backgroundColor: showAddContact ? colors.surfaceCard : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${showAddContact ? colors.surfaceBorder : 'rgba(239, 68, 68, 0.3)'}`,
                    color: showAddContact ? colors.text : colors.danger,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Plus size={14} />
                  <span>{showAddContact ? 'Cancel' : 'Add Contact'}</span>
                </button>
              </div>

              {/* Add Contact Form */}
              {showAddContact && (
                <form
                  onSubmit={handleAddContact}
                  style={{
                    backgroundColor: colors.surfaceCard,
                    padding: 16,
                    borderRadius: 16,
                    border: `1px solid ${colors.surfaceBorder}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, display: 'block', marginBottom: 4 }}>
                        Contact Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Priya Sharma"
                        value={newContactName}
                        onChange={e => setNewContactName(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 10,
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.surfaceBorder}`,
                          color: colors.text,
                          fontSize: 13,
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, display: 'block', marginBottom: 4 }}>
                        Relationship *
                      </label>
                      <select
                        value={newContactRel}
                        onChange={e => setNewContactRel(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 10,
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.surfaceBorder}`,
                          color: colors.text,
                          fontSize: 13,
                          outline: 'none',
                        }}
                      >
                        {['Spouse', 'Parent', 'Child', 'Sibling', 'Doctor', 'Friend', 'Guardian', 'Other'].map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, display: 'block', marginBottom: 4 }}>
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="+91 98765 43210"
                        value={newContactPhone}
                        onChange={e => setNewContactPhone(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 10,
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.surfaceBorder}`,
                          color: colors.text,
                          fontSize: 13,
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, display: 'block', marginBottom: 4 }}>
                        Email (Optional)
                      </label>
                      <input
                        type="email"
                        placeholder="contact@email.com"
                        value={newContactEmail}
                        onChange={e => setNewContactEmail(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 10,
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.surfaceBorder}`,
                          color: colors.text,
                          fontSize: 13,
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSavingContact}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: colors.danger,
                      color: '#FFF',
                      border: 'none',
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: isSavingContact ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                    }}
                  >
                    <Plus size={16} />
                    <span>{isSavingContact ? 'Adding Contact...' : 'Save Emergency Contact'}</span>
                  </button>
                </form>
              )}

              {/* Contacts List */}
              {contacts.length === 0 ? (
                <div
                  style={{
                    padding: 24,
                    borderRadius: 16,
                    backgroundColor: colors.surfaceCard,
                    border: `1px dashed ${colors.surfaceBorder}`,
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <PhoneCall size={32} color={colors.textMuted} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
                      No Emergency Contacts Configured
                    </div>
                    <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, maxWidth: 360 }}>
                      Add your family members, spouse, or personal physician so first responders can contact them immediately.
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddContact(true)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 10,
                      backgroundColor: colors.danger,
                      color: '#FFF',
                      border: 'none',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      marginTop: 4,
                    }}
                  >
                    Add First Contact
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {contacts.map(c => {
                    const phone = c.phone_number || (c as any).phone || '';
                    const rel = c.relationship_type || (c as any).relationship || 'Contact';

                    return (
                      <div
                        key={c.id}
                        style={{
                          padding: 14,
                          borderRadius: 14,
                          backgroundColor: colors.surfaceCard,
                          border: `1px solid ${colors.surfaceBorder}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 12,
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#34D399',
                            }}
                          >
                            <Phone size={18} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>
                                {c.name || (c as any).contact_name}
                              </span>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                  color: colors.danger,
                                }}
                              >
                                {rel}
                              </span>
                            </div>
                            <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                              {phone} {c.email ? `• ${c.email}` : ''}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {phone && (
                            <>
                              <a
                                href={`tel:${phone}`}
                                style={{
                                  padding: '8px 14px',
                                  borderRadius: 10,
                                  backgroundColor: '#10B981',
                                  color: '#FFF',
                                  textDecoration: 'none',
                                  fontSize: 12,
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                                }}
                              >
                                <Phone size={13} />
                                <span>Call</span>
                              </a>

                              <a
                                href={`sms:${phone}`}
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: 10,
                                  backgroundColor: colors.surface,
                                  border: `1px solid ${colors.surfaceBorder}`,
                                  color: colors.text,
                                  textDecoration: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <MessageSquare size={14} />
                              </a>
                            </>
                          )}

                          <button
                            onClick={() => handleDeleteContact(c.id)}
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
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: BREAK-GLASS & DELEGATED PROTOCOL */}
          {activeTab === 'breakglass' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Break Glass Banner */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 14,
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: colors.danger,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  fontSize: 12,
                  lineHeight: 1.5,
                }}
              >
                <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong style={{ display: 'block', marginBottom: 2 }}>Break-Glass Emergency Protocol</strong>
                  Provides instantaneous emergency access to verified clinical vitals and documents. Every trigger records a permanent, cryptographically signed entry to the security audit trail.
                </div>
              </div>

              {breakGlassSuccess ? (
                /* Unlocked Confirmation */
                <div
                  style={{
                    padding: 18,
                    borderRadius: 16,
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid #10B981',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#34D399' }}>
                    <CheckCircle2 size={24} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>
                        Emergency Break-Glass Authorized
                      </div>
                      <div style={{ fontSize: 11, color: '#A7F3D0', marginTop: 2 }}>
                        {breakGlassMessage || 'Cryptographic audit ledger updated. Emergency documents decrypted.'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                    <button
                      onClick={() => setActiveTab('medical')}
                      style={{
                        flex: 1,
                        padding: 10,
                        borderRadius: 10,
                        backgroundColor: '#10B981',
                        color: '#FFF',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      View Medical ICE Card
                    </button>
                    <button
                      onClick={() => setActiveTab('documents')}
                      style={{
                        flex: 1,
                        padding: 10,
                        borderRadius: 10,
                        backgroundColor: colors.surface,
                        border: '1px solid #10B981',
                        color: '#34D399',
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: 'pointer',
                      }}
                    >
                      View Documents ({eligibleDocs.length})
                    </button>
                  </div>
                </div>
              ) : (
                /* Quick PIN Unlock Form */
                <form
                  onSubmit={handleExecuteBreakGlass}
                  style={{
                    padding: 16,
                    borderRadius: 16,
                    backgroundColor: colors.surfaceCard,
                    border: `1px solid ${colors.surfaceBorder}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Lock size={18} color={colors.danger} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>
                      Immediate Quick PIN Break-Glass Unlock
                    </span>
                  </div>

                  {breakGlassError && (
                    <div
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                        color: '#FCA5A5',
                        fontSize: 12,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <AlertTriangle size={15} />
                      <span>{breakGlassError}</span>
                    </div>
                  )}

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, display: 'block', marginBottom: 4 }}>
                      Emergency PIN (Default: 2468 or Your Quick PIN)
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      placeholder="Enter 4-digit PIN..."
                      value={pin}
                      onChange={e => setPin(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: 10,
                        backgroundColor: colors.surface,
                        border: `1px solid ${colors.surfaceBorder}`,
                        color: colors.text,
                        fontSize: 16,
                        letterSpacing: '0.2em',
                        outline: 'none',
                        textAlign: 'center',
                        fontWeight: 700,
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={breakGlassLoading}
                    style={{
                      padding: 14,
                      borderRadius: 12,
                      backgroundColor: colors.danger,
                      color: '#FFF',
                      border: 'none',
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: breakGlassLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                    }}
                  >
                    <Unlock size={18} />
                    <span>{breakGlassLoading ? 'Verifying Break-Glass...' : 'Break Glass & Unlock Vault'}</span>
                  </button>
                </form>
              )}

              {/* Delegated Access Section for Emergency Responders */}
              <div
                style={{
                  padding: 16,
                  borderRadius: 16,
                  backgroundColor: colors.surfaceCard,
                  border: `1px solid ${colors.surfaceBorder}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <UserCheck size={18} color={colors.accentLight} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>
                    Paramedic / Delegated Contact Protocol
                  </span>
                </div>

                <p style={{ fontSize: 11, color: colors.textMuted, margin: 0 }}>
                  For use by authorized paramedics, emergency room physicians, or nominated emergency contacts.
                </p>

                {delegatedError && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: 8,
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      color: '#FCA5A5',
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <AlertTriangle size={15} />
                    <span>{delegatedError}</span>
                  </div>
                )}

                {delegatedSuccess ? (
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      backgroundColor: 'rgba(16, 185, 129, 0.15)',
                      color: '#34D399',
                      fontSize: 12,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <CheckCircle2 size={16} />
                    <span>Emergency request verified and logged to audit trail.</span>
                  </div>
                ) : (
                  <form onSubmit={handleDelegatedAccess} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {contacts.length > 0 && (
                      <div>
                        <label style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, display: 'block', marginBottom: 4 }}>
                          Emergency Contact Authority
                        </label>
                        <select
                          value={selectedContactId}
                          onChange={e => setSelectedContactId(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: 10,
                            backgroundColor: colors.surface,
                            border: `1px solid ${colors.surfaceBorder}`,
                            color: colors.text,
                            fontSize: 13,
                            outline: 'none',
                          }}
                        >
                          {contacts.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.relationship_type || (c as any).relationship || 'Contact'})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label style={{ fontSize: 11, fontWeight: 600, color: colors.textMuted, display: 'block', marginBottom: 4 }}>
                        Clinical Justification Reason *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Acute trauma triage, ICU admission, paramedic verification..."
                        value={requestReason}
                        onChange={e => setRequestReason(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 10,
                          backgroundColor: colors.surface,
                          border: `1px solid ${colors.surfaceBorder}`,
                          color: colors.text,
                          fontSize: 13,
                          outline: 'none',
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={delegatedLoading}
                      style={{
                        padding: 12,
                        borderRadius: 10,
                        backgroundColor: colors.surface,
                        border: `1px solid ${colors.accent}`,
                        color: colors.accentLight,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: delegatedLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                        marginTop: 4,
                      }}
                    >
                      <ShieldCheck size={16} />
                      <span>{delegatedLoading ? 'Authorizing...' : 'Submit Emergency Justification'}</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
