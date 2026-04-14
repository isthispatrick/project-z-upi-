import { describe, expect, it } from "vitest";
import { persistUploadedMedia } from "../src/lib/media-storage.js";
import { MemoryPersistenceAdapter } from "../src/persistence/memory-adapter.js";
import { SocialFinanceCopilotService } from "../src/services/copilot.js";

describe("media upload contract", () => {
  it("creates and confirms a media upload intent", async () => {
    const service = new SocialFinanceCopilotService(new MemoryPersistenceAdapter());

    const intent = await service.createUploadIntent({
      purpose: "SNAP",
      fileName: "snap.jpg",
      mimeType: "image/jpeg",
    });

    expect(intent.status).toBe("pending");
    expect(intent.mediaRef).toContain("media://");

    await persistUploadedMedia(intent.id, intent.fileName, Buffer.from("fake-image"));

    const confirmed = await service.confirmUploadIntent(intent.id);
    expect(confirmed.status).toBe("uploaded");
  });
});
