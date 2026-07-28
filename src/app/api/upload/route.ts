import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import JSZip from 'jszip';
import {
  extractTextFromPdfBuffer,
  extractTextFromDocxBuffer,
  extractTextFromDocBuffer,
  getMimeType,
} from '../../../services/zipPdfHandler';

export async function GET() {
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  const accessKeyId = process.env.AWS_S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  const enabled = !!(bucketName && accessKeyId && secretAccessKey);
  return NextResponse.json({ enabled });
}

export async function POST(req: NextRequest) {
  try {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    const accessKeyId = process.env.AWS_S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'us-east-1';

    if (!bucketName || !accessKeyId || !secretAccessKey) {
      return NextResponse.json(
        { enabled: false, message: 'AWS S3 is not configured on the server.' },
        { status: 200 }
      );
    }

    const { fileName, base64Data, mimeType } = await req.json();
    if (!fileName || !base64Data) {
      return NextResponse.json({ error: 'Missing fileName or base64Data' }, { status: 400 });
    }

    const s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const zipMimeType = 'application/zip';
    const isZip = mimeType === zipMimeType || fileName.toLowerCase().endsWith('.zip');

    if (isZip) {
      const zipBuffer = Buffer.from(base64Data, 'base64');
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(zipBuffer);

      const jsonMap: Record<string, any> = {};
      const entries = Object.keys(loadedZip.files);

      // Pass 1: Parse all expected JSON files in the ZIP
      for (const entryName of entries) {
        const entry = loadedZip.files[entryName];
        if (entry.dir || entryName.startsWith('__MACOSX') || entryName.startsWith('.')) continue;

        const lowerName = entryName.toLowerCase();
        if (lowerName.endsWith('.json')) {
          try {
            const jsonText = await entry.async('text');
            const parsed = JSON.parse(jsonText);
            const baseName = entryName.split('/').pop()?.replace(/\.json$/i, '').replace(/_expected$/i, '').toLowerCase() || '';
            jsonMap[baseName] = parsed;
          } catch (err) {
            console.warn(`Server ZIP: Failed to parse JSON file ${entryName}:`, err);
          }
        }
      }

      // Pass 2: Extract documents, upload to S3, parse text
      const processedItems: any[] = [];
      for (const entryName of entries) {
        const entry = loadedZip.files[entryName];
        if (entry.dir || entryName.startsWith('__MACOSX') || entryName.startsWith('.')) continue;

        const lowerName = entryName.toLowerCase();
        const baseName = entryName.split('/').pop()?.replace(/\.(pdf|txt|png|jpg|jpeg|webp|docx|doc)$/i, '').toLowerCase() || '';
        const mime = getMimeType(entryName);

        const isSupported =
          lowerName.endsWith('.pdf') ||
          lowerName.endsWith('.docx') ||
          lowerName.endsWith('.doc') ||
          lowerName.endsWith('.txt') ||
          lowerName.endsWith('.png') ||
          lowerName.endsWith('.jpg') ||
          lowerName.endsWith('.jpeg') ||
          lowerName.endsWith('.webp');

        if (!isSupported) continue;

        const entryBuffer = await entry.async('nodebuffer');
        const fileBase64 = entryBuffer.toString('base64');

        // Upload to S3
        const shortFileName = entryName.split('/').pop() || entryName;
        const uniqueKey = `resumes/${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${shortFileName}`;

        await s3Client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: uniqueKey,
            Body: entryBuffer,
            ContentType: mime || 'application/octet-stream',
          })
        );

        // Extract Text and Mime Details
        let extractedText = '';
        let isScannedImagePdf = false;
        let extractionMode: 'TEXT_PROMPT' | 'DIRECT_FILE_MULTIMODAL' = 'TEXT_PROMPT';
        let fileType = '';

        const rawArrayBuffer = entryBuffer.buffer.slice(
          entryBuffer.byteOffset,
          entryBuffer.byteOffset + entryBuffer.byteLength
        ) as ArrayBuffer;

        if (lowerName.endsWith('.pdf')) {
          fileType = 'pdf';
          const parseResult = await extractTextFromPdfBuffer(rawArrayBuffer);
          extractedText = parseResult.extractedText;
          isScannedImagePdf = parseResult.isScannedImagePdf;
          extractionMode = parseResult.extractionMode;
        } else if (lowerName.endsWith('.docx')) {
          fileType = 'docx';
          extractedText = await extractTextFromDocxBuffer(rawArrayBuffer);
          isScannedImagePdf = extractedText.trim().length < 20;
          extractionMode = extractedText.trim().length >= 20 ? 'TEXT_PROMPT' : 'DIRECT_FILE_MULTIMODAL';
        } else if (lowerName.endsWith('.doc')) {
          fileType = 'doc';
          extractedText = extractTextFromDocBuffer(rawArrayBuffer);
          isScannedImagePdf = extractedText.trim().length < 20;
          extractionMode = extractedText.trim().length >= 20 ? 'TEXT_PROMPT' : 'DIRECT_FILE_MULTIMODAL';
        } else if (lowerName.endsWith('.txt')) {
          fileType = 'txt';
          extractedText = entryBuffer.toString('utf-8');
          isScannedImagePdf = false;
          extractionMode = 'TEXT_PROMPT';
        } else {
          fileType = 'image';
          extractedText = '[Image File Detected: OCR could not be extracted directly. Direct Base64 payload sent to AI models.]';
          isScannedImagePdf = true;
          extractionMode = 'DIRECT_FILE_MULTIMODAL';
        }

        processedItems.push({
          id: `${fileType}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          fileName: shortFileName,
          fileType,
          extractedText,
          base64Data: fileBase64,
          isScannedImagePdf,
          extractionMode,
          expectedJson: jsonMap[baseName] || undefined,
          mimeType: mime,
          s3Key: uniqueKey,
        });
      }

      return NextResponse.json({ enabled: true, isZip: true, items: processedItems });
    }

    // Default flow: Single file upload
    const buffer = Buffer.from(base64Data, 'base64');
    const uniqueKey = `resumes/${Date.now()}-${Math.random().toString(36).substring(2, 7)}-${fileName}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: uniqueKey,
        Body: buffer,
        ContentType: mimeType || 'application/octet-stream',
      })
    );

    return NextResponse.json({ enabled: true, s3Key: uniqueKey });
  } catch (err: any) {
    console.error('S3 upload endpoint error:', err);
    return NextResponse.json({ error: err.message || 'S3 upload failed' }, { status: 500 });
  }
}

