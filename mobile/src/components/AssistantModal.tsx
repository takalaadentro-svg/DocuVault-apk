import React, { useState, useEffect } from 'react';
import { 
  X, MessageSquare, Briefcase, FileCheck, Copy, Check, Sparkles, 
  Send, AlertCircle, ShieldAlert, ArrowRight, ExternalLink, RefreshCw, FileText, Mic, MicOff
} from 'lucide-react';
import { speechService } from '../services/speech';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { DocumentPack, ConsistencyCheckResult, DocumentChatResponse, DocumentItem } from '../types';

interface AssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDocument?: (docId: string) => void;
  documents?: DocumentItem[];
}

export const AssistantModal: React.FC<AssistantModalProps> = ({
  isOpen,
  onClose,
  onOpenDocument,
  documents = []
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'chat' | 'packs' | 'consistency' | 'autofill'>('chat');

  // Dynamically derive verified autofill profile from real documents and authenticated user
  const autofillFields = React.useMemo(() => {
    const findDoc = (pred: (d: DocumentItem) => boolean) => documents.find(pred);

    // 1. Full Name
    const nameDoc = findDoc(d => Boolean(d.holder_name?.trim()));
    const fullName = nameDoc?.holder_name || user?.full_name || '';

    // 2. DOB
    const dobDoc = findDoc(d => Boolean(d.dob?.trim()));
    const dob = dobDoc?.dob || '';

    // 3. Aadhaar
    const aadhaarDoc = findDoc(d => {
      const text = `${d.title} ${d.subtype || ''} ${d.doc_type || ''}`.toLowerCase();
      return text.includes('aadhaar') || text.includes('aadhar') || text.includes('uidai');
    });
    const aadhaarNum = aadhaarDoc?.doc_number || (aadhaarDoc?.ocr_text?.match(/\b\d{4}\s\d{4}\s\d{4}\b/)?.[0]) || '';

    // 4. PAN
    const panDoc = findDoc(d => {
      const text = `${d.title} ${d.subtype || ''} ${d.doc_type || ''}`.toLowerCase();
      return text.includes('pan') || Boolean(d.doc_number?.match(/^[A-Z]{5}[0-9]{4}[A-Z]$/i));
    });
    const panNum = panDoc?.doc_number || (panDoc?.ocr_text?.match(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/)?.[0]) || '';

    // 5. Passport
    const passportDoc = findDoc(d => {
      const text = `${d.title} ${d.subtype || ''} ${d.doc_type || ''}`.toLowerCase();
      return text.includes('passport');
    });
    const passportNum = passportDoc?.doc_number || (passportDoc?.ocr_text?.match(/\b[A-Z][0-9]{7}\b/)?.[0]) || '';

    // 6. Driving License
    const dlDoc = findDoc(d => {
      const text = `${d.title} ${d.subtype || ''} ${d.doc_type || ''}`.toLowerCase();
      return text.includes('driving') || text.includes('license') || text.includes('dl');
    });
    const dlNum = dlDoc?.doc_number || '';

    // 7. Medical / Insurance
    const medDoc = findDoc(d => (d.category || '').toLowerCase() === 'medical');
    const medNum = medDoc?.doc_number || '';

    return [
      {
        label: 'Full Legal Name',
        value: fullName,
        source: nameDoc ? `Verified (${nameDoc.title})` : user?.full_name ? 'User Account' : 'Not in vault',
        isAvailable: Boolean(fullName),
      },
      {
        label: 'Date of Birth (DOB)',
        value: dob,
        source: dobDoc ? `Verified (${dobDoc.title})` : 'Not in vault',
        isAvailable: Boolean(dob),
      },
      {
        label: 'Aadhaar Number',
        value: aadhaarNum,
        source: aadhaarDoc ? `Verified (${aadhaarDoc.title})` : 'Not in vault',
        isAvailable: Boolean(aadhaarNum),
      },
      {
        label: 'PAN Number',
        value: panNum,
        source: panDoc ? `Verified (${panDoc.title})` : 'Not in vault',
        isAvailable: Boolean(panNum),
      },
      {
        label: 'Passport Number',
        value: passportNum,
        source: passportDoc ? `Verified (${passportDoc.title})` : 'Not in vault',
        isAvailable: Boolean(passportNum),
      },
      {
        label: 'Driving License',
        value: dlNum,
        source: dlDoc ? `Verified (${dlDoc.title})` : 'Not in vault',
        isAvailable: Boolean(dlNum),
      },
      {
        label: 'Health Insurance / Policy No',
        value: medNum,
        source: medDoc ? `Verified (${medDoc.title})` : 'Not in vault',
        isAvailable: Boolean(medNum),
      },
      {
        label: 'Registered Email',
        value: user?.email || '',
        source: 'Verified Account Email',
        isAvailable: Boolean(user?.email),
      },
      {
        label: 'Phone Number',
        value: user?.phone_number || '',
        source: user?.phone_number ? 'Verified Account Mobile' : 'Not in vault',
        isAvailable: Boolean(user?.phone_number),
      },
    ];
  }, [documents, user]);

  // Chat State
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{
    id: string;
    role: 'user' | 'assistant';
    text: string;
    citations?: any[];
  }>>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hello! I am your DocuVault 2.0 AI Document Assistant. You can ask me any question about your encrypted documents, and I will cite exact passages.'
    }
  ]);

  // Packs State
  const [packs, setPacks] = useState<DocumentPack[]>([]);
  const [loadingPacks, setLoadingPacks] = useState(false);

  // Consistency State
  const [consistency, setConsistency] = useState<ConsistencyCheckResult | null>(null);
  const [loadingConsistency, setLoadingConsistency] = useState(false);

  // Autofill State
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Speech State
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      speechService.stopListening();
    };
  }, []);

  const toggleVoiceInput = async () => {
    if (isListening) {
      speechService.stopListening();
      setIsListening(false);
      setVoiceNotice(null);
    } else {
      setIsListening(true);
      setVoiceNotice('Listening to your question... Speak clearly');

      const started = await speechService.startListening({
        onStart: () => {
          setIsListening(true);
          setVoiceNotice('Listening... Speak your question');
        },
        onTranscript: (transcript: string, isFinal: boolean) => {
          setQuestion(transcript);
          setVoiceNotice(`Heard: "${transcript}"`);
          if (isFinal) {
            setTimeout(() => {
              setVoiceNotice(null);
              setIsListening(false);
              // auto-send if complete question
              if (transcript.length > 5) {
                handleSendQuestion(transcript);
              }
            }, 1000);
          }
        },
        onError: (errMsg: string) => {
          setIsListening(false);
          setVoiceNotice(errMsg);
          setTimeout(() => setVoiceNotice(null), 3500);
        },
        onEnd: () => {
          setIsListening(false);
          setTimeout(() => setVoiceNotice(null), 2000);
        }
      });

      if (!started) {
        setIsListening(false);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'packs' && packs.length === 0) loadPacks();
      if (activeTab === 'consistency' && !consistency) loadConsistency();
    }
  }, [isOpen, activeTab]);

  const loadPacks = async () => {
    setLoadingPacks(true);
    try {
      const data = await api.getDocumentPacks();
      setPacks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPacks(false);
    }
  };

  const loadConsistency = async () => {
    setLoadingConsistency(true);
    try {
      const data = await api.getConsistencyCheck();
      setConsistency(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingConsistency(false);
    }
  };

  const handleSendQuestion = async (queryText?: string) => {
    const q = queryText || question;
    if (!q.trim() || isAsking) return;

    const userMsgId = 'msg-' + Date.now();
    setChatMessages(prev => [...prev, { id: userMsgId, role: 'user', text: q }]);
    setQuestion('');
    setIsAsking(true);

    try {
      const response: DocumentChatResponse = await api.chatWithDocuments(q, documents);
      setChatMessages(prev => [
        ...prev,
        {
          id: 'res-' + Date.now(),
          role: 'assistant',
          text: response.answer,
          citations: response.citations
        }
      ]);
    } catch (e: any) {
      setChatMessages(prev => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'assistant',
          text: 'Unable to query documents at this moment: ' + (e?.message || 'Network error')
        }
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(8px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
    }}>
      <div style={{
        backgroundColor: colors.surfaceCard,
        borderRadius: 24,
        width: '100%',
        maxWidth: 620,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
        border: `1px solid ${colors.surfaceBorder}`,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: `1px solid ${colors.surfaceBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(13, 148, 136, 0.1) 0%, rgba(30, 58, 138, 0.1) 100%)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              backgroundColor: '#0D9488',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFF',
            }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: colors.text, margin: 0 }}>
                DocuVault Intelligence Assistant
              </h2>
              <span style={{ fontSize: 11, color: colors.accentLight, fontWeight: 700 }}>
                RAG Engine • 2.0 Productivity Suite
              </span>
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
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: `1px solid ${colors.surfaceBorder}`,
          backgroundColor: 'rgba(0,0,0,0.05)',
        }}>
          {[
            { id: 'chat', label: 'Chat RAG', icon: MessageSquare },
            { id: 'packs', label: 'Smart Packs', icon: Briefcase },
            { id: 'consistency', label: 'Consistency', icon: FileCheck },
            { id: 'autofill', label: 'Form Autofill', icon: Copy },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  flex: 1,
                  padding: '12px 8px',
                  background: 'none',
                  border: 'none',
                  borderBottom: `2.5px solid ${isActive ? colors.accentLight : 'transparent'}`,
                  color: isActive ? colors.accentLight : colors.textMuted,
                  fontSize: 13,
                  fontWeight: isActive ? 800 : 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'all 0.2s ease',
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {/* TAB 1: CHAT WITH DOCUMENTS (RAG) */}
          {activeTab === 'chat' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: 420 }}>
              {/* Message History */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 10 }}>
                {chatMessages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      backgroundColor: msg.role === 'user' ? colors.accent : colors.surfaceBorder,
                      color: msg.role === 'user' ? '#FFF' : colors.text,
                      padding: '12px 16px',
                      borderRadius: 16,
                      borderBottomRightRadius: msg.role === 'user' ? 4 : 16,
                      borderBottomLeftRadius: msg.role === 'assistant' ? 4 : 16,
                      fontSize: 14,
                      lineHeight: 1.5,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  >
                    <div>{msg.text}</div>
                    {/* Source Citations */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: colors.accentLight, marginBottom: 4 }}>
                          Cited Sources:
                        </div>
                        {msg.citations.map((c, idx) => (
                          <div 
                            key={idx}
                            style={{
                              fontSize: 11,
                              backgroundColor: 'rgba(0,0,0,0.2)',
                              padding: '6px 8px',
                              borderRadius: 8,
                              marginTop: 4,
                            }}
                          >
                            <span style={{ fontWeight: 700 }}>📄 {c.documentTitle}</span> ({Math.round(c.confidence * 100)}% match)
                            <div style={{ fontStyle: 'italic', opacity: 0.9, marginTop: 2 }}>"{c.excerpt}"</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {isAsking && (
                  <div style={{ alignSelf: 'flex-start', color: colors.textMuted, fontSize: 13, fontStyle: 'italic' }}>
                    Searching OCR index and synthesizing verified answer...
                  </div>
                )}
              </div>

              {/* Sample Prompts */}
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 0', borderTop: `1px solid ${colors.surfaceBorder}` }}>
                {['What documents do I have?', 'When does my passport expire?', 'What is my Aadhaar number?', 'What is my Date of Birth?'].map(preset => (
                  <button
                    key={preset}
                    onClick={() => handleSendQuestion(preset)}
                    style={{
                      whiteSpace: 'nowrap',
                      padding: '5px 10px',
                      borderRadius: 20,
                      backgroundColor: 'rgba(13, 148, 136, 0.12)',
                      border: `1px solid ${colors.accentLight}`,
                      color: colors.accentLight,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {voiceNotice && (
                <div style={{
                  fontSize: 12,
                  color: colors.accentLight,
                  padding: '6px 12px',
                  backgroundColor: 'rgba(13, 148, 136, 0.12)',
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 6,
                  border: `1px solid ${colors.accent}`,
                  animation: 'pulse 1.5s infinite',
                }}>
                  <Sparkles size={14} />
                  <span>{voiceNotice}</span>
                </div>
              )}

              {/* Input bar with Voice Input Mic */}
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <input
                  type="text"
                  placeholder={isListening ? "Listening to your voice..." : "Ask any question about your documents..."}
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendQuestion()}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: 14,
                    backgroundColor: colors.bg,
                    border: `1px solid ${isListening ? colors.accent : colors.surfaceBorder}`,
                    boxShadow: isListening ? '0 0 12px rgba(13, 148, 136, 0.4)' : 'none',
                    color: colors.text,
                    fontSize: 14,
                    outline: 'none',
                  }}
                />

                {/* Voice Input Button */}
                <button
                  type="button"
                  onClick={toggleVoiceInput}
                  title={isListening ? "Stop Voice Input" : "Speak your Question"}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 14,
                    backgroundColor: isListening ? '#EF4444' : colors.surface,
                    border: `1px solid ${colors.surfaceBorder}`,
                    color: isListening ? '#FFFFFF' : colors.accentLight,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    animation: isListening ? 'pulse 1.2s infinite' : 'none',
                  }}
                >
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>

                <button
                  onClick={() => handleSendQuestion()}
                  disabled={!question.trim() || isAsking}
                  style={{
                    padding: '12px 18px',
                    borderRadius: 14,
                    backgroundColor: colors.accent,
                    color: '#FFF',
                    border: 'none',
                    cursor: !question.trim() || isAsking ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: SMART DOCUMENT PACKS */}
          {activeTab === 'packs' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <p style={{ fontSize: 13, color: colors.textMuted, margin: 0 }}>
                  Pre-configured document bundles for official life milestones:
                </p>
                <button
                  onClick={loadPacks}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: colors.accentLight,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 12,
                  }}
                >
                  <RefreshCw size={13} className={loadingPacks ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {packs.map(pack => (
                  <div
                    key={pack.packId}
                    style={{
                      border: `1px solid ${colors.surfaceBorder}`,
                      borderRadius: 16,
                      padding: 16,
                      backgroundColor: 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <h4 style={{ fontSize: 15, fontWeight: 800, color: colors.text, margin: 0 }}>
                          {pack.packName}
                        </h4>
                        <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                          {pack.purpose}
                        </div>
                      </div>
                      <div style={{
                        padding: '4px 10px',
                        borderRadius: 20,
                        backgroundColor: pack.completenessPercentage === 100 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: pack.completenessPercentage === 100 ? colors.success : '#F59E0B',
                        fontSize: 12,
                        fontWeight: 800,
                      }}>
                        {pack.completenessPercentage}% Complete
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{
                      width: '100%',
                      height: 6,
                      backgroundColor: colors.surfaceBorder,
                      borderRadius: 3,
                      overflow: 'hidden',
                      marginBottom: 12,
                    }}>
                      <div style={{
                        width: `${pack.completenessPercentage}%`,
                        height: '100%',
                        backgroundColor: pack.completenessPercentage === 100 ? colors.success : colors.accentLight,
                        borderRadius: 3,
                        transition: 'width 0.4s ease',
                      }} />
                    </div>

                    {/* Checklist items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {pack.items.map((item, i) => (
                        <div 
                          key={i} 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontSize: 12,
                            padding: '6px 8px',
                            borderRadius: 8,
                            backgroundColor: item.isAvailable ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {item.isAvailable ? (
                              <Check size={14} color={colors.success} />
                            ) : (
                              <AlertCircle size={14} color={colors.danger} />
                            )}
                            <span style={{ color: item.isAvailable ? colors.text : colors.textMuted }}>
                              {item.requiredDocType}
                            </span>
                          </div>
                          <span style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: item.isAvailable ? colors.success : colors.danger,
                          }}>
                            {item.isAvailable ? `Verified (${item.matchedDocumentTitle})` : 'Missing'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: CROSS-DOCUMENT CONSISTENCY CHECKER */}
          {activeTab === 'consistency' && (
            <div>
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 13, color: colors.textMuted, margin: 0 }}>
                  Automated reconciliation across Identity, Education & Travel records to flag inconsistencies:
                </p>
              </div>

              {loadingConsistency ? (
                <div style={{ textAlign: 'center', padding: 40, color: colors.textMuted }}>
                  Analyzing documents...
                </div>
              ) : consistency ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: consistency.isConsistent ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                    border: `1px solid ${consistency.isConsistent ? colors.success : '#F59E0B'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}>
                    {consistency.isConsistent ? (
                      <Check size={22} color={colors.success} />
                    ) : (
                      <ShieldAlert size={22} color="#F59E0B" />
                    )}
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: colors.text }}>
                        {consistency.isConsistent ? 'All Evaluated Documents are Consistent' : 'Potential Field Variations Flagged'}
                      </div>
                      <div style={{ fontSize: 12, color: colors.textMuted }}>
                        Analyzed {consistency.totalDocumentsAnalyzed} official vault documents.
                      </div>
                    </div>
                  </div>

                  {/* Issues */}
                  {consistency.issues.length > 0 && (
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, marginBottom: 8 }}>
                        Discrepancies to Review:
                      </div>
                      {consistency.issues.map((issue, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: 12,
                            borderRadius: 12,
                            backgroundColor: 'rgba(239, 68, 68, 0.08)',
                            border: `1px solid ${colors.danger}`,
                            marginBottom: 8,
                          }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 700, color: colors.danger, marginBottom: 4 }}>
                            ⚠️ {issue.fieldName} Discrepancy
                          </div>
                          <div style={{ fontSize: 12, color: colors.text }}>
                            • <b>{issue.document1Title}</b>: "{issue.value1}"
                          </div>
                          <div style={{ fontSize: 12, color: colors.text }}>
                            • <b>{issue.document2Title}</b>: "{issue.value2}"
                          </div>
                          <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, fontStyle: 'italic' }}>
                            Advice: {issue.advice}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Passed Checks */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: colors.text, marginBottom: 8 }}>
                      Verified Matching Fields:
                    </div>
                    {consistency.passedFields.map((field, idx) => (
                      <div 
                        key={idx}
                        style={{
                          fontSize: 12,
                          color: colors.success,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          marginBottom: 6,
                        }}
                      >
                        <Check size={14} />
                        <span>{field}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* TAB 4: SMART FORM AUTOFILL */}
          {activeTab === 'autofill' && (
            <div>
              <p style={{ fontSize: 13, color: colors.textMuted, marginBottom: 14 }}>
                Instant copy-paste profile verified from your official document OCR records:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {autofillFields.map((field, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: colors.bg,
                      border: `1px solid ${field.isAvailable ? colors.surfaceBorder : 'rgba(255, 255, 255, 0.05)'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      opacity: field.isAvailable ? 1 : 0.7,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 11, color: colors.textMuted }}>{field.label}</div>
                      <div style={{
                        fontSize: 13,
                        fontWeight: field.isAvailable ? 800 : 500,
                        color: field.isAvailable ? colors.text : colors.textMuted,
                        marginTop: 3,
                        fontStyle: field.isAvailable ? 'normal' : 'italic',
                        wordBreak: 'break-all',
                      }}>
                        {field.isAvailable ? field.value : 'Not available in vault'}
                      </div>
                      <div style={{
                        fontSize: 10,
                        color: field.isAvailable ? colors.accentLight : colors.textMuted,
                        marginTop: 3,
                      }}>
                        Source: {field.source}
                      </div>
                    </div>
                    <button
                      onClick={() => field.isAvailable && copyToClipboard(field.value, field.label)}
                      disabled={!field.isAvailable}
                      style={{
                        marginTop: 8,
                        padding: '6px 10px',
                        borderRadius: 8,
                        backgroundColor: !field.isAvailable 
                          ? 'rgba(255,255,255,0.03)' 
                          : copiedField === field.label 
                            ? 'rgba(16, 185, 129, 0.2)' 
                            : 'rgba(255,255,255,0.06)',
                        border: 'none',
                        color: !field.isAvailable 
                          ? colors.textMuted 
                          : copiedField === field.label 
                            ? colors.success 
                            : colors.text,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: field.isAvailable ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                      }}
                    >
                      {copiedField === field.label ? <Check size={12} /> : <Copy size={12} />}
                      <span>
                        {!field.isAvailable 
                          ? 'No Data' 
                          : copiedField === field.label 
                            ? 'Copied' 
                            : 'Copy Value'}
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
