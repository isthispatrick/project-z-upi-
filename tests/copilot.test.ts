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
    expect(result.memory.cacheStatus).toBe("hit");
    expect(result.memory.shouldProcessMerchantAi).toBe(false);
  });

  it("deduplicates friend links per user", async () => {
    const store = new MemoryPersistenceAdapter();
    const service = new SocialFinanceCopilotService(store);

    const first = await service.addFriendLink({
      userId: "user_1",
      friendUserId: "user_2",
    });
    const second = await service.addFriendLink({
      userId: "user_1",
      friendUserId: "user_2",
    });

    expect(second.id).toBe(first.id);

    const friends = await service.listFriendLinks("user_1");
    expect(friends).toHaveLength(1);
    expect(friends[0]?.friendUserId).toBe("user_2");
  });

  it("enriches friend recipients with stored user profiles", async () => {
    const store = new MemoryPersistenceAdapter();
    await store.saveUser({
      id: "user_2",
      email: "vishesh@example.com",
      displayName: "Vishesh",
      photoUrl: "https://example.com/vishesh.jpg",
      authProvider: "GOOGLE",
      providerUserId: "google-2",
      createdAt: "2026-04-15T05:00:00.000Z",
      lastSeenAt: "2026-04-15T05:00:00.000Z",
    });
    const service = new SocialFinanceCopilotService(store);
    await service.addFriendLink({
      userId: "user_1",
      friendUserId: "user_2",
    });

    const friends = await service.listFriendRecipients("user_1");
    expect(friends[0]?.displayName).toBe("Vishesh");
    expect(friends[0]?.email).toBe("vishesh@example.com");
  });
});
