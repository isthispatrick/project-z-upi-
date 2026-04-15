import { describe, expect, it } from "vitest";
import { extractSnapDraft } from "../src/domain/vision/extraction.js";

describe("extractSnapDraft", () => {
  it("returns a cafe-flavored fallback for cafe merchants", async () => {
    const result = await extractSnapDraft({
      merchantLabel: "Rao's Cafe",
      amountPaise: 4000,
    });

    expect(result.items[0]?.name).toBe("Coffee");
    expect(result.items[0]?.pricePaise).toBe(4000);
  });

  it("falls back to a generic draft when merchant context is weak", async () => {
    const result = await extractSnapDraft({
      merchantLabel: "Unknown Merchant",
      amountPaise: 9900,
    });

    expect(result.items[0]?.name).toBe("Scanned purchase");
  });

  it("keeps transport fallback simple when vision is unavailable", async () => {
    const result = await extractSnapDraft({
      merchantLabel: "Uber Auto",
      amountPaise: 11000,
    });

    expect(result.items).toEqual([{ name: "Ride fare", pricePaise: 11000 }]);
    expect(result.notes[0]).toContain("heuristic");
  });
});
