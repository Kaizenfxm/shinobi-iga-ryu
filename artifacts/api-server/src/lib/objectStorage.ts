import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import type { Buffer } from "buffer";
import sharp from "sharp";

function getS3Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      `R2 credentials missing. R2_ACCOUNT_ID=${!!accountId} R2_ACCESS_KEY_ID=${!!accessKeyId} R2_SECRET_ACCESS_KEY=${!!secretAccessKey}`
    );
  }
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

function getBucket(): string {
  return process.env.R2_BUCKET_NAME || "shinobi-iga-ryu";
}

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  async getObjectEntityUploadURL(): Promise<string> {
    const key = `uploads/${randomUUID()}`;
    const command = new PutObjectCommand({ Bucket: getBucket(), Key: key });
    return getSignedUrl(getS3Client(), command, { expiresIn: 900 });
  }

  async uploadBuffer(buffer: Buffer, _contentType: string, maxWidth = 2048, maxHeight = 2048): Promise<string> {
    const key = `uploads/${randomUUID()}`;
    const compressed = await sharp(buffer)
      .resize(maxWidth, maxHeight, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    await getS3Client().send(new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: compressed,
      ContentType: "image/jpeg",
    }));
    return `/objects/${key}`;
  }

  async deleteObject(objectPath: string): Promise<void> {
    if (!objectPath.startsWith("/objects/")) return;
    const key = objectPath.replace("/objects/", "");
    try {
      await getS3Client().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: key }));
    } catch {
    }
  }

  normalizeObjectEntityPath(rawPath: string): string {
    const bucket = getBucket();
    if (rawPath.startsWith("https://") && rawPath.includes(".r2.cloudflarestorage.com")) {
      const url = new URL(rawPath);
      return `/objects${url.pathname.replace(`/${bucket}`, "")}`;
    }
    return rawPath;
  }

  async getObjectEntityFile(objectPath: string): Promise<string> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const key = objectPath.replace("/objects/", "");
    try {
      await getS3Client().send(new HeadObjectCommand({ Bucket: getBucket(), Key: key }));
      return key;
    } catch {
      throw new ObjectNotFoundError();
    }
  }

  async downloadObject(key: string, cacheTtlSec = 3600): Promise<Response> {
    const response = await getS3Client().send(new GetObjectCommand({ Bucket: getBucket(), Key: key }));
    const stream = response.Body as ReadableStream;
    const headers: Record<string, string> = {
      "Content-Type": response.ContentType || "application/octet-stream",
      "Cache-Control": `public, max-age=${cacheTtlSec}`,
    };
    if (response.ContentLength) headers["Content-Length"] = String(response.ContentLength);
    return new Response(stream, { headers });
  }

  async trySetObjectEntityAclPolicy(rawPath: string, _aclPolicy: unknown): Promise<string> {
    return this.normalizeObjectEntityPath(rawPath);
  }

  async canAccessObjectEntity(_opts: unknown): Promise<boolean> {
    return true;
  }
}
