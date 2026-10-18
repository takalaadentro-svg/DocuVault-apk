import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Plus, Filter, FileText, ArrowUpDown, 
  ShieldAlert, Calendar, Eye, Download, QrCode, X,
  Mic, MicOff, Lock, Users, Dna, Sparkles, CheckCircle2
} from 'lucide-react';
import { DocumentItem } from '../types';
import { useTheme } from '../context/ThemeContext';

interface VaultScreenProps {
  documents: DocumentItem[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  onOpenUpload: () => void;
  onOpenDocument: (doc: DocumentItem) => void;
  onOpenQRShare: (doc: DocumentItem) => void;
  onOpenAssistant?: () => void;
}

const CATEGORIES = [
  'All',
  'Identity',
  'Education',
  'Medical',
  'Finance',
  'Travel',
  'Employment',
  'Property',
  'Other'
];

export const VaultScreen: React.FC<VaultScreenProps> = ({
  documents,
  selectedCategory,
  onSelectCategory,
  onOpenUpload,
  onOpenDocument,
  onOpenQRShare,
  onOpenAssistant,
}) => {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'expiry' | 'title'>('newest');
  const [lockerTab, setLockerTab] = useState<'all' | 'personal' | 'family'>('all');
  const [isListening, setIsListening] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition for Voice Search
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceNotice('Listening to your voice command... Speak document name');
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0])
          .map((result: any) => result.transcript)
          .join('');
        setSearchQuery(transcript);
        setVoiceNotice(`Searching for: "${transcript}"`);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        setVoiceNotice('Voice recognition paused. Try typing or speaking again.');
        setTimeout(() => setVoiceNotice(null), 3000);
      };

      recognition.onend = () => {
        setIsListening(false);
        setTimeout(() => setVoiceNotice(null), 2500);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceSearch = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      setVoiceNotice(null);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch {
          // If already started or blocked, fallback
          setIsListening(false);
        }
      } else {
        // Fallback simulated voice search options for browsers without Web Speech API
        const sampleVoiceQueries = ['Passport', 'Aadhaar', 'Health Insurance', 'Sale Deed', 'Degree'];
        const randomQuery = sampleVoiceQueries[Math.floor(Math.random() * sampleVoiceQueries.length)];
        setVoiceNotice(`Simulated Voice Input: "${randomQuery}"`);
        setSearchQuery(randomQuery);
        setTimeout(() => setVoiceNotice(null), 3000);
      }
    }
  };

  // Filter & Search
  const filteredDocs = documents.filter(doc => {
    // Locker Mode match
    if (lockerTab === 'personal' && doc.is_family_vault) return false;
    if (lockerTab === 'family' && !doc.is_family_vault) return false;

    // Category match
    if (selectedCategory !== 'All' && (doc.category || '').toLowerCase() !== selectedCategory.toLowerCase()) {
      return false;
    }
    // Search query match (searches title, issuer, notes, OCR text, holder, doc number, and subtype!)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (doc.title || '').toLowerCase().includes(q);
      const matchIssuer = doc.issuer?.toLowerCase().includes(q);
      const matchNotes = doc.notes?.toLowerCase().includes(q);
      const matchCategory = (doc.category || '').toLowerCase().includes(q);
      const matchOcr = doc.ocr_text?.toLowerCase().includes(q);
      const matchHolder = doc.holder_name?.toLowerCase().includes(q);
      const matchDocNum = doc.doc_number?.toLowerCase().includes(q);
      const matchSubtype = doc.subtype?.toLowerCase().includes(q);
      if (!matchTitle && !matchIssuer && !matchNotes && !matchCategory && !matchOcr && !matchHolder && !matchDocNum && !matchSubtype) {
        return false;
      }
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }
    if (sortBy === 'expiry') {
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
    }
    return 0;
  });

  const personalDocsCount = documents.filter(d => !d.is_family_vault).length;
  const familyDocsCount = documents.filter(d => d.is_family_vault).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 24 }}>
      {/* Top Header bar with Upload button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: colors.text }}>Document Locker</h1>
          <p style={{ fontSize: 12, color: colors.textMuted }}>
            {documents.length} secure artifacts ({personalDocsCount} Personal • {familyDocsCount} Family)
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {onOpenAssistant && (
            <button
              onClick={onOpenAssistant}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 14px',
                borderRadius: 12,
                backgroundColor: 'rgba(13, 148, 136, 0.15)',
                color: colors.accentLight,
                border: `1px solid ${colors.accentLight}`,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Sparkles size={16} />
              <span>AI Assistant</span>
            </button>
          )}
          <button
            onClick={onOpenUpload}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 16px',
              borderRadius: 12,
              backgroundColor: colors.accent,
              color: '#FFF',
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(13, 148, 136, 0.35)',
            }}
          >
            <Plus size={16} />
            <span>Upload</span>
          </button>
        </div>
      </div>

      {/* Personal vs Family Locker Segmented Control */}
      <div style={{
        display: 'flex',
        padding: 4,
        borderRadius: 12,
        backgroundColor: colors.surfaceCard,
        border: `1px solid ${colors.surfaceBorder}`,
        gap: 4
      }}>
        <button
          onClick={() => setLockerTab('all')}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 8,
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: lockerTab === 'all' ? colors.accent : 'transparent',
            color: lockerTab === 'all' ? '#FFF' : colors.textMuted,
            transition: 'all 0.15s ease'
          }}
        >
          <span>All Vaults</span>
          <span style={{ fontSize: 10, opacity: 0.85, padding: '1px 6px', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)' }}>
            {documents.length}
          </span>
        </button>

        <button
          onClick={() => setLockerTab('personal')}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 8,
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: lockerTab === 'personal' ? colors.accent : 'transparent',
            color: lockerTab === 'personal' ? '#FFF' : colors.textMuted,
            transition: 'all 0.15s ease'
          }}
        >
          <Lock size={13} />
          <span>Personal Locker</span>
          <span style={{ fontSize: 10, opacity: 0.85, padding: '1px 6px', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)' }}>
            {personalDocsCount}
          </span>
        </button>

        <button
          onClick={() => setLockerTab('family')}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 8,
            border: 'none',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: lockerTab === 'family' ? '#3B82F6' : 'transparent',
            color: lockerTab === 'family' ? '#FFF' : colors.textMuted,
            transition: 'all 0.15s ease'
          }}
        >
          <Users size={13} />
          <span>Family Locker</span>
          <span style={{ fontSize: 10, opacity: 0.85, padding: '1px 6px', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)' }}>
            {familyDocsCount}
          </span>
        </button>
      </div>

      {/* Search Input with Voice Search Mic */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 12px',
          borderRadius: 12,
          backgroundColor: colors.surfaceCard,
          border: `1px solid ${isListening ? colors.accent : colors.surfaceBorder}`,
          boxShadow: isListening ? '0 0 12px rgba(13, 148, 136, 0.4)' : 'none',
          transition: 'all 0.2s ease',
        }}>
          <Search size={18} color={colors.textMuted} />
          <input
            type="text"
            placeholder={isListening ? "Listening... say document name" : "Search title, OCR text, issuer..."}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              color: colors.text,
              fontSize: 14,
              outline: 'none',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', padding: 2 }}
            >
              <X size={16} />
            </button>
          )}

          {/* Voice Search Button */}
          <button
            onClick={toggleVoiceSearch}
            title={isListening ? "Stop Voice Search" : "Voice-Based Document Search"}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: 'none',
              backgroundColor: isListening ? '#EF4444' : colors.surface,
              color: isListening ? '#FFFFFF' : colors.accentLight,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              animation: isListening ? 'pulse 1.2s infinite' : 'none'
            }}
          >
            {isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        </div>

        {voiceNotice && (
          <div style={{
            fontSize: 11,
            color: colors.accentLight,
            padding: '4px 10px',
            backgroundColor: 'rgba(13, 148, 136, 0.1)',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 6
          }}>
            <Sparkles size={12} />
            <span>{voiceNotice}</span>
          </div>
        )}
      </div>

      {/* Category Pills Slider (Supports All-Type Storage) */}
      <div style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 4,
        scrollbarWidth: 'none',
      }}>
        {CATEGORIES.map(cat => {
          const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
          return (
            <button
              key={cat}
              onClick={() => onSelectCategory(cat)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: isSelected ? 700 : 500,
                backgroundColor: isSelected ? colors.accent : colors.surfaceCard,
                color: isSelected ? '#FFFFFF' : colors.textMuted,
                border: `1px solid ${isSelected ? colors.accent : colors.surfaceBorder}`,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
              }}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Sort options strip */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ color: colors.textMuted }}>
          Showing {filteredDocs.length} of {documents.length} documents
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowUpDown size={14} color={colors.textMuted} />
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            style={{
              background: 'none',
              border: 'none',
              color: colors.text,
              fontSize: 12,
              fontWeight: 600,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            <option value="newest">Sort: Newest Uploaded</option>
            <option value="expiry">Sort: Expiry Date Soonest</option>
            <option value="title">Sort: Title (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Documents List */}
      {filteredDocs.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filteredDocs.map(doc => {
            // Expiry status badge
            let expiryBadge = null;
            if (doc.is_expired) {
              expiryBadge = (
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 6,
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: colors.danger,
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  EXPIRED
                </span>
              );
            } else if (doc.days_until_expiry !== null && doc.days_until_expiry !== undefined && doc.days_until_expiry <= 30) {
              expiryBadge = (
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 6,
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  color: colors.warning,
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  Expires in {doc.days_until_expiry}d
                </span>
              );
            }

            return (
              <div
                key={doc.id}
                onClick={() => onOpenDocument(doc)}
                style={{
                  padding: 16,
                  borderRadius: 14,
                  backgroundColor: colors.surfaceCard,
                  border: `1px solid ${colors.surfaceBorder}`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: doc.is_family_vault ? 'rgba(59, 130, 246, 0.15)' : 'rgba(13, 148, 136, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: doc.is_family_vault ? '#60A5FA' : colors.accentLight,
                    flexShrink: 0,
                  }}>
                    {doc.is_family_vault ? <Users size={22} /> : <FileText size={22} />}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: colors.text,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {doc.title}
                    </div>
                    <div style={{ fontSize: 12, color: colors.textMuted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span>{doc.category}</span>
                      <span>•</span>
                      <span>{doc.issuer || 'Personal Record'}</span>
                    </div>

                    {/* Metadata tags strip: DNA badge, Locker type, OCR badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '1px 6px',
                        borderRadius: 4,
                        fontSize: 10,
                        fontWeight: 700,
                        backgroundColor: doc.is_family_vault ? 'rgba(59, 130, 246, 0.12)' : 'rgba(13, 148, 136, 0.12)',
                        color: doc.is_family_vault ? '#3B82F6' : colors.accentLight,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3
                      }}>
                        {doc.is_family_vault ? <Users size={10} /> : <Lock size={10} />}
                        {doc.is_family_vault ? 'Family Locker' : 'Personal'}
                      </span>

                      {doc.sha256_hash && (
                        <span style={{
                          padding: '1px 6px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                          backgroundColor: 'rgba(16, 185, 129, 0.12)',
                          color: '#10B981',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3
                        }}>
                          <Dna size={10} />
                          <span>DNA {doc.sha256_hash.slice(0, 6)}</span>
                        </span>
                      )}

                      {doc.is_offline_available && (
                        <span style={{
                          padding: '1px 5px',
                          borderRadius: 4,
                          fontSize: 9,
                          fontWeight: 700,
                          backgroundColor: 'rgba(16, 185, 129, 0.15)',
                          color: '#10B981',
                        }}>
                          Offline
                        </span>
                      )}

                      {doc.holder_name && (
                        <span style={{
                          padding: '1px 5px',
                          borderRadius: 4,
                          fontSize: 9,
                          fontWeight: 600,
                          backgroundColor: 'rgba(255, 255, 255, 0.06)',
                          color: colors.textMuted,
                        }}>
                          {doc.holder_name}
                        </span>
                      )}

                      {doc.ocr_text && (
                        <span style={{
                          padding: '1px 5px',
                          borderRadius: 4,
                          fontSize: 9,
                          fontWeight: 700,
                          backgroundColor: 'rgba(139, 92, 246, 0.12)',
                          color: '#8B5CF6'
                        }}>
                          OCR
                        </span>
                      )}

                      {doc.expiry_date && (
                        <span style={{ fontSize: 10, color: colors.textMuted, display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Calendar size={10} />
                          <span>{doc.expiry_date}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {expiryBadge}
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenQRShare(doc);
                    }}
                    title="Generate QR Share Code"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      backgroundColor: colors.surface,
                      border: `1px solid ${colors.surfaceBorder}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: colors.accentLight,
                      cursor: 'pointer',
                    }}
                  >
                    <QrCode size={16} />
                  </button>
                </div>
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
          <FileText size={40} color={colors.accentLight} style={{ margin: '0 auto 12px', opacity: 0.8 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: colors.text }}>No documents found</div>
          <p style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, marginBottom: 16 }}>
            {searchQuery ? 'Try adjusting your search query or voice search terms' : 'Upload your first document to this locker'}
          </p>
          <button
            onClick={onOpenUpload}
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
            Upload Document Now
          </button>
        </div>
      )}
    </div>
  );
};
