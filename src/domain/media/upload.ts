import type { MediaUploadIntent } from "../types.js";
import { createId } from "../../lib/id.js";
import { buildUploadFilePath, buildUploadUrl } from "../../lib/media-storage.js";

export async function createMediaUploadIntent(input: {
  purpose: "SNAP" | "BOUNTY";
  fileName: string;
  mimeType: string;
}): Promise<MediaUploadIntent> {
  const id = createId("media");
  const createdAt = new Date().toISOString();
  const uploadToken = crypto.randomUUID();
  const storagePath = buildUploadFilePath(id, input.fileName);
  const uploadUrl = await buildUploadUrl({
    id,
    fileName: input.fileName,
    mimeType: input.mimeType,
    storagePath,
    uploadToken,
  });

  return {
    id,
    purpose: input.purpose,
    fileName: input.fileName,
    mimeType: input.mimeType,
    uploadUrl,
    mediaRef: `media://${id}/${input.fileName}`,
    status: "pending",
    createdAt,
    uploadToken,
    storagePath,
  };
}
