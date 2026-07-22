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

// Dynamically extract clean text using pdfjs-dist on client browser
export async function extractTextFromPdfBuffer(arrayBuffer: ArrayBuffer): Promise<PdfParseResult> {
  if (typeof window !== 'undefined') {
    try {
      const pdfjsLib = await import('pdfjs-dist/build/pdf.mjs');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const pdfData = new Uint8Array(arrayBuffer.slice(0));
      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
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

      if (fullText.length > 30) {
        return {
          extractedText: fullText,
          isScannedImagePdf: false,
          extractionMode: 'TEXT_PROMPT',
        };
      }
    } catch (err) {
      console.warn('PDF.js dynamic parsing warning:', err);
    }
  }

  // Stream extraction fallback
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
            if (cleaned.length > 0 && !cleaned.startsWith('/') && !cleaned.includes('\\')) {
              textSegments.push(cleaned);
            }
          });
        }
      });
    }

    const fallbackText = textSegments.join(' ').replace(/\s+/g, ' ').trim();
    if (fallbackText.length > 50 && !fallbackText.startsWith('%PDF-')) {
      return {
        extractedText: fallbackText,
        isScannedImagePdf: false,
        extractionMode: 'TEXT_PROMPT',
      };
    }
  } catch (fallbackErr) {}

  return {
    extractedText: '[Scanned Image PDF Detected: Text could not be extracted directly. Direct Base64 PDF Payload sent to AI models.]',
    isScannedImagePdf: true,
    extractionMode: 'DIRECT_FILE_MULTIMODAL',
  };
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

  // 2. Second pass: load PDF/TXT files and pair with matching JSON if available
  for (const fileName of entries) {
    const entry = loadedZip.files[fileName];
    if (entry.dir || fileName.startsWith('__MACOSX') || fileName.startsWith('.')) continue;

    const lowerName = fileName.toLowerCase();
    const baseName = fileName.split('/').pop()?.replace(/\.(pdf|txt)$/i, '').toLowerCase() || '';

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
      });
    }
  }

  return items;
}

// Process single uploaded PDF or TXT file
export async function processSingleFile(file: File): Promise<ResumeFileItem> {
  const lowerName = file.name.toLowerCase();

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
  };
}
