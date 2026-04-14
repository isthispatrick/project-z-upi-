import { describe, expect, it } from "vitest";
import { extractSnapDraft } from "../src/domain/vision/extraction.js";

describe("extractSnapDraft", () => {
  it("returns a cafe-flavored draft for cafe merchants", () => {
    const result = extractSnapDraft({
      merchantLabel: "Rao's Cafe",
      amountPaise: 4000,
    });

    expect(result.items[0]?.name).toBe("Coffee");
    expect(result.items[0]?.pricePaise).toBe(4000);
  });

  it("falls back to a generic draft when merchant context is weak", () => {
    const result = extractSnapDraft({
      merchantLabel: "Unknown Merchant",
      amountPaise: 9900,
    });

    expect(result.items[0]?.name).toBe("Scanned purchase");
  });
});
