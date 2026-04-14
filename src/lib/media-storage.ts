import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const uploadsRoot = path.resolve(process.cwd(), "uploads");

export function buildUploadFilePath(uploadIntentId: string, fileName: string): string {
  return path.join(uploadsRoot, uploadIntentId, fileName);
}

export async function persistUploadedMedia(
  uploadIntentId: string,
  fileName: string,
  bytes: Buffer,
): Promise<string> {
  const filePath = buildUploadFilePath(uploadIntentId, fileName);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes);
  return filePath;
}

export async function hasUploadedMedia(filePath: string): Promise<boolean> {
  try {
    const details = await stat(filePath);
    return details.isFile() && details.size > 0;
  } catch {
    return false;
  }
}
