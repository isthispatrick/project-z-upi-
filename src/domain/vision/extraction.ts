import type { LedgerItem } from "../types.js";

export interface SnapExtractionResult {
  items: LedgerItem[];
  confidence: number;
  notes: string[];
}

export function extractSnapDraft(input: {
  merchantLabel?: string;
  amountPaise?: number | null;
}): SnapExtractionResult {
  const label = input.merchantLabel?.toLowerCase() ?? "";
  const amountPaise = input.amountPaise ?? null;

  if (label.includes("cafe") || label.includes("coffee") || label.includes("tapri")) {
    return {
      items: [
        {
          name: "Coffee",
          pricePaise: amountPaise ?? 0,
        },
      ],
      confidence: 0.52,
      notes: ["heuristic-cafe-default"],
    };
  }

  if (label.includes("uber") || label.includes("ola") || label.includes("rapido")) {
    return {
      items: [
        {
          name: "Ride fare",
          pricePaise: amountPaise ?? 0,
        },
      ],
      confidence: 0.65,
      notes: ["heuristic-transport-default"],
    };
  }

  return {
    items: [
      {
        name: "Scanned purchase",
        pricePaise: amountPaise ?? 0,
      },
    ],
    confidence: 0.3,
    notes: ["generic-fallback"],
  };
}
