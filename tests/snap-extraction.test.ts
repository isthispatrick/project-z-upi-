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

  it("parses OCR text into draft line items", () => {
    const result = extractSnapDraft({
      merchantLabel: "Tapri Junction",
      amountPaise: 11000,
      ocrText: "Masala Dosa Rs 60\nFilter Coffee Rs 50\nTOTAL Rs 110",
      ocrConfidence: 0.88,
    });

    expect(result.items).toEqual([
      { name: "Masala Dosa", pricePaise: 6000 },
      { name: "Filter Coffee", pricePaise: 5000 },
    ]);
    expect(result.notes).toContain("ocr-text-detected");
    expect(result.confidence).toBeGreaterThan(0.7);
  });
});
