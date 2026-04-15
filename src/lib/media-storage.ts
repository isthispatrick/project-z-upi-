import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { MediaUploadIntent } from "../domain/types.js";
import { loadEnv } from "../config/env.js";

const uploadsRoot = path.resolve(process.cwd(), "uploads");

function getR2Config() {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return undefined;
  }

  const env = loadEnv();
  if (!env.r2AccountId || !env.r2Bucket || !env.r2AccessKeyId || !env.r2SecretAccessKey) {
    return undefined;
  }

  return {
    bucket: env.r2Bucket,
    client: new S3Client({
      region: "auto",
      endpoint: `https://${env.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.r2AccessKeyId,
        secretAccessKey: env.r2SecretAccessKey,
      },
    }),
  };
}

export function buildUploadFilePath(uploadIntentId: string, fileName: string): string {
  const r2 = getR2Config();
  if (r2) {
    return `uploads/${uploadIntentId}/${fileName}`;
  }

  return path.join(uploadsRoot, uploadIntentId, fileName);
}

export async function buildUploadUrl(intent: Pick<MediaUploadIntent, "id" | "fileName" | "mimeType" | "storagePath" | "uploadToken">): Promise<string> {
  const r2 = getR2Config();

  if (r2) {
    return getSignedUrl(
      r2.client,
      new PutObjectCommand({
        Bucket: r2.bucket,
        Key: intent.storagePath,
        ContentType: intent.mimeType,
      }),
      { expiresIn: 15 * 60 },
    );
  }

  return `/uploads/${intent.id}?token=${encodeURIComponent(intent.uploadToken)}`;
}

export async function persistUploadedMedia(
  uploadIntentId: string,
  fileName: string,
  bytes: Buffer,
  mimeType = "application/octet-stream",
): Promise<string> {
  const storagePath = buildUploadFilePath(uploadIntentId, fileName);
  const r2 = getR2Config();

  if (r2) {
    await r2.client.send(new PutObjectCommand({
      Bucket: r2.bucket,
      Key: storagePath,
      Body: bytes,
      ContentType: mimeType,
    }));
    return storagePath;
  }

  await mkdir(path.dirname(storagePath), { recursive: true });
  await writeFile(storagePath, bytes);
  return storagePath;
}

export async function hasUploadedMedia(storagePath: string): Promise<boolean> {
  const r2 = getR2Config();

  if (r2) {
    try {
      await r2.client.send(new HeadObjectCommand({
        Bucket: r2.bucket,
        Key: storagePath,
      }));
      return true;
    } catch {
      return false;
    }
  }

  try {
    const details = await stat(storagePath);
    return details.isFile() && details.size > 0;
  } catch {
    return false;
  }
}

export async function readUploadedMedia(storagePath: string): Promise<Buffer> {
  const r2 = getR2Config();

  if (r2) {
    const response = await r2.client.send(new GetObjectCommand({
      Bucket: r2.bucket,
      Key: storagePath,
    }));

    if (!response.Body) {
      throw new Error("Uploaded media body is empty");
    }

    return streamToBuffer(response.Body as Readable);
  }

  return readFile(storagePath);
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}
