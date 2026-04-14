import { describe, expect, it } from "vitest";
import { MemoryPersistenceAdapter } from "../src/persistence/memory-adapter.js";
import { SocialFinanceCopilotService } from "../src/services/copilot.js";

describe("SocialFinanceCopilotService", () => {
  it("falls back to seeded merchant category when the raw VPA is opaque", async () => {
    const store = new MemoryPersistenceAdapter();
    await store.saveMerchant({
      vpa: "newcafe.blr@icici",
      displayName: "New Cafe",
      categoryHint: "CAFE",
      resolution: "seeded",
      mappedFromCrowdCount: 4,
      locationName: "Koramangala 5th Block",
      lastSeenAt: "2026-04-01T10:00:00.000Z",
    });
    const service = new SocialFinanceCopilotService(store);

    const result = await service.ingestNotification({
      deviceId: "device-1",
      sourceApp: "PhonePe",
      rawText:
        "Rs.150 debited from a/c XX1234 via UPI to newcafe.blr@icici on 15-Apr-2026 14:30 Ref 903221",
      capturedAt: "2026-04-15T14:31:00.000Z",
    });

    expect(result.transaction.category).toBe("CAFE");
    expect(result.transaction.deviceId).toBe("device-1");
    expect(result.prompt.headline).toContain("New Cafe");
  });
});
