import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import type { Buffer } from "buffer";
import sharp from "sharp";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CF_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CF_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.CF_BUCKET_NAME || "shinobi-iga-ryu";

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
    const command = new PutObjectCommand({ Bucket: BUCKET, Key: key });
    return getSignedUrl(s3, command, { expiresIn: 900 });
  }

  async uploadBuffer(buffer: Buffer, _contentType: string, maxWidth = 2048, maxHeight = 2048): Promise<string> {
    const key = `uploads/${randomUUID()}`;
    const compressed = await sharp(buffer)
      .resize(maxWidth, maxHeight, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
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
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    } catch {
    }
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (rawPath.startsWith("https://") && rawPath.includes(".r2.cloudflarestorage.com")) {
      const url = new URL(rawPath);
      return `/objects${url.pathname.replace(`/${BUCKET}`, "")}`;
    }
    return rawPath;
  }

  async getObjectEntityFile(objectPath: string): Promise<string> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const key = objectPath.replace("/objects/", "");
    try {
      await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
      return key;
    } catch {
      throw new ObjectNotFoundError();
    }
  }

  async downloadObject(key: string, cacheTtlSec = 3600): Promise<Response> {
    const response = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
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
