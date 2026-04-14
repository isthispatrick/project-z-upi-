import { describe, expect, it } from "vitest";
import { parseNotificationText } from "../src/domain/notifications/parser.js";

describe("parseNotificationText", () => {
  it("extracts amount, time, and VPA from a bank-style notification", () => {
    const parsed = parseNotificationText(
      "Rs.150 debited from a/c XX1234 via UPI to newcafe.blr@icici on 15-Apr-2026 14:30 Ref 903221",
      "PhonePe",
      "2026-04-15T14:31:00.000Z",
    );

    expect(parsed.amountPaise).toBe(15000);
    expect(parsed.merchantVpa).toBe("newcafe.blr@icici");
    expect(parsed.occurredAt).toBe("2026-04-15T14:30:00.000Z");
  });

  it("extracts a merchant label from a friendly app notification", () => {
    const parsed = parseNotificationText(
      "₹40 paid to Rao's Cafe via UPI.",
      "GPay",
      "2026-04-15T09:15:00.000Z",
    );

    expect(parsed.amountPaise).toBe(4000);
    expect(parsed.merchantLabel).toBe("Rao's Cafe");
  });
});
