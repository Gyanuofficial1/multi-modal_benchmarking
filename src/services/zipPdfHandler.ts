import JSZip from 'jszip';
import { ResumeFileItem } from '../types/benchmark';

export interface PdfParseResult {
  extractedText: string;
  isScannedImagePdf: boolean;
  extractionMode: 'TEXT_PROMPT' | 'DIRECT_FILE_MULTIMODAL';
}

// Convert ArrayBuffer to Base64 data URL for Direct Multimodal PDF APIs
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  try {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return typeof window !== 'undefined' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
  } catch (err) {
    console.warn('Error converting array buffer to base64:', err);
    return '';
  }
}

// Helper to check if extracted string is genuine readable text vs raw binary stream garbage
export function isReadableText(text: string): boolean {
  if (!text || text.trim().length < 10) return false;
  // If text starts with raw PDF file header or contains stream markers, it's binary stream
  if (text.startsWith('%PDF-') || text.includes('endstream') || text.includes('FlateDecode') || text.includes('XObject')) {
    return false;
  }
  // Count printable characters (letters, numbers, basic punctuation, spaces, non-ASCII UTF-8 characters)
  const printableMatches = text.match(/[\w\s.,!?:;\-()@/"'#&%$+\=–—]/g) || [];
  const ratio = printableMatches.length / text.length;
  return ratio > 0.65;
}

// Dynamically extract clean text using pdfjs-dist (Works on both Client Browser & Node.js Server)
export async function extractTextFromPdfBuffer(arrayBuffer: ArrayBuffer): Promise<PdfParseResult> {
  // 1. Try PDF.js parsing (Works in Browser and Node.js)
  try {
    let pdfjsLib: any;
    if (typeof window !== 'undefined') {
      pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      } catch (wErr) {}
    } else {
      // Node.js environment (Server API routes)
      pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      try {
        const path = await import('path');
        const { pathToFileURL } = await import('url');
        const workerPath = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
        pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
      } catch (wErr) {}
    }

    const pdfData = new Uint8Array(arrayBuffer.slice(0));
    const loadingTask = pdfjsLib.getDocument({
      data: pdfData,
      disableWorker: true,
      verbosity: 0,
    });
    const pdfDocument = await loadingTask.promise;
    
    let extractedPagesText: string[] = [];

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .filter((str: string) => str.trim().length > 0);
      
      if (pageStrings.length > 0) {
        extractedPagesText.push(pageStrings.join(' '));
      }
    }

    const fullText = extractedPagesText.join('\n\n').replace(/[ \t]+/g, ' ').trim();

    if (fullText.length > 20 && isReadableText(fullText)) {
      return {
        extractedText: fullText,
        isScannedImagePdf: false,
        extractionMode: 'TEXT_PROMPT',
      };
    }
  } catch (err) {
    console.warn('PDF.js dynamic parsing warning:', err);
  }

  // 2. Stream extraction fallback (Only for clean uncompressed ASCII strings, avoiding binary garbage)
  try {
    const bytes = new Uint8Array(arrayBuffer.slice(0));
    const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);

    const textSegments: string[] = [];
    const streamMatches = text.match(/BT[\s\S]*?ET/g);

    if (streamMatches && streamMatches.length > 0) {
      streamMatches.forEach((block) => {
        const stringMatches = block.match(/\(([^()]*)\)/g);
        if (stringMatches) {
          stringMatches.forEach((str) => {
            const cleaned = str.substring(1, str.length - 1).trim();
            // Strictly check printable ASCII text
            if (cleaned.length > 0 && /^[\x20-\x7E\s]+$/.test(cleaned) && !cleaned.startsWith('/') && !cleaned.includes('\\')) {
              textSegments.push(cleaned);
            }
          });
        }
      });
    }

    const fallbackText = textSegments.join(' ').replace(/\s+/g, ' ').trim();
    if (fallbackText.length > 30 && isReadableText(fallbackText)) {
      return {
        extractedText: fallbackText,
        isScannedImagePdf: false,
        extractionMode: 'TEXT_PROMPT',
      };
    }
  } catch (fallbackErr) {}

  // 3. If text cannot be extracted cleanly (scanned image or complex binary PDF),
  // DO NOT output binary garbage! Mark as Scanned/Multimodal PDF so AI receives direct Base64 file payload!
  return {
    extractedText: '[Scanned Image or Complex PDF: Direct Base64 PDF payload sent to AI models for vision/multimodal parsing.]',
    isScannedImagePdf: true,
    extractionMode: 'DIRECT_FILE_MULTIMODAL',
  };
}

export function getMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    case 'gif': return 'image/gif';
    case 'txt': return 'text/plain';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'doc': return 'application/msword';
    case 'json': return 'application/json';
    default: return 'application/octet-stream';
  }
}

// Dynamically extract text from docx file using JSZip
export async function extractTextFromDocxBuffer(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const zip = new JSZip();
    const loadedZip = await zip.loadAsync(arrayBuffer);
    const docXml = await loadedZip.file('word/document.xml')?.async('text');
    if (!docXml) return '';

    // Extract all text inside <w:t> tags
    const matches = docXml.match(/<w:t[^>]*>(.*?)<\/w:t>/g);
    if (!matches) return '';

    const text = matches
      .map((val) => val.replace(/<[^>]+>/g, ''))
      .join(' ');
    return text.replace(/\s+/g, ' ').trim();
  } catch (err) {
    console.warn('Error parsing docx:', err);
    return '';
  }
}

// Client-side fallback text extractor for binary .doc files by scanning printable ASCII and UTF-16 characters
export function extractTextFromDocBuffer(arrayBuffer: ArrayBuffer): string {
  try {
    const bytes = new Uint8Array(arrayBuffer);
    
    // 1. Extract UTF-16LE strings (common in standard Word Doc text content)
    let utf16Text = '';
    let utf16Temp = '';
    for (let i = 0; i < bytes.length - 1; i += 2) {
      const b1 = bytes[i];
      const b2 = bytes[i + 1];
      
      const isPrintable = (b1 >= 32 && b1 <= 126 && b2 === 0) ||
                          ((b1 === 10 || b1 === 13 || b1 === 9) && b2 === 0);
                          
      if (isPrintable) {
        utf16Temp += String.fromCharCode(b1);
      } else {
        if (utf16Temp.length >= 4) {
          utf16Text += utf16Temp + ' ';
        }
        utf16Temp = '';
      }
    }
    if (utf16Temp.length >= 4) {
      utf16Text += utf16Temp;
    }
    
    // 2. Extract 8-bit ASCII strings
    let asciiText = '';
    let asciiTemp = '';
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      const isPrintable = (b >= 32 && b <= 126) || b === 10 || b === 13 || b === 9;
      if (isPrintable) {
        asciiTemp += String.fromCharCode(b);
      } else {
        if (asciiTemp.length >= 4) {
          asciiText += asciiTemp + ' ';
        }
        asciiTemp = '';
      }
    }
    if (asciiTemp.length >= 4) {
      asciiText += asciiTemp;
    }
    
    const cleanText = (text: string) => {
      return text
        .replace(/Root Entry|WordDocument|ObjectPool|Directory|SummaryInformation|DocumentSummaryInformation|CompObj/g, '')
        .replace(/Normal\s+Default\s+Paragraph\s+Font/g, '')
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const cleanedUtf16 = cleanText(utf16Text);
    const cleanedAscii = cleanText(asciiText);
    
    return cleanedUtf16.length > cleanedAscii.length ? cleanedUtf16 : cleanedAscii;
  } catch (err) {
    console.warn('Error parsing doc:', err);
    return '';
  }
}

// Unzip a ZIP file containing multiple PDF resumes & optional matching JSON expected files
export async function processZipArchive(zipFile: File): Promise<ResumeFileItem[]> {
  const zip = new JSZip();
  const loadedZip = await zip.loadAsync(zipFile);
  const items: ResumeFileItem[] = [];

  // Map of json files in zip for auto-pairing (e.g. resume1.pdf -> resume1.json)
  const jsonMap: Record<string, any> = {};

  const entries = Object.keys(loadedZip.files);

  // 1. First pass: load all .json files in zip
  for (const fileName of entries) {
    const entry = loadedZip.files[fileName];
    if (entry.dir || fileName.startsWith('__MACOSX') || fileName.startsWith('.')) continue;

    const lowerName = fileName.toLowerCase();
    if (lowerName.endsWith('.json')) {
      try {
        const jsonText = await entry.async('text');
        const parsed = JSON.parse(jsonText);
        const baseName = fileName.split('/').pop()?.replace(/\.json$/i, '').replace(/_expected$/i, '').toLowerCase() || '';
        jsonMap[baseName] = parsed;
      } catch (err) {}
    }
  }

  // 2. Second pass: load PDF/TXT/Doc/Image files and pair with matching JSON if available
  for (const fileName of entries) {
    const entry = loadedZip.files[fileName];
    if (entry.dir || fileName.startsWith('__MACOSX') || fileName.startsWith('.')) continue;

    const lowerName = fileName.toLowerCase();
    const baseName = fileName.split('/').pop()?.replace(/\.(pdf|txt|png|jpg|jpeg|webp|docx|doc)$/i, '').toLowerCase() || '';
    const mime = getMimeType(fileName);

    if (lowerName.endsWith('.pdf')) {
      const buffer = await entry.async('arraybuffer');
      const base64 = arrayBufferToBase64(buffer.slice(0));
      const parseResult = await extractTextFromPdfBuffer(buffer.slice(0));

      items.push({
        id: `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        fileName: fileName.split('/').pop() || fileName,
        fileType: 'pdf',
        extractedText: parseResult.extractedText,
        base64Data: base64,
        isScannedImagePdf: parseResult.isScannedImagePdf,
        extractionMode: parseResult.extractionMode,
        expectedJson: jsonMap[baseName] || undefined,
        mimeType: mime,
      });
    } else if (lowerName.endsWith('.txt')) {
      const textContent = await entry.async('text');
      items.push({
        id: `txt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        fileName: fileName.split('/').pop() || fileName,
        fileType: 'txt',
        extractedText: textContent,
        isScannedImagePdf: false,
        extractionMode: 'TEXT_PROMPT',
        expectedJson: jsonMap[baseName] || undefined,
        mimeType: mime,
      });
    } else if (lowerName.endsWith('.docx')) {
      const buffer = await entry.async('arraybuffer');
      const base64 = arrayBufferToBase64(buffer.slice(0));
      const text = await extractTextFromDocxBuffer(buffer.slice(0));
      items.push({
        id: `docx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        fileName: fileName.split('/').pop() || fileName,
        fileType: 'docx',
        extractedText: text || '[Blank or Scanned Docx Content]',
        base64Data: base64,
        isScannedImagePdf: text.trim().length < 20,
        extractionMode: text.trim().length >= 20 ? 'TEXT_PROMPT' : 'DIRECT_FILE_MULTIMODAL',
        expectedJson: jsonMap[baseName] || undefined,
        mimeType: mime,
      });
    } else if (lowerName.endsWith('.doc')) {
      const buffer = await entry.async('arraybuffer');
      const base64 = arrayBufferToBase64(buffer.slice(0));
      const text = extractTextFromDocBuffer(buffer.slice(0));
      items.push({
        id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        fileName: fileName.split('/').pop() || fileName,
        fileType: 'doc',
        extractedText: text || '[Blank or Legacy Doc Content]',
        base64Data: base64,
        isScannedImagePdf: text.trim().length < 20,
        extractionMode: text.trim().length >= 20 ? 'TEXT_PROMPT' : 'DIRECT_FILE_MULTIMODAL',
        expectedJson: jsonMap[baseName] || undefined,
        mimeType: mime,
      });
    } else if (
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.webp')
    ) {
      const buffer = await entry.async('arraybuffer');
      const base64 = arrayBufferToBase64(buffer.slice(0));
      items.push({
        id: `image-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        fileName: fileName.split('/').pop() || fileName,
        fileType: 'image',
        extractedText: `[Image File Detected: OCR could not be extracted directly. Direct Base64 payload sent to AI models.]`,
        base64Data: base64,
        isScannedImagePdf: true,
        extractionMode: 'DIRECT_FILE_MULTIMODAL',
        expectedJson: jsonMap[baseName] || undefined,
        mimeType: mime,
      });
    }
  }

  return items;
}

// Process single uploaded PDF, TXT, Word, or Image file
export async function processSingleFile(file: File): Promise<ResumeFileItem> {
  const lowerName = file.name.toLowerCase();
  const mime = getMimeType(file.name);

  if (lowerName.endsWith('.pdf')) {
    const buffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer.slice(0));
    const parseResult = await extractTextFromPdfBuffer(buffer.slice(0));

    return {
      id: `pdf-${Date.now()}`,
      fileName: file.name,
      fileType: 'pdf',
      extractedText: parseResult.extractedText,
      base64Data: base64,
      isScannedImagePdf: parseResult.isScannedImagePdf,
      extractionMode: parseResult.extractionMode,
      mimeType: mime,
    };
  }

  if (lowerName.endsWith('.docx')) {
    const buffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer.slice(0));
    const text = await extractTextFromDocxBuffer(buffer.slice(0));
    return {
      id: `docx-${Date.now()}`,
      fileName: file.name,
      fileType: 'docx',
      extractedText: text || '[Blank or Scanned Docx Content]',
      base64Data: base64,
      isScannedImagePdf: text.trim().length < 20,
      extractionMode: text.trim().length >= 20 ? 'TEXT_PROMPT' : 'DIRECT_FILE_MULTIMODAL',
      mimeType: mime,
    };
  }

  if (lowerName.endsWith('.doc')) {
    const buffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer.slice(0));
    const text = extractTextFromDocBuffer(buffer.slice(0));
    return {
      id: `doc-${Date.now()}`,
      fileName: file.name,
      fileType: 'doc',
      extractedText: text || '[Blank or Legacy Doc Content]',
      base64Data: base64,
      isScannedImagePdf: text.trim().length < 20,
      extractionMode: text.trim().length >= 20 ? 'TEXT_PROMPT' : 'DIRECT_FILE_MULTIMODAL',
      mimeType: mime,
    };
  }

  if (
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.webp')
  ) {
    const buffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer.slice(0));
    return {
      id: `image-${Date.now()}`,
      fileName: file.name,
      fileType: 'image',
      extractedText: `[Image File Detected: OCR could not be extracted directly. Direct Base64 payload sent to AI models.]`,
      base64Data: base64,
      isScannedImagePdf: true,
      extractionMode: 'DIRECT_FILE_MULTIMODAL',
      mimeType: mime,
    };
  }

  const textContent = await file.text();
  return {
    id: `txt-${Date.now()}`,
    fileName: file.name,
    fileType: 'txt',
    extractedText: textContent,
    isScannedImagePdf: false,
    extractionMode: 'TEXT_PROMPT',
    mimeType: mime,
  };
}
