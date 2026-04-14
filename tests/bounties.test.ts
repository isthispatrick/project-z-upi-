import { describe, expect, it } from "vitest";
import { verifyBountySubmission } from "../src/domain/bounties/verification.js";

describe("verifyBountySubmission", () => {
  it("approves a strong first-time QR stand submission", () => {
    const verdict = verifyBountySubmission({
      type: "QR_STAND",
      duplicateCount: 0,
      isFirstMapping: true,
      aiSignals: {
        qualityScore: 0.91,
        duplicateLikely: false,
        detectedTargets: ["merchant qr stand", "branding"],
        textCoverage: 0.45,
      },
    });

    expect(verdict.status).toBe("approved");
    expect(verdict.payoutPaise).toBe(200);
  });

  it("rejects low-quality likely duplicates", () => {
    const verdict = verifyBountySubmission({
      type: "MENU",
      duplicateCount: 2,
      isFirstMapping: false,
      aiSignals: {
        qualityScore: 0.4,
        duplicateLikely: true,
        detectedTargets: ["blurry image"],
        textCoverage: 0.1,
      },
    });

    expect(verdict.status).toBe("rejected");
    expect(verdict.reasons).toContain("image-quality-too-low");
    expect(verdict.reasons).toContain("possible-duplicate-submission");
  });
});
