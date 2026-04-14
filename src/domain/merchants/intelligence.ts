import type {
  ExpenseCategory,
  GeoPoint,
  MerchantProfile,
  ParsedNotification,
  PromptCard,
} from "../types.js";

const CATEGORY_RULES: Array<{ pattern: RegExp; category: ExpenseCategory }> = [
  { pattern: /@(swiggy|zomato)\b/i, category: "FOOD_DELIVERY" },
  { pattern: /\birctc@/i, category: "TRAVEL" },
  { pattern: /(@(uber|ola|rapido)\b|\b(uber|ola|rapido)@)/i, category: "TRANSPORT" },
  { pattern: /\b(cafe|coffee|tapri|tea)\b/i, category: "CAFE" },
  { pattern: /\b(store|mart|grocery|kirana)\b/i, category: "GROCERIES" },
  { pattern: /\b(recharge|electricity|bescom|utility)\b/i, category: "UTILITIES" },
];

function titleCase(input: string): string {
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(" ");
}

export function categorizePayment(input: {
  merchantVpa?: string;
  merchantLabel?: string;
  rawText?: string;
}): ExpenseCategory {
  const haystack = [input.merchantVpa, input.merchantLabel, input.rawText].filter(Boolean).join(" ");

  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(haystack)) {
      return rule.category;
    }
  }

  return "UNCLASSIFIED";
}

export function humanizeMerchantHandle(vpa?: string, label?: string): string {
  if (label) {
    return label;
  }

  if (!vpa) {
    return "Unknown Merchant";
  }

  const localPart = vpa.split("@")[0] ?? vpa;
  return titleCase(localPart.replaceAll(/[._-]+/g, " "));
}

export function resolveMerchantProfile(
  parsed: ParsedNotification,
  merchants: Map<string, MerchantProfile>,
): MerchantProfile | undefined {
  if (!parsed.merchantVpa) {
    return undefined;
  }

  const known = merchants.get(parsed.merchantVpa);
  if (known) {
    return known;
  }

  const now = new Date().toISOString();
  const placeholder: MerchantProfile = {
    vpa: parsed.merchantVpa,
    displayName: humanizeMerchantHandle(parsed.merchantVpa, parsed.merchantLabel),
    categoryHint: categorizePayment(parsed),
    resolution: "new",
    mappedFromCrowdCount: 0,
    lastSeenAt: now,
  };

  merchants.set(placeholder.vpa, placeholder);
  return placeholder;
}

export function updateMerchantLocation(
  merchant: MerchantProfile,
  gps: GeoPoint,
  locationName?: string,
  city?: string,
): MerchantProfile {
  const now = new Date().toISOString();

  return {
    ...merchant,
    gps,
    locationName: locationName ?? merchant.locationName,
    city: city ?? merchant.city,
    firstMappedAt: merchant.firstMappedAt ?? now,
    mappedFromCrowdCount: merchant.mappedFromCrowdCount + 1,
    lastSeenAt: now,
  };
}

export function updateAverageTicketSize(
  merchant: MerchantProfile,
  amountPaise: number,
): MerchantProfile {
  const now = new Date().toISOString();

  if (!merchant.averageTicketSizePaise) {
    return {
      ...merchant,
      averageTicketSizePaise: amountPaise,
      lastSeenAt: now,
    };
  }

  const nextAverage = Math.round((merchant.averageTicketSizePaise + amountPaise) / 2);
  return {
    ...merchant,
    averageTicketSizePaise: nextAverage,
    lastSeenAt: now,
  };
}

function formatRupees(amountPaise: number | null): string {
  if (amountPaise === null) {
    return "A payment";
  }

  return `₹${(amountPaise / 100).toFixed(amountPaise % 100 === 0 ? 0 : 2)}`;
}

export function buildSnapPrompt(input: {
  amountPaise: number | null;
  category: ExpenseCategory;
  merchant?: MerchantProfile;
}): PromptCard {
  const amount = formatRupees(input.amountPaise);
  const merchant = input.merchant;

  if (merchant?.locationName) {
    return {
      headline: `${amount} dropped at ${merchant.displayName}.`,
      subtext: `You're back near ${merchant.locationName}. Snap the order and keep the ledger sharp.`,
    };
  }

  if (input.category === "FOOD_DELIVERY") {
    return {
      headline: `${amount} hit food delivery.`,
      subtext: "Snap the meal and let the copilot log the order details for you.",
    };
  }

  return {
    headline: `${amount} just moved.`,
    subtext: "Snap what you bought so we can learn the merchant and auto-fill your ledger.",
  };
}
