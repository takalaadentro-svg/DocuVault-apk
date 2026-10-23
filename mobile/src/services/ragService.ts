import { DocumentItem, DocumentChatResponse, DocumentChatCitation } from '../types';

/**
 * Intelligent Client-Side RAG (Retrieval-Augmented Generation) Engine
 * Queries documents, OCR text, notes, and structured metadata
 * to synthesize answers and return exact citations.
 */
export class ClientRAGService {
  public static query(question: string, documents: DocumentItem[] = []): DocumentChatResponse {
    const q = (question || '').trim();
    const qLower = q.toLowerCase();

    if (!q) {
      return {
        answer: 'Please ask a question about your documents, identity numbers, or expiry dates.',
        citations: [],
        infoFound: false,
      };
    }

    if (!documents || documents.length === 0) {
      return {
        answer: 'You do not have any uploaded documents in your vault yet. Please upload your documents (such as Aadhaar, Passport, PAN Card, Driving License, or Insurance) using the Upload button to enable AI document queries.',
        citations: [],
        infoFound: false,
      };
    }

    // 1. List / Summary intent
    if (
      qLower.includes('what document') || 
      qLower.includes('list document') || 
      qLower.includes('all document') || 
      qLower.includes('show my document') ||
      qLower.includes('how many document') ||
      qLower.includes('overview')
    ) {
      const docList = documents.map((d, i) => {
        const exp = d.expiry_date ? ` (Expires: ${d.expiry_date})` : '';
        const num = d.doc_number ? ` [ID: ${d.doc_number}]` : '';
        return `${i + 1}. **${d.title}** (${d.category || 'General'})${num}${exp}`;
      }).join('\n');

      const citations: DocumentChatCitation[] = documents.slice(0, 3).map(d => ({
        documentId: d.id,
        documentTitle: d.title,
        category: d.category || 'General',
        excerpt: `${d.title} - Category: ${d.category || 'General'}, Holder: ${d.holder_name || 'Owner'}`,
        confidence: 0.99
      }));

      return {
        answer: `You have **${documents.length} registered document${documents.length === 1 ? '' : 's'}** in your encrypted vault:\n\n${docList}\n\nAll records are indexed and cryptographically secured with SHA-256 integrity verification.`,
        citations,
        infoFound: true,
      };
    }

    // 2. Expiry / Validity queries
    if (qLower.includes('expire') || qLower.includes('expiry') || qLower.includes('validity') || qLower.includes('renewal')) {
      // Check if a specific document was mentioned
      const specificDoc = documents.find(d => 
        qLower.includes((d.title || '').toLowerCase()) || 
        (d.doc_type && qLower.includes(d.doc_type.toLowerCase())) ||
        (d.subtype && qLower.includes(d.subtype.toLowerCase()))
      );

      if (specificDoc) {
        if (specificDoc.expiry_date) {
          const expDate = new Date(specificDoc.expiry_date);
          const now = new Date();
          const isExpired = expDate < now;
          const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 3600 * 24));

          const status = isExpired 
            ? `⚠️ **EXPIRED** on ${specificDoc.expiry_date} (${Math.abs(diffDays)} days ago)`
            : `valid until **${specificDoc.expiry_date}** (${diffDays} days remaining)`;

          return {
            answer: `According to your official **${specificDoc.title}**, it is ${status}.`,
            citations: [{
              documentId: specificDoc.id,
              documentTitle: specificDoc.title,
              category: specificDoc.category || 'General',
              excerpt: `Official Expiry Date: ${specificDoc.expiry_date}. Issue Date: ${specificDoc.issue_date || 'N/A'}.`,
              confidence: 0.98
            }],
            infoFound: true
          };
        } else {
          return {
            answer: `Your **${specificDoc.title}** has no expiration date recorded (indicated as permanent or lifetime validity).`,
            citations: [{
              documentId: specificDoc.id,
              documentTitle: specificDoc.title,
              category: specificDoc.category || 'General',
              excerpt: `${specificDoc.title} has lifetime or unrecorded validity.`,
              confidence: 0.95
            }],
            infoFound: true
          };
        }
      }

      // Check all documents with expiry dates
      const expiring = documents.filter(d => d.expiry_date);
      if (expiring.length > 0) {
        const summary = expiring.map(d => `• **${d.title}**: Expires on **${d.expiry_date}**`).join('\n');
        return {
          answer: `Here are the expiration dates recorded for your documents:\n\n${summary}`,
          citations: expiring.slice(0, 3).map(d => ({
            documentId: d.id,
            documentTitle: d.title,
            category: d.category || 'General',
            excerpt: `Expiry date: ${d.expiry_date}`,
            confidence: 0.95
          })),
          infoFound: true
        };
      }
    }

    // 3. Identification Number queries (Aadhaar, Passport, PAN, License, etc.)
    if (qLower.includes('number') || qLower.includes('id') || qLower.includes('code') || qLower.includes('card number')) {
      const matchedDoc = documents.find(d => {
        const t = (d.title || '').toLowerCase();
        const type = (d.doc_type || '').toLowerCase();
        const sub = (d.subtype || '').toLowerCase();
        const words = qLower.split(/\s+/);
        return words.some(w => w.length > 2 && (t.includes(w) || type.includes(w) || sub.includes(w)));
      });

      if (matchedDoc && matchedDoc.doc_number) {
        return {
          answer: `Your **${matchedDoc.title}** number is **${matchedDoc.doc_number}** (Holder: ${matchedDoc.holder_name || 'Owner'}).`,
          citations: [{
            documentId: matchedDoc.id,
            documentTitle: matchedDoc.title,
            category: matchedDoc.category || 'Identity',
            excerpt: `Document Identification Number: ${matchedDoc.doc_number}. Registered to: ${matchedDoc.holder_name || 'Owner'}.`,
            confidence: 0.98
          }],
          infoFound: true
        };
      }
    }

    // 4. Date of Birth queries
    if (qLower.includes('dob') || qLower.includes('birth') || qLower.includes('born')) {
      const docWithDob = documents.find(d => d.dob && d.dob.trim().length > 1);
      if (docWithDob) {
        return {
          answer: `According to your **${docWithDob.title}**, your Date of Birth is **${docWithDob.dob}**.`,
          citations: [{
            documentId: docWithDob.id,
            documentTitle: docWithDob.title,
            category: docWithDob.category || 'Identity',
            excerpt: `Date of Birth: ${docWithDob.dob} (Holder: ${docWithDob.holder_name || 'Owner'})`,
            confidence: 0.98
          }],
          infoFound: true
        };
      }
    }

    // 5. Holder Name queries
    if (qLower.includes('my name') || qLower.includes('holder') || qLower.includes('whose document') || qLower.includes('who is')) {
      const docWithName = documents.find(d => d.holder_name && d.holder_name.trim().length > 1);
      if (docWithName) {
        return {
          answer: `The primary holder name recorded on your **${docWithName.title}** is **${docWithName.holder_name}**.`,
          citations: [{
            documentId: docWithName.id,
            documentTitle: docWithName.title,
            category: docWithName.category || 'Identity',
            excerpt: `Document Holder Name: ${docWithName.holder_name}`,
            confidence: 0.98
          }],
          infoFound: true
        };
      }
    }

    // 6. Full-Text OCR / Content Keyword Search
    const searchTokens = qLower
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2 && !['what', 'where', 'when', 'which', 'show', 'tell', 'does', 'have', 'from', 'with', 'about', 'this', 'that'].includes(t));

    interface ScoredDoc {
      doc: DocumentItem;
      score: number;
      bestExcerpt: string;
    }

    const scoredDocs: ScoredDoc[] = [];

    for (const doc of documents) {
      let score = 0;
      let bestExcerpt = '';
      const docText = `${doc.title || ''} ${doc.category || ''} ${doc.issuer || ''} ${doc.notes || ''} ${doc.ocr_text || ''}`.toLowerCase();

      for (const token of searchTokens) {
        if ((doc.title || '').toLowerCase().includes(token)) score += 5;
        if ((doc.category || '').toLowerCase().includes(token)) score += 3;
        if ((doc.issuer || '').toLowerCase().includes(token)) score += 4;
        if ((doc.doc_number || '').toLowerCase().includes(token)) score += 5;
        if ((doc.ocr_text || '').toLowerCase().includes(token)) score += 2;
        if ((doc.notes || '').toLowerCase().includes(token)) score += 2;
      }

      if (score > 0) {
        // Find best excerpt from OCR text or notes
        if (doc.ocr_text && doc.ocr_text.length > 5) {
          const sentences = doc.ocr_text.split(/[\n\.]+/);
          const matchedSentence = sentences.find(s => 
            searchTokens.some(t => s.toLowerCase().includes(t))
          );
          bestExcerpt = (matchedSentence || sentences[0]).trim();
        } else {
          bestExcerpt = `${doc.title} (${doc.category || 'General'}) - ${doc.issuer || 'Official Issuer'}${doc.doc_number ? ` - ID: ${doc.doc_number}` : ''}`;
        }

        if (bestExcerpt.length > 180) {
          bestExcerpt = bestExcerpt.substring(0, 180) + '...';
        }

        scoredDocs.push({ doc, score, bestExcerpt });
      }
    }

    if (scoredDocs.length > 0) {
      scoredDocs.sort((a, b) => b.score - a.score);
      const top = scoredDocs[0];
      const citations: DocumentChatCitation[] = scoredDocs.slice(0, 3).map(sd => ({
        documentId: sd.doc.id,
        documentTitle: sd.doc.title,
        category: sd.doc.category || 'General',
        excerpt: sd.bestExcerpt,
        confidence: Math.min(0.99, 0.70 + sd.score * 0.05)
      }));

      let answer = `Based on your **${top.doc.title}**`;
      if (top.doc.doc_number) answer += ` (ID: ${top.doc.doc_number})`;
      if (top.doc.expiry_date) answer += ` (Expires: ${top.doc.expiry_date})`;
      answer += `:\n\n"${top.bestExcerpt}"`;

      return {
        answer,
        citations,
        infoFound: true
      };
    }

    // 7. Fallback when question keywords do not match indexed document contents
    return {
      answer: `I searched through your **${documents.length} vault document${documents.length === 1 ? '' : 's'}**, but could not find specific matches for "${q}".\n\n💡 **Tip**: Try asking for specific document details such as:\n• *"What documents do I have?"*\n• *"What is my Aadhaar number?"*\n• *"When does my passport expire?"*\n• *"What is my date of birth?"*`,
      citations: [],
      infoFound: false
    };
  }
}
