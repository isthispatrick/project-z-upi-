import { describe, expect, it } from "vitest";
import { MemoryPersistenceAdapter } from "../src/persistence/memory-adapter.js";
import { SocialFinanceCopilotService } from "../src/services/copilot.js";

describe("ledger listing", () => {
  it("returns only entries for the requested device", async () => {
    const store = new MemoryPersistenceAdapter();
    const service = new SocialFinanceCopilotService(store);

    const txn = await service.ingestNotification({
      deviceId: "device-a",
      sourceApp: "PhonePe",
      rawText: "Rs.40 paid to Rao's Cafe via UPI.",
      capturedAt: "2026-04-15T09:15:00.000Z",
    });

    await service.logSnap({
      deviceId: "device-a",
      transactionId: txn.transaction.id,
      photoRef: "media://test/snap.jpg",
      items: [{ name: "Coffee", pricePaise: 4000 }],
    });

    const entries = await service.listLedgerEntries("device-a");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.merchantLabel).toContain("Rao");
  });
});
