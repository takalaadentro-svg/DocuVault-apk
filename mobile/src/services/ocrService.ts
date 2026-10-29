import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';
import Tesseract from 'tesseract.js';
import { OCRExtractResult } from '../types';

// Ensure PDF.js worker is registered
if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
}

const VALID_SHORT_WORDS = new Set([
  'a', 'i', 'am', 'an', 'as', 'at', 'be', 'by', 'do', 'go', 'he', 'hi', 'if',
  'in', 'is', 'it', 'me', 'my', 'no', 'of', 'on', 'or', 'so', 'to', 'up', 'us',
  'we', 'mr', 'ms', 'dr', 'st', 'rd', 'nd', 'th', 'id', 'dl', 'dt', 'yr', 'ug',
  'pg', 'ba', 'bs', 'be', 'me', 'ma', 'ms', 'cs', 'it', 'ec', 'ee', 'cv', 'hr',
  'uk', 'un', 'eu', 'po', 'ps', 'rs', 'nr', 'sr', 'jr', 'co', 'ltd', 'inc'
]);

const KNOWN_ACRONYMS = new Set([
  'UIDAI', 'MORTH', 'INDIA', 'GOVT', 'HTTPS', 'HTTP', 'NTPC', 'AICTE', 'NCERT',
  'CBSE', 'ICSE', 'VTU', 'RGPV', 'JNTU', 'ANNA', 'MBBS', 'BTECH', 'MTECH', 'CGPA',
  'SGPA', 'USN', 'PRN', 'DOB', 'PAN', 'PIN', 'OTP', 'IFSC', 'MICR', 'NEFT', 'RTGS',
  'IMPS', 'HSBC', 'HDFC', 'ICICI', 'SBIN', 'AXIS', 'KOTAK', 'IRDAI', 'LIC'
]);

/**
 * Multi-stage OCR text sanitizer that strips Tesseract symbol noise, QR/photo/watermark
 * gibberish tokens, raw PDF stream syntax, and fake fallback boilerplate.
 */
export function sanitizeOcrText(rawText?: string | null): string {
  if (!rawText) return '';

  let text = String(rawText);

  // 1. Strip raw PDF syntax & object streams if present
  text = text.replace(/<<[\s\S]*?>>/g, ' ');
  text = text.replace(/\b\d+\s+\d+\s+obj\b/gi, ' ');
  text = text.replace(/\bendobj\b/gi, ' ');
  text = text.replace(/\bstream[\s\S]*?endstream\b/gi, ' ');
  text = text.replace(/\b(xref|trailer|startxref)\b[\s\S]*$/gi, ' ');
  text = text.replace(/\/(ModDate|CreationDate|Producer|Creator|Font|MediaBox|Resources|Filter|Length|Type|Pages|Parent|Catalog)\b[^\n]*/gi, ' ');
  text = text.replace(/\b\d+\s+\d+\s+R\b/g, ' ');
  text = text.replace(/D:\d{14}[+-]\d{2}'\d{2}'/g, ' ');

  // 2. Normalize characters and strip non-printable / OCR symbol noise
  text = text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
    .replace(/[~^|«»§¤¢£¥©®™±÷×¬¦¨´¸ºª°•·—–_+=<>[\]{}\\]+/g, ' ')
    .replace(/[`"''""]+/g, '')
    .replace(/([.,:;!?/-])\1{1,}/g, '$1');

  const rawLines = text.split(/\r?\n/);
  const cleanLines: string[] = [];

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Skip synthetic fallback boilerplate lines
    const lowerLine = trimmed.toLowerCase();
    if (
      lowerLine.includes('official vault document record') ||
      lowerLine.includes('storage encryption: aes-256') ||
      lowerLine.includes('digital audit timestamp:') ||
      lowerLine.includes('verified encrypted vault asset') ||
      lowerLine.includes('endobj') ||
      lowerLine.includes('/moddate')
    ) {
      continue;
    }

    const tokens = trimmed.split(/\s+/);
    const validTokens: string[] = [];

    for (const rawToken of tokens) {
      // Strip leading/trailing punctuation except parens/slashes inside dates/IDs
      const tok = rawToken.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9.)%]+$/g, '');
      if (!tok) continue;

      // Reject tokens with 4+ identical repeating characters (e.g. "eeee", "IIII", "11111" unless valid number)
      if (/([a-zA-Z])\1{2,}/i.test(tok)) continue;

      // Keep clean dates (e.g. 15/05/2003, 2026-10-29)
      if (/^\d{1,4}[/-]\d{1,2}[/-]\d{1,4}$/.test(tok)) {
        validTokens.push(tok);
        continue;
      }

      // Keep clean numbers or ID codes (e.g. 4CB23CS103, 1234, Z1234567, ABCDE1234F)
      if (/^[A-Z0-9]{2,18}$/i.test(tok) && /\d/.test(tok)) {
        // Ensure it's not random lower+upper+digit OCR noise like "a1B2c"
        const hasLower = /[a-z]/.test(tok);
        const hasUpper = /[A-Z]/.test(tok);
        if (hasLower && hasUpper && tok.length > 3) {
          continue;
        }
        validTokens.push(tok);
        continue;
      }

      // Purely alphabetic or punctuated word (e.g. "Name:", "Neha", "Government", "India.")
      const lettersOnly = tok.replace(/[^a-zA-Z]/g, '');
      const digitsOnly = tok.replace(/[^0-9]/g, '');
      const otherChars = tok.length - lettersOnly.length - digitsOnly.length;

      // Reject tokens with too many internal punctuation characters
      if (otherChars > 2 || (otherChars > 0 && lettersOnly.length < 2 && digitsOnly.length < 2)) {
        continue;
      }

      if (lettersOnly.length === 1 && digitsOnly.length === 0) {
        // Single letter: allow uppercase initial (e.g. "Neha N") or 'a'/'I'
        if (tok === 'A' || tok === 'I' || tok === 'a' || /^[A-Z]\.?$/.test(tok)) {
          validTokens.push(tok);
        }
        continue;
      }

      if (lettersOnly.length === 2 && digitsOnly.length === 0) {
        if (VALID_SHORT_WORDS.has(lettersOnly.toLowerCase()) || /^[A-Z]{2}$/.test(lettersOnly)) {
          validTokens.push(tok);
        }
        continue;
      }

      if (lettersOnly.length >= 3 && digitsOnly.length === 0) {
        const lowerWord = lettersOnly.toLowerCase();
        const upperWord = lettersOnly.toUpperCase();
        const hasVowel = /[aeiouy]/i.test(lowerWord);

        // Must contain at least one vowel unless it is a known acronym
        if (!hasVowel && !KNOWN_ACRONYMS.has(upperWord)) {
          continue;
        }

        // Reject words with 5+ consecutive consonants unless known acronym
        if (/[bcdfghjklmnpqrstvwxz]{5,}/i.test(lowerWord) && !KNOWN_ACRONYMS.has(upperWord)) {
          continue;
        }

        // Reject weird mixed-case inside a word (e.g. "rTeSt", "nEhA") produced by noisy OCR
        if (/^[a-z]+[A-Z][a-zA-Z]*$/.test(lettersOnly) || /[A-Z][a-z]+[A-Z]/.test(lettersOnly)) {
          continue;
        }

        validTokens.push(tok);
      }
    }

    if (validTokens.length === 0) continue;

    const candidateLine = validTokens.join(' ');
    const alnumCount = candidateLine.replace(/[^a-zA-Z0-9]/g, '').length;
    const nonSpaceCount = candidateLine.replace(/\s+/g, '').length;

    if (alnumCount < 3 || nonSpaceCount === 0) continue;
    if (alnumCount / nonSpaceCount < 0.72) continue;

    // Reject lines made up almost entirely of tiny 1-2 char fragments (classic QR code / border OCR noise)
    if (validTokens.length >= 3) {
      const tinyCount = validTokens.filter(t => t.replace(/[^a-zA-Z0-9]/g, '').length <= 2).length;
      if (tinyCount / validTokens.length > 0.65 && !/\b\d{4}\b/.test(candidateLine)) {
        continue;
      }
    }

    cleanLines.push(candidateLine);
  }

  return cleanLines.join('\n').trim();
}

/**
 * Client-Side Smart OCR & Document Analysis Engine for DocuVault
 * Performs local computer vision blur detection (Canvas Laplacian variance),
 * adaptive image contrast/grayscale preprocessing, cryptographic SHA-256 fingerprinting,
 * real text extraction via PDF.js & Tesseract.js with word-confidence filtering,
 * and rule-based entity parsing (Aadhaar, PAN, Passport, DL, USN/Roll No, Dates).
 */
export class ClientOCRService {
  /**
   * Computes SHA-256 digest of file bytes via Web Crypto API
   */
  public static async calculateSha256(file: File): Promise<string> {
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return 'sha256-' + Date.now();
    }
  }

  /**
   * Evaluates image sharpness using Canvas Laplacian gradient variance.
   * Returns blurScore and isBlurred flag (< 45 indicates blurry/unclear capture).
   */
  public static async assessImageBlur(file: File): Promise<{ isBlurred: boolean; blurScore: number }> {
    if (!file.type.startsWith('image/')) {
      return { isBlurred: false, blurScore: 150 };
    }

    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 200;
          const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
          canvas.width = Math.max(10, Math.floor(img.width * scale));
          canvas.height = Math.max(10, Math.floor(img.height * scale));

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ isBlurred: false, blurScore: 120 });
            return;
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = imgData.data;

          let totalVariance = 0;
          let count = 0;
          const w = canvas.width;
          const h = canvas.height;

          for (let y = 1; y < h - 1; y += 2) {
            for (let x = 1; x < w - 1; x += 2) {
              const idx = (y * w + x) * 4;
              const val = (d[idx] + d[idx + 1] + d[idx + 2]) / 3;
              const valRight = (d[idx + 4] + d[idx + 5] + d[idx + 6]) / 3;
              const valBottom = (d[idx + w * 4] + d[idx + w * 4 + 1] + d[idx + w * 4 + 2]) / 3;

              const diff = Math.abs(val - valRight) + Math.abs(val - valBottom);
              totalVariance += diff;
              count++;
            }
          }

          const avgEdgeGradient = count > 0 ? (totalVariance / count) * 8 : 100;
          const isBlurred = avgEdgeGradient < 45;
          resolve({ isBlurred, blurScore: Math.round(avgEdgeGradient) });
        } catch {
          resolve({ isBlurred: false, blurScore: 120 });
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ isBlurred: false, blurScore: 120 });
      };
      img.src = url;
    });
  }

  /**
   * Preprocesses an image on an offscreen canvas (grayscale + contrast normalization +
   * background whitening) so Tesseract reads crisp text and ignores background card patterns.
   */
  private static async preprocessImageCanvas(file: File): Promise<HTMLCanvasElement | File> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const MIN_DIM = 1200;
          const MAX_DIM = 2000;

          if (Math.max(width, height) < MIN_DIM) {
            const scale = MIN_DIM / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          } else if (Math.max(width, height) > MAX_DIM) {
            const scale = MAX_DIM / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(file);
            return;
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          const imgData = ctx.getImageData(0, 0, width, height);
          const data = imgData.data;

          // Compute luminance min/max for contrast stretching
          let minLum = 255;
          let maxLum = 0;
          for (let i = 0; i < data.length; i += 16) {
            const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            if (lum < minLum) minLum = lum;
            if (lum > maxLum) maxLum = lum;
          }

          const range = Math.max(1, maxLum - minLum);
          for (let i = 0; i < data.length; i += 4) {
            const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            let norm = ((lum - minLum) / range) * 255;
            // Suppress faint background patterns/watermarks (brighten > 185 to pure white, darken < 95)
            if (norm > 185) {
              norm = 255;
            } else if (norm < 95) {
              norm = Math.max(0, norm * 0.7);
            }
            const v = Math.round(Math.max(0, Math.min(255, norm)));
            data[i] = v;
            data[i + 1] = v;
            data[i + 2] = v;
          }

          ctx.putImageData(imgData, 0, 0);
          resolve(canvas);
        } catch {
          resolve(file);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });
  }

  /**
   * Filters Tesseract recognition output using word-level confidence scores
   * and multi-stage text sanitization to eliminate junk text.
   */
  private static extractHighConfidenceText(ocrData: any): { text: string; confidence: number } {
    if (!ocrData) return { text: '', confidence: 0.75 };

    const lines: any[] = Array.isArray(ocrData.lines) ? ocrData.lines : [];
    const keptLines: string[] = [];
    let confSum = 0;
    let confCount = 0;

    if (lines.length > 0) {
      for (const line of lines) {
        const words: any[] = Array.isArray(line.words) ? line.words : [];
        if (words.length > 0) {
          const goodWords: string[] = [];
          for (const w of words) {
            const wText = String(w.text || '').trim();
            const wConf = typeof w.confidence === 'number' ? w.confidence : 75;
            if (!wText) continue;

            // Keep high-confidence words (>= 55%) or clean structured IDs/dates (>= 42%)
            const isCleanIdOrDate =
              /^\d{1,4}[/-]\d{1,2}[/-]\d{1,4}$/.test(wText) ||
              /^[A-Z0-9]{4,16}$/.test(wText);

            if (wConf >= 55 || (isCleanIdOrDate && wConf >= 42)) {
              goodWords.push(wText);
              confSum += wConf;
              confCount++;
            }
          }
          if (goodWords.length > 0) {
            keptLines.push(goodWords.join(' '));
          }
        } else if (line.text && (typeof line.confidence !== 'number' || line.confidence >= 55)) {
          keptLines.push(String(line.text).trim());
        }
      }
    }

    const rawCandidate = keptLines.length > 0 ? keptLines.join('\n') : String(ocrData.text || '');
    const cleaned = sanitizeOcrText(rawCandidate);
    const avgConf = confCount > 0 ? (confSum / confCount) / 100 : ((ocrData.confidence || 82) / 100);

    return {
      text: cleaned,
      confidence: Math.max(0.65, Math.min(0.99, avgConf)),
    };
  }

  /**
   * Extracts real text from PDF files using pdfjs-dist.
   * If PDF is a scanned image with no embedded text, renders page 1 to canvas and runs Tesseract.
   */
  private static async extractTextFromPdf(file: File): Promise<{ text: string; confidence: number }> {
    try {
      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({
        data: buffer,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
      });

      const pdf = await loadingTask.promise;
      let fullText = '';
      const maxPages = Math.min(pdf.numPages, 5);

      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => item.str || '')
          .filter((s: string) => s.trim().length > 0)
          .join(' ');
        if (pageText) {
          fullText += pageText + '\n';
        }
      }

      const cleanedEmbedded = sanitizeOcrText(fullText);
      if (cleanedEmbedded.length >= 15) {
        return { text: cleanedEmbedded, confidence: 0.96 };
      }

      // If PDF text is empty or very short, it's likely a scanned image PDF.
      const firstPage = await pdf.getPage(1);
      const viewport = firstPage.getViewport({ scale: 1.8 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        await firstPage.render({ canvasContext: ctx, viewport }).promise;
        const ocrRes = await Tesseract.recognize(canvas, 'eng');
        const filtered = this.extractHighConfidenceText(ocrRes?.data);
        return {
          text: filtered.text || cleanedEmbedded,
          confidence: filtered.confidence,
        };
      }

      return { text: cleanedEmbedded, confidence: 0.85 };
    } catch (e) {
      console.warn('PDF text extraction note:', e);
      return { text: '', confidence: 0.75 };
    }
  }

  /**
   * Extracts real, clean text from an Image file using preprocessed canvas + Tesseract.js
   */
  private static async extractTextFromImage(file: File): Promise<{ text: string; confidence: number }> {
    try {
      const preprocessed = await this.preprocessImageCanvas(file);
      const res = await Tesseract.recognize(preprocessed, 'eng');
      return this.extractHighConfidenceText(res?.data);
    } catch (e) {
      console.warn('Tesseract OCR error:', e);
      return { text: '', confidence: 0.70 };
    }
  }

  /**
   * Normalize dates in DD/MM/YYYY or DD-MM-YYYY to YYYY-MM-DD
   */
  private static normalizeDate(rawDateStr: string): string | undefined {
    try {
      const parts = rawDateStr.replace(/[.]/g, '/').replace(/[-]/g, '/').split('/');
      if (parts.length === 3) {
        let day = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10);
        let year = parseInt(parts[2], 10);

        if (parts[0].length === 4) {
          year = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10);
          day = parseInt(parts[2], 10);
        }

        if (day > 0 && day <= 31 && month > 0 && month <= 12 && year > 1900 && year < 2100) {
          return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Comprehensive Document OCR & Entity Extraction using REAL sanitized text
   */
  public static async analyzeDocument(file: File, userFullName?: string): Promise<OCRExtractResult> {
    const rawName = file.name || 'Document';
    const cleanName = rawName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').trim();
    const lowerName = cleanName.toLowerCase();
    const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');
    const isImage = file.type.startsWith('image/');

    const [sha256, blurResult] = await Promise.all([
      this.calculateSha256(file),
      this.assessImageBlur(file),
    ]);

    let detectedText = '';
    let confidence = 0.88;

    if (isPdf) {
      const pdfRes = await this.extractTextFromPdf(file);
      detectedText = pdfRes.text;
      confidence = pdfRes.confidence;
    } else if (isImage) {
      const imgRes = await this.extractTextFromImage(file);
      detectedText = imgRes.text;
      confidence = imgRes.confidence;
    } else {
      try {
        detectedText = sanitizeOcrText(await file.text());
      } catch {
        detectedText = '';
      }
    }

    const combinedText = `${cleanName}\n${detectedText}`;
    const lowerCombined = combinedText.toLowerCase();

    let category = 'Other';
    let docType = 'General Document';
    let subtype = cleanName;
    let docNumber: string | undefined = undefined;
    let dob: string | undefined = undefined;
    let issueDate: string | undefined = undefined;
    let expiryDate: string | undefined = undefined;
    let holderName: string | undefined = userFullName || undefined;
    const matchedKeywords: string[] = [];

    // Check for University / College USN or Roll Number in filename or text (e.g. 4CB23CS103)
    const usnMatch = combinedText.match(/\b([1-9][A-Z]{2}\d{2}[A-Z]{2,3}\d{3})\b/i);
    if (usnMatch) {
      docNumber = usnMatch[1].toUpperCase();
    }

    // --- Aadhaar Card Detection ---
    if (
      lowerCombined.includes('unique identification') ||
      lowerCombined.includes('uidai') ||
      lowerCombined.includes('aadhaar') ||
      lowerCombined.includes('adhar') ||
      /\b\d{4}\s\d{4}\s\d{4}\b/.test(detectedText)
    ) {
      category = 'Identity';
      docType = 'Government ID';
      subtype = 'Aadhaar Card';
      matchedKeywords.push('Aadhaar', 'UIDAI');

      const aadhaarMatch = detectedText.match(/\b([2-9]\d{3}\s?\d{4}\s?\d{4})\b/);
      if (aadhaarMatch) {
        const digits = aadhaarMatch[1].replace(/\s+/g, '');
        docNumber = `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`;
      }

      const dobMatch = detectedText.match(/(?:DOB|Date of Birth|Birth|D\.O\.B)[\s:]*([0-3]?[0-9][/-][0-1]?[0-9][/-][12][09]\d{2})/i);
      if (dobMatch) {
        dob = this.normalizeDate(dobMatch[1]);
      }
    }
    // --- PAN Card Detection ---
    else if (
      lowerCombined.includes('income tax department') ||
      lowerCombined.includes('permanent account number') ||
      lowerCombined.includes('pan card') ||
      (lowerCombined.includes('govt. of india') && lowerCombined.includes('tax')) ||
      /\b[a-z]{5}[0-9]{4}[a-z]\b/i.test(detectedText)
    ) {
      category = 'Finance';
      docType = 'Tax Document';
      subtype = 'PAN Card';
      matchedKeywords.push('Income Tax', 'PAN');

      const panMatch = detectedText.match(/\b([A-Z]{5}[0-9]{4}[A-Z])\b/i);
      if (panMatch) {
        docNumber = panMatch[1].toUpperCase();
      }

      const dobMatch = detectedText.match(/(?:DOB|Date of Birth|Birth)[\s:]*([0-3]?[0-9][/-][0-1]?[0-9][/-][12][09]\d{2})/i);
      if (dobMatch) {
        dob = this.normalizeDate(dobMatch[1]);
      }
    }
    // --- Passport Detection ---
    else if (
      lowerCombined.includes('passport') ||
      (lowerCombined.includes('republic of india') && lowerCombined.includes('travel')) ||
      (lowerCombined.includes('given name') && lowerCombined.includes('surname'))
    ) {
      category = 'Travel';
      docType = 'Travel Document';
      subtype = 'Passport';
      matchedKeywords.push('Passport', 'Travel Document');

      const passMatch = detectedText.match(/\b([A-PR-WY][0-9]{7,8})\b/i);
      if (passMatch) {
        docNumber = passMatch[1].toUpperCase();
      }

      const expiryMatch = detectedText.match(/(?:Expiry|Valid (?:Upto|Until|Till|Through)|Date of Expiry)[\s:]*([0-3]?[0-9][/-][0-1]?[0-9][/-][12][09]\d{2})/i);
      if (expiryMatch) {
        expiryDate = this.normalizeDate(expiryMatch[1]);
      }

      const issueMatch = detectedText.match(/(?:Issue|Date of Issue)[\s:]*([0-3]?[0-9][/-][0-1]?[0-9][/-][12][09]\d{2})/i);
      if (issueMatch) {
        issueDate = this.normalizeDate(issueMatch[1]);
      }
    }
    // --- Driving Licence Detection ---
    else if (
      lowerCombined.includes('driving') ||
      lowerCombined.includes('licence') ||
      lowerCombined.includes('license') ||
      lowerCombined.includes('morth') ||
      lowerCombined.includes('motor vehicle') ||
      lowerCombined.includes('transport authority')
    ) {
      category = 'Identity';
      docType = 'Transport License';
      subtype = 'Driving Licence';
      matchedKeywords.push('Driving Licence', 'Transport');

      const dlMatch = detectedText.match(/\b([A-Z]{2}[- ]?[0-9]{2}[- ]?[0-9]{7,11})\b/i);
      if (dlMatch) {
        docNumber = dlMatch[1].toUpperCase().replace(/\s+/g, '-');
      }

      const expiryMatch = detectedText.match(/(?:Valid (?:Till|Upto|Through)|Expiry)[\s:]*([0-3]?[0-9][/-][0-1]?[0-9][/-][12][09]\d{2})/i);
      if (expiryMatch) {
        expiryDate = this.normalizeDate(expiryMatch[1]);
      }
    }
    // --- Medical & Insurance Policy Detection ---
    else if (
      lowerCombined.includes('insurance') ||
      lowerCombined.includes('policy') ||
      lowerCombined.includes('mediclaim') ||
      lowerCombined.includes('health') ||
      lowerCombined.includes('hospital') ||
      lowerCombined.includes('prescription') ||
      lowerCombined.includes('diagnostic')
    ) {
      category = 'Medical';
      docType = 'Health Document';
      subtype = lowerCombined.includes('insurance') ? 'Health Insurance' : 'Medical Record';
      matchedKeywords.push('Medical', 'Health');

      const polMatch = detectedText.match(/(?:Policy|POL|Certificate)[\s#:]*([A-Z0-9\-\/]{6,20})/i);
      if (polMatch) {
        docNumber = polMatch[1].toUpperCase();
      }

      const expiryMatch = detectedText.match(/(?:Valid (?:Through|Upto|Till)|Expiry|Period of Cover)[\s:]*([0-3]?[0-9][/-][0-1]?[0-9][/-][12][09]\d{2})/i);
      if (expiryMatch) {
        expiryDate = this.normalizeDate(expiryMatch[1]);
      }
    }
    // --- Education / Academic Records ---
    else if (
      lowerCombined.includes('university') ||
      lowerCombined.includes('college') ||
      lowerCombined.includes('degree') ||
      lowerCombined.includes('certificate') ||
      lowerCombined.includes('diploma') ||
      lowerCombined.includes('marksheet') ||
      lowerCombined.includes('transcript') ||
      lowerCombined.includes('board of secondary') ||
      Boolean(usnMatch)
    ) {
      category = 'Education';
      docType = 'Academic Record';
      subtype = 'Degree / Certificate';
      matchedKeywords.push('Education', 'Academic');

      if (!docNumber) {
        const rollMatch = detectedText.match(/(?:Roll|Registration|Reg|Enrollment|USN)[\s#:]*([A-Z0-9\-\/]{4,20})/i);
        if (rollMatch) {
          docNumber = rollMatch[1].toUpperCase();
        }
      }
    }
    // --- Property & Real Estate ---
    else if (
      lowerCombined.includes('deed') ||
      lowerCombined.includes('lease') ||
      lowerCombined.includes('rental') ||
      lowerCombined.includes('property') ||
      lowerCombined.includes('mortgage') ||
      lowerCombined.includes('sale deed')
    ) {
      category = 'Property';
      docType = 'Real Estate Document';
      subtype = 'Property Deed';
      matchedKeywords.push('Property', 'Real Estate');
    }

    // --- General Date Fallback ---
    if (!expiryDate) {
      const expMatch = detectedText.match(/(?:Valid (?:Upto|Until|Till|Through)|Expiry|Expires)[\s:]*([0-3]?[0-9][/-][0-1]?[0-9][/-][12][09]\d{2})/i);
      if (expMatch) {
        expiryDate = this.normalizeDate(expMatch[1]);
      }
    }

    // --- Clean Holder Name Extraction ---
    if (userFullName && detectedText.toLowerCase().includes(userFullName.toLowerCase())) {
      holderName = userFullName;
    } else {
      const nameMatch = detectedText.match(/(?:Name|Holder Name|Student Name|Candidate Name|Given Name)[\s:.-]*([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]*){0,3})/);
      if (nameMatch && nameMatch[1].trim().length > 2) {
        const found = nameMatch[1].trim();
        if (
          !found.toLowerCase().includes('authority') &&
          !found.toLowerCase().includes('department') &&
          !found.toLowerCase().includes('government') &&
          !found.toLowerCase().includes('india')
        ) {
          holderName = found;
        }
      }
    }

    // Build clean, human-readable OCR text without any junk
    const summaryHeader: string[] = [`Document Title: ${cleanName}`];
    if (category && category !== 'Other') summaryHeader.push(`Category: ${category} (${subtype})`);
    if (holderName) summaryHeader.push(`Holder Name: ${holderName}`);
    if (docNumber) summaryHeader.push(`Document ID / Number: ${docNumber}`);
    if (dob) summaryHeader.push(`Date of Birth: ${dob}`);
    if (issueDate) summaryHeader.push(`Issue Date: ${issueDate}`);
    if (expiryDate) summaryHeader.push(`Expiry Date: ${expiryDate}`);

    const cleanBody = sanitizeOcrText(detectedText);
    const finalExtractedText = cleanBody.length > 0
      ? `${summaryHeader.join('\n')}\n\n--- Extracted Document Text ---\n${cleanBody}`
      : summaryHeader.join('\n');

    return {
      extracted_text: finalExtractedText,
      suggested_category: category,
      suggested_doc_type: docType,
      subtype: subtype,
      confidence: cleanBody.length > 20 ? confidence : 0.85,
      matched_keywords: matchedKeywords,
      sha256_hash: sha256,
      file_size: file.size,
      is_blurred: blurResult.isBlurred,
      blur_score: blurResult.blurScore,
      holder_name: holderName,
      doc_number: docNumber,
      dob: dob,
      issue_date: issueDate,
      expiry_date: expiryDate,
    };
  }
}
