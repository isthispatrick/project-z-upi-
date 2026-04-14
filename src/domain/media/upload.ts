import type { MediaUploadIntent } from "../types.js";
import { createId } from "../../lib/id.js";
import { buildUploadFilePath } from "../../lib/media-storage.js";

export function createMediaUploadIntent(input: {
  purpose: "SNAP" | "BOUNTY";
  fileName: string;
  mimeType: string;
}): MediaUploadIntent {
  const id = createId("media");
  const createdAt = new Date().toISOString();
  const uploadToken = crypto.randomUUID();
  const storagePath = buildUploadFilePath(id, input.fileName);

  return {
    id,
    purpose: input.purpose,
    fileName: input.fileName,
    mimeType: input.mimeType,
    uploadUrl: `/uploads/${id}?token=${encodeURIComponent(uploadToken)}`,
    mediaRef: `media://${id}/${input.fileName}`,
    status: "pending",
    createdAt,
    uploadToken,
    storagePath,
  };
}
