import type { BountyAiSignals, BountyType } from "../types.js";

export interface BountyVerdict {
  status: "approved" | "rejected";
  payoutPaise: number;
  reasons: string[];
}

export function verifyBountySubmission(input: {
  type: BountyType;
  aiSignals: BountyAiSignals;
  duplicateCount: number;
  isFirstMapping: boolean;
}): BountyVerdict {
  const reasons: string[] = [];
  const { aiSignals } = input;

  if (aiSignals.qualityScore < 0.55) {
    reasons.push("image-quality-too-low");
  }

  if (aiSignals.duplicateLikely && input.duplicateCount > 0) {
    reasons.push("possible-duplicate-submission");
  }

  const targetKeyword = input.type === "MENU" ? "menu" : "qr";
  const targetDetected = aiSignals.detectedTargets.some((target) =>
    target.toLowerCase().includes(targetKeyword),
  );

  if (!targetDetected) {
    reasons.push("expected-target-not-detected");
  }

  if (aiSignals.textCoverage < 0.2 && input.type === "MENU") {
    reasons.push("menu-text-too-sparse");
  }

  if ((aiSignals.fraudSignals?.length ?? 0) > 0) {
    reasons.push(...(aiSignals.fraudSignals ?? []));
  }

  if (reasons.length > 0) {
    return {
      status: "rejected",
      payoutPaise: 0,
      reasons,
    };
  }

  const basePayout = input.type === "MENU" ? 100 : 150;
  const firstMappingBonus = input.isFirstMapping ? 50 : 0;

  return {
    status: "approved",
    payoutPaise: Math.min(200, basePayout + firstMappingBonus),
    reasons: ["eligible-for-micro-bounty"],
  };
}
