import { describe, expect, it } from "vitest";
import {
  buildSnapPrompt,
  categorizePayment,
} from "../src/domain/merchants/intelligence.js";

describe("merchant intelligence", () => {
  it("categorizes known VPA rails", () => {
    expect(categorizePayment({ merchantVpa: "order@swiggy" })).toBe("FOOD_DELIVERY");
    expect(categorizePayment({ merchantVpa: "ride@uber" })).toBe("TRANSPORT");
    expect(categorizePayment({ merchantVpa: "irctc@axisbank" })).toBe("TRAVEL");
  });

  it("builds a contextual snap prompt for a known mapped merchant", () => {
    const prompt = buildSnapPrompt({
      amountPaise: 4000,
      category: "CAFE",
      merchant: {
        vpa: "tapri123@paytm",
        displayName: "Indiranagar Tapri",
        categoryHint: "CAFE",
        resolution: "known",
        mappedFromCrowdCount: 3,
        lastSeenAt: "2026-04-15T10:00:00.000Z",
        locationName: "12th Main, Indiranagar",
      },
    });

    expect(prompt.headline).toContain("₹40");
    expect(prompt.subtext).toContain("Indiranagar");
  });
});
