import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Configure the S3 client for DigitalOcean Spaces
const spacesClient = new S3Client({
  region: "us-east-1", // DigitalOcean Spaces use this region
  endpoint: process.env.SPACES_ENDPOINT || "https://nyc3.digitaloceanspaces.com",
  credentials: {
    accessKeyId: process.env.SPACES_KEY || "",
    secretAccessKey: process.env.SPACES_SECRET || "",
  },
});

const BUCKET_NAME = process.env.SPACES_BUCKET || "ideaship";

export async function uploadFile(key: string, body: Buffer, contentType: string): Promise<string> {
  try {
    // Upload the file to Spaces
    await spacesClient.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
        ACL: "public-read", // Make the file publicly accessible
      })
    );

    // Generate the public URL for the file
    const publicUrl = `https://${BUCKET_NAME}.${process.env.SPACES_ENDPOINT?.replace("https://", "") || "nyc3.digitaloceanspaces.com"}/${key}`;
    return publicUrl;
  } catch (error) {
    console.error("Error uploading file to DigitalOcean Spaces:", error);
    throw error;
  }
}

export async function getSignedFileUrl(key: string, expiresIn = 3600): Promise<string> {
  // Create a command for getting the object
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  // Generate a signed URL for the file that expires after the specified seconds
  try {
    const signedUrl = await getSignedUrl(spacesClient, command, {
      expiresIn,
    });
    return signedUrl;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    throw error;
  }
}