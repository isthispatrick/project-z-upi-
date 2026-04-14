import { getTransactionInfo } from "transaction-sms-parser";
import type { ParsedNotification } from "../types.js";

const amountPattern = /(?:₹|Rs\.?|INR)\s*([\d,]+(?:\.\d{1,2})?)/i;
const vpaPattern = /\b([a-z0-9][a-z0-9._-]{1,}@[a-z][a-z0-9.-]{1,})\b/i;

const monthMap: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

function parseAmountPaise(rawText: string): number | null {
  const match = rawText.match(amountPattern);
  if (!match) {
    return null;
  }

  const normalized = Number.parseFloat(match[1].replaceAll(",", ""));
  if (Number.isNaN(normalized)) {
    return null;
  }

  return Math.round(normalized * 100);
}

function parseOccurredAt(rawText: string, capturedAt: string): string {
  const explicitDate =
    rawText.match(
      /\b(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ,](\d{4})[ ,]+(\d{1,2}:\d{2})\b/i,
    ) ??
    rawText.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{4})[ ,]+(\d{1,2}:\d{2})\b/i);

  if (!explicitDate) {
    return new Date(capturedAt).toISOString();
  }

  const [_, a, b, year, time] = explicitDate;
  const [hours, minutes] = time.split(":").map((value) => Number.parseInt(value, 10));

  let monthIndex: number;
  let day: number;

  if (/^[A-Za-z]{3}$/i.test(b)) {
    monthIndex = monthMap[b.toLowerCase()];
    day = Number.parseInt(a, 10);
  } else {
    day = Number.parseInt(a, 10);
    monthIndex = Number.parseInt(b, 10) - 1;
  }

  if (Number.isNaN(day) || Number.isNaN(monthIndex) || Number.isNaN(hours) || Number.isNaN(minutes)) {
    return new Date(capturedAt).toISOString();
  }

  return new Date(Date.UTC(Number.parseInt(year, 10), monthIndex, day, hours, minutes)).toISOString();
}

function parseMerchantLabel(rawText: string, merchantVpa?: string): string | undefined {
  const patterns = [
    /paid to\s+(.+?)(?:\s+on\b|\s+via\b|\s+Ref\b|[.!]|$)/i,
    /spent at\s+(.+?)(?:\s+on\b|\s+Ref\b|[.!]|$)/i,
    /to\s+(.+?)(?:\s+on\b|\s+Ref\b|[.!]|$)/i,
  ];

  for (const pattern of patterns) {
    const match = rawText.match(pattern);
    if (!match) {
      continue;
    }

    const candidate = match[1].trim();
    if (merchantVpa && candidate.toLowerCase() === merchantVpa.toLowerCase()) {
      continue;
    }

    if (candidate.length > 1) {
      return candidate;
    }
  }

  return undefined;
}

function normalizeLibraryAmount(rawAmount: string | null): number | null {
  if (!rawAmount) {
    return null;
  }

  const numeric = Number.parseFloat(rawAmount.replace(/[^\d.]/g, ""));
  return Number.isNaN(numeric) ? null : Math.round(numeric * 100);
}

export function parseNotificationText(
  rawText: string,
  sourceApp: string,
  capturedAt: string,
): ParsedNotification {
  const libraryResult = getTransactionInfo(rawText);
  const merchantVpaMatch = rawText.match(vpaPattern);
  const merchantVpa = merchantVpaMatch?.[1]?.toLowerCase();
  const amountPaise = normalizeLibraryAmount(libraryResult.transaction.amount) ?? parseAmountPaise(rawText);
  const occurredAt = parseOccurredAt(rawText, capturedAt);
  const merchantLabel = libraryResult.transaction.merchant ?? parseMerchantLabel(rawText, merchantVpa);

  let confidence = 0.4;
  if (amountPaise !== null) {
    confidence += 0.3;
  }

  if (merchantVpa || merchantLabel) {
    confidence += 0.2;
  }

  if (occurredAt !== new Date(capturedAt).toISOString()) {
    confidence += 0.1;
  }

  return {
    sourceApp,
    rawText,
    amountPaise,
    occurredAt,
    merchantVpa,
    merchantLabel,
    confidence: Number(confidence.toFixed(2)),
  };
}
