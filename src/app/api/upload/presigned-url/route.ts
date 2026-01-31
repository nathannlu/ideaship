// app/api/upload/presign/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import {
  S3Client,
  PutObjectCommand,
  PutObjectAclCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * POST /api/upload/presign
 *
 * Body (multipart/form‑data):
 *   filename     – original file name (string)
 *   contentType  – MIME type, e.g. "image/jpeg" (string)
 *   key?         – optional custom key (string)
 *
 * Response JSON:
 *   url        – presigned PUT URL (expires in 1 h)
 *   publicUrl  – final CDN/Spaces URL
 *   key        – object key
 *   bucket     – bucket/space name
 */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await req.formData();
  const filename    = data.get('filename')    as string | null;
  const contentType = data.get('contentType') as string | null;
  let   key         = data.get('key')         as string | null;

  if (!filename || !contentType) {
    return NextResponse.json(
      { error: 'filename and contentType are required' },
      { status: 400 },
    );
  }
  if (!key) {
    key = `uploads/${session.user.id}/${Date.now()}-${filename}`;
  }

  const region      = "nyc3";
  const bucketName  = process.env.SPACES_BUCKET!;
  const endpoint    = process.env.SPACES_ENDPOINT ?? `https://${region}.digitaloceanspaces.com`;

  const s3 = new S3Client({
    region,
    endpoint,                   
    credentials: {
      accessKeyId:     process.env.SPACES_KEY!,
      secretAccessKey: process.env.SPACES_SECRET!,
    },
    // bucket goes in the host, not the path (Spaces prefers virtual‑host style)
    forcePathStyle: false,
  });

  const putCmd = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: contentType,
    ACL: "public-read"
  });

  const url = await getSignedUrl(s3, putCmd, { expiresIn: 3600 });

  const publicUrl = `https://${bucketName}.${region}.digitaloceanspaces.com/${key}`;

  return NextResponse.json({
    url,        // PUT here from browser
    publicUrl,  // final CDN URL
    key,
    bucket: bucketName,
  });
}
