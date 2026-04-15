import { createWorker } from "tesseract.js";
import type { LedgerItem } from "../types.js";

export interface SnapExtractionResult {
  items: LedgerItem[];
  confidence: number;
  notes: string[];
}

export interface OcrScanResult {
  text: string;
  confidence: number;
  notes: string[];
}

export function extractSnapDraft(input: {
  merchantLabel?: string;
  amountPaise?: number | null;
  ocrText?: string;
  ocrConfidence?: number;
}): SnapExtractionResult {
  const label = input.merchantLabel?.toLowerCase() ?? "";
  const amountPaise = input.amountPaise ?? null;
  const ocrText = normalizeOcrText(input.ocrText);
  const ocrItems = ocrText ? extractItemsFromOcrText(ocrText) : [];

  if (ocrItems.length > 0) {
    return {
      items: rebalanceItems(ocrItems, amountPaise),
      confidence: mergeConfidence(input.ocrConfidence ?? 0.65, ocrItems.length),
      notes: ["ocr-text-detected", `ocr-items:${ocrItems.length}`],
    };
  }

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

export async function scanTextFromImage(filePath: string): Promise<OcrScanResult> {
  const worker = await createWorker("eng");

  try {
    const result = await worker.recognize(filePath);
    return {
      text: normalizeOcrText(result.data.text),
      confidence: clampConfidence(result.data.confidence / 100),
      notes: ["tesseract-eng"],
    };
  } finally {
    await worker.terminate();
  }
}

function normalizeOcrText(text?: string): string {
  return (text ?? "")
    .replace(/\r/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .trim();
}

function extractItemsFromOcrText(text: string): LedgerItem[] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const items: LedgerItem[] = [];

  for (const line of lines) {
    if (isSummaryLine(line)) {
      continue;
    }

    const amount = extractAmountPaise(line);
    if (amount === null) {
      continue;
    }

    const name = cleanItemName(line);
    if (!name || name.length < 2) {
      continue;
    }

    items.push({
      name,
      pricePaise: amount,
    });
  }

  return dedupeItems(items).slice(0, 6);
}

function isSummaryLine(line: string): boolean {
  return /\b(total|subtotal|grand total|amount paid|upi|txn|ref|balance|cgst|sgst|igst|tax)\b/i.test(line);
}

function extractAmountPaise(line: string): number | null {
  const currencyMatch =
    line.match(/(?:rs\.?|inr|\u20B9)\s*([0-9]+(?:[.,][0-9]{1,2})?)/i) ??
    line.match(/\b([0-9]+(?:[.,][0-9]{1,2})?)\s*(?:rs\.?|inr|\u20B9)\b/i) ??
    line.match(/([0-9]+(?:[.,][0-9]{1,2})?)\s*$/);

  if (!currencyMatch?.[1]) {
    return null;
  }

  const normalized = Number.parseFloat(currencyMatch[1].replace(/,/g, ""));
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return null;
  }

  if (normalized >= 10000) {
    return null;
  }

  return Math.round(normalized * 100);
}

function cleanItemName(line: string): string {
  return line
    .replace(/(?:rs\.?|inr|\u20B9)\s*[0-9]+(?:[.,][0-9]{1,2})?/gi, "")
    .replace(/[0-9]+(?:[.,][0-9]{1,2})?\s*(?:rs\.?|inr|\u20B9)/gi, "")
    .replace(/[0-9]+(?:[.,][0-9]{1,2})?\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[^a-zA-Z]+|[^a-zA-Z]+$/g, "")
    .trim();
}

function dedupeItems(items: LedgerItem[]): LedgerItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.name.toLowerCase()}::${item.pricePaise}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function rebalanceItems(items: LedgerItem[], amountPaise: number | null): LedgerItem[] {
  if (amountPaise === null) {
    return items;
  }

  const total = items.reduce((sum, item) => sum + item.pricePaise, 0);
  if (total === amountPaise || total === 0) {
    return items;
  }

  if (items.length === 1) {
    return [{ ...items[0], pricePaise: amountPaise }];
  }

  if (Math.abs(total - amountPaise) <= 500) {
    const adjusted = [...items];
    adjusted[adjusted.length - 1] = {
      ...adjusted[adjusted.length - 1],
      pricePaise: Math.max(0, adjusted[adjusted.length - 1].pricePaise + (amountPaise - total)),
    };
    return adjusted;
  }

  return items;
}

function mergeConfidence(baseConfidence: number, itemCount: number): number {
  return clampConfidence(baseConfidence * 0.7 + Math.min(itemCount, 3) * 0.1);
}

function clampConfidence(value: number): number {
  return Math.max(0.2, Math.min(0.95, Number(value.toFixed(2))));
}
