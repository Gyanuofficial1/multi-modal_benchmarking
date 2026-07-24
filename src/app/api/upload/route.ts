import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

export async function GET() {
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const enabled = !!(bucketName && accessKeyId && secretAccessKey);
  return NextResponse.json({ enabled });
}

export async function POST(req: NextRequest) {
  try {
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
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
