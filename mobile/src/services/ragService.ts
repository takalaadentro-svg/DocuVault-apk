import { DocumentItem, DocumentChatResponse, DocumentChatCitation } from '../types';

/**
 * Strips raw PDF byte code, object syntax, stream contents, and unreadable binary metadata
 * to ensure only clean, human-readable text is processed and presented to the user.
 */
export function cleanDocumentText(rawText?: string | null): string {
  if (!rawText) return '';

  let text = rawText;

  // 1. Remove PDF object references and dictionary syntax
  text = text.replace(/<<[\s\S]*?>>/g, ' '); // remove << ... >> dictionaries
  text = text.replace(/\b\d+\s+\d+\s+obj\b/gi, ' '); // remove "2 0 obj", "13 0 R"
  text = text.replace(/\bendobj\b/gi, ' ');
  text = text.replace(/\bstream[\s\S]*?endstream\b/gi, ' '); // remove stream...endstream
  text = text.replace(/\b(xref|trailer|startxref)\b[\s\S]*$/gi, ' '); // remove trailer / xref

  // 2. Remove common PDF internal dictionary keys, dates, annotations
  text = text.replace(/\/ModDate\s*\([^)]*\)/gi, ' ');
  text = text.replace(/\/CreationDate\s*\([^)]*\)/gi, ' ');
  text = text.replace(/\/Producer\s*\([^)]*\)/gi, ' ');
  text = text.replace(/\/Creator\s*\([^)]*\)/gi, ' ');
  text = text.replace(/\/Title\s*\(([^)]*)\)/gi, '$1 '); // preserve actual text inside /Title(XYZ)
  text = text.replace(/\/Author\s*\(([^)]*)\)/gi, '$1 ');
  text = text.replace(/\/Subject\s*\(([^)]*)\)/gi, '$1 ');
  text = text.replace(/\/Annots\s*\[[^\]]*\]/gi, ' ');
  text = text.replace(/\/Contents\s*\[?[^\]/]*\]?/gi, ' ');
  text = text.replace(/\/Font\s*<<[^>]*>>/gi, ' ');
  text = text.replace(/\/MediaBox\s*\[[^\]]*\]/gi, ' ');
  text = text.replace(/\/Resources\s*<<[^>]*>>/gi, ' ');
  text = text.replace(/\/Filter\s*\/[a-zA-Z0-9]+/gi, ' ');
  text = text.replace(/\/Length\s+\d+/gi, ' ');
  text = text.replace(/\/Type\s*\/[a-zA-Z0-9]+/gi, ' ');

  // 3. Remove indirect object references like "13 0 R" or "14 0 R"
  text = text.replace(/\b\d+\s+\d+\s+R\b/g, ' ');

  // 4. Remove internal PDF date strings like "D:20260710054856+00'00'"
  text = text.replace(/D:\d{14}[+-]\d{2}'\d{2}'/g, ' ');

  // 5. Remove lingering slashed keywords: /Keywords, /Catalog, /Pages, /Parent, etc.
  text = text.replace(/\/[A-Za-z0-9_]+/g, ' ');

  // 6. Clean escaped parentheses in PDF strings: \( \) -> ()
  text = text.replace(/\\([()])/g, '$1');

  // 7. Remove non-printable control characters
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ');

  // 8. Collapse whitespace
  text = text.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();

  if (isGarbageText(text)) {
    return '';
  }

  return text;
}

export function isGarbageText(str?: string | null): boolean {
  if (!str || str.length < 3) return true;
  // If string contains obvious PDF syntax markers
  if (
    str.includes('endobj') ||
    str.includes('/ModDate') ||
    str.includes('<<') ||
    str.includes('>>') ||
    str.includes('/Annots') ||
    str.includes('/Producer')
  ) {
    return true;
  }
  const letters = str.replace(/[^a-zA-Z]/g, '').length;
  if (letters < 3 && str.length > 8) return true;
  return false;
}

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
        answer: 'You do not have any uploaded documents in your vault yet. Please upload your documents (such as Aadhaar, Passport, PAN Card, College Certificate, or Insurance) using the Upload button to enable AI document queries.',
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
        excerpt: `${d.title} - Category: ${d.category || 'General'}${d.issuer ? ` • Issued by ${d.issuer}` : ''}`,
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
      .filter(t => t.length > 2 && !['what', 'where', 'when', 'which', 'show', 'tell', 'does', 'have', 'from', 'with', 'about', 'this', 'that', 'college', 'engineering', 'school', 'university'].includes(t));

    // Fallback search tokens if all were filtered
    const effectiveTokens = searchTokens.length > 0 
      ? searchTokens 
      : qLower.split(/\s+/).filter(t => t.length > 2);

    interface ScoredDoc {
      doc: DocumentItem;
      score: number;
      bestExcerpt: string;
    }

    const scoredDocs: ScoredDoc[] = [];

    for (const doc of documents) {
      let score = 0;
      let bestExcerpt = '';
      const cleanOcr = cleanDocumentText(doc.ocr_text);
      const cleanNotes = cleanDocumentText(doc.notes);
      const docText = `${doc.title || ''} ${doc.category || ''} ${doc.issuer || ''} ${doc.subtype || ''} ${cleanNotes} ${cleanOcr}`.toLowerCase();

      for (const token of effectiveTokens) {
        if ((doc.title || '').toLowerCase().includes(token)) score += 8;
        if ((doc.category || '').toLowerCase().includes(token)) score += 4;
        if ((doc.issuer || '').toLowerCase().includes(token)) score += 5;
        if ((doc.subtype || '').toLowerCase().includes(token)) score += 5;
        if ((doc.doc_number || '').toLowerCase().includes(token)) score += 6;
        if (cleanOcr.toLowerCase().includes(token)) score += 3;
        if (cleanNotes.toLowerCase().includes(token)) score += 3;
      }

      if (score > 0) {
        // Find best excerpt from clean OCR text or notes
        if (cleanOcr && cleanOcr.length > 8) {
          const sentences = cleanOcr.split(/[\n\.]+/);
          const matchedSentence = sentences.find(s => {
            const sClean = s.trim();
            return !isGarbageText(sClean) && effectiveTokens.some(t => sClean.toLowerCase().includes(t));
          });
          const candidate = (matchedSentence || sentences[0] || '').trim();
          bestExcerpt = !isGarbageText(candidate) ? candidate : '';
        }

        // If no clean sentence from OCR, construct informative summary excerpt
        if (!bestExcerpt || isGarbageText(bestExcerpt)) {
          bestExcerpt = `${doc.title} (${doc.category || 'General'})${doc.issuer ? ` - Issued by ${doc.issuer}` : ''}${doc.doc_number ? ` - ID: ${doc.doc_number}` : ''}`;
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
      const doc = top.doc;

      // Clean citation excerpts
      const citations: DocumentChatCitation[] = scoredDocs.slice(0, 3).map(sd => {
        let cleanEx = cleanDocumentText(sd.bestExcerpt);
        if (!cleanEx || isGarbageText(cleanEx)) {
          cleanEx = `${sd.doc.title} (${sd.doc.category || 'General'}) - Verified Vault Record`;
        }
        if (cleanEx.length > 180) {
          cleanEx = cleanEx.substring(0, 180) + '...';
        }
        return {
          documentId: sd.doc.id,
          documentTitle: sd.doc.title,
          category: sd.doc.category || 'General',
          excerpt: cleanEx,
          confidence: Math.min(0.99, 0.70 + sd.score * 0.05)
        };
      });

      // Construct an intelligent, human-friendly synthesized answer
      let answer = `I found your verified document **${doc.title}** in your vault.`;

      const details: string[] = [];
      if (doc.category) details.push(`• **Category**: ${doc.category}`);
      if (doc.subtype && doc.subtype !== doc.title) details.push(`• **Document Type**: ${doc.subtype}`);
      if (doc.issuer) details.push(`• **Issuing Authority**: ${doc.issuer}`);
      if (doc.holder_name) details.push(`• **Registered Holder**: ${doc.holder_name}`);
      if (doc.doc_number) details.push(`• **Document / Roll Number**: ${doc.doc_number}`);
      if (doc.dob) details.push(`• **Date of Birth**: ${doc.dob}`);
      if (doc.issue_date) details.push(`• **Issue Date**: ${doc.issue_date}`);
      if (doc.expiry_date) details.push(`• **Expiry Date**: ${doc.expiry_date}`);

      if (details.length > 0) {
        answer += `\n\n**Document Details**:\n${details.join('\n')}`;
      }

      // Check if we have an authentic clean OCR snippet that is not generic template header
      const cleanExcerpt = cleanDocumentText(top.bestExcerpt);
      const isHeaderOnly = cleanExcerpt.toLowerCase().includes('official vault document record') ||
                           cleanExcerpt.toLowerCase().includes('cryptographic sha-256') ||
                           cleanExcerpt.toLowerCase().includes('security status:');

      if (cleanExcerpt && cleanExcerpt.length > 15 && !isHeaderOnly && !isGarbageText(cleanExcerpt) && cleanExcerpt !== doc.title) {
        answer += `\n\n**Relevant Extracted Information**:\n"${cleanExcerpt}"`;
      }

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
