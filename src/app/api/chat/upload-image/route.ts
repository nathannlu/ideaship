import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { S3 } from '@aws-sdk/client-s3';
import { Buffer } from 'buffer';

/**
 * Uploads an image to DigitalOcean Spaces and returns its public URL.
 * Endpoint: POST /api/chat/upload-image
 */
export async function POST(request: Request) {
  // Authenticate user
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Parse multipart form data
  const formData = await request.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  // Read file data
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  // Configure S3 client for DigitalOcean Spaces
  const spacesEndpoint = process.env.SPACES_ENDPOINT!;
  const spacesBucket = process.env.SPACES_BUCKET!;
  const s3 = new S3({
    endpoint: spacesEndpoint,
    region: process.env.SPACES_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.SPACES_KEY!,
      secretAccessKey: process.env.SPACES_SECRET!,
    },
    forcePathStyle: true,
  });
  // Generate unique key for the file
  const filename = (file as File).name;
  const key = `chat/${session.user.id}/${Date.now()}-${filename}`;
  try {
    await s3.putObject({
      Bucket: spacesBucket,
      Key: key,
      Body: buffer,
      ACL: 'public-read',
      ContentType: (file as File).type,
    });
    // Construct public URL (path style)
    const url = `${spacesEndpoint}/${spacesBucket}/${key}`;
    return NextResponse.json({ url });
  } catch (err: any) {
    console.error('Image upload error:', err);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}