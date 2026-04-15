import type {
  ExpenseCategory,
  GeoPoint,
  MerchantMemoryDecision,
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
    enrichmentState: "needs_enrichment",
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
    enrichmentState: "cached",
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
    enrichmentState: merchant.enrichmentState ?? "cached",
    lastSeenAt: now,
  };
}

export function buildMerchantMemoryDecision(merchant?: MerchantProfile): MerchantMemoryDecision {
  if (!merchant) {
    return {
      cacheStatus: "miss",
      promptMode: "needs_enrichment",
      shouldProcessMerchantAi: true,
      shouldRequestBounty: false,
      reason: "no-merchant-memory",
    };
  }

  const hasMappedLocation = Boolean(merchant.gps || merchant.locationName);
  const hasCacheableContext =
    merchant.resolution !== "new" ||
    hasMappedLocation ||
    merchant.mappedFromCrowdCount > 0 ||
    Boolean(merchant.averageTicketSizePaise);

  if (hasCacheableContext) {
    return {
      cacheStatus: "hit",
      promptMode: "cached_memory",
      shouldProcessMerchantAi: false,
      shouldRequestBounty: false,
      reason: "merchant-memory-hit",
    };
  }

  return {
    cacheStatus: "miss",
    promptMode: "needs_enrichment",
    shouldProcessMerchantAi: true,
    shouldRequestBounty: merchant.enrichmentState === "bounty_only",
    reason: merchant.enrichmentState === "bounty_only" ? "bounty-requested" : "new-vpa-needs-enrichment",
  };
}

function formatRupees(amountPaise: number | null): string {
  if (amountPaise === null) {
    return "A payment";
  }

  return `Rs.${(amountPaise / 100).toFixed(amountPaise % 100 === 0 ? 0 : 2)}`;
}

export function buildSnapPrompt(input: {
  amountPaise: number | null;
  category: ExpenseCategory;
  merchant?: MerchantProfile;
  memoryDecision?: MerchantMemoryDecision;
}): PromptCard {
  const amount = formatRupees(input.amountPaise);
  const merchant = input.merchant;
  const memoryDecision = input.memoryDecision;

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

  if (memoryDecision?.promptMode === "cached_memory" && merchant) {
    return {
      headline: `${amount} hit ${merchant.displayName}.`,
      subtext: "Using cached merchant memory for this repeat stop. Snap only if you want fresh item detail.",
    };
  }

  return {
    headline: `${amount} just moved.`,
    subtext:
      memoryDecision?.shouldRequestBounty
        ? "Snap a menu or QR stand if you want to help map this merchant faster."
        : "Snap what you bought so we can learn the merchant and auto-fill your ledger.",
  };
}
