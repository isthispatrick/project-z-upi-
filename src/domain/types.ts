export type ExpenseCategory =
  | "CAFE"
  | "FOOD_DELIVERY"
  | "TRAVEL"
  | "TRANSPORT"
  | "GROCERIES"
  | "ENTERTAINMENT"
  | "UTILITIES"
  | "UNCLASSIFIED";

export type TransactionSource = "notification" | "sms";

export type MerchantResolution = "known" | "seeded" | "new";

export interface GeoPoint {
  lat: number;
  lng: number;
  accuracyMeters?: number;
}

export interface ParsedNotification {
  sourceApp: string;
  rawText: string;
  amountPaise: number | null;
  occurredAt: string;
  merchantVpa?: string;
  merchantLabel?: string;
  confidence: number;
}

export interface Transaction {
  id: string;
  deviceId: string;
  source: TransactionSource;
  sourceApp: string;
  rawText: string;
  amountPaise: number | null;
  occurredAt: string;
  merchantVpa?: string;
  merchantLabel?: string;
  category: ExpenseCategory;
  merchantResolution: MerchantResolution;
  createdAt: string;
}

export interface MerchantProfile {
  vpa: string;
  displayName: string;
  categoryHint: ExpenseCategory;
  resolution: MerchantResolution;
  mappedFromCrowdCount: number;
  averageTicketSizePaise?: number;
  vibe?: string;
  locationName?: string;
  city?: string;
  gps?: GeoPoint;
  firstMappedAt?: string;
  lastSeenAt: string;
}

export interface LedgerItem {
  name: string;
  pricePaise: number;
}

export interface LedgerEntry {
  id: string;
  deviceId: string;
  transactionId: string;
  merchantVpa?: string;
  merchantLabel: string;
  category: ExpenseCategory;
  totalAmountPaise: number | null;
  items: LedgerItem[];
  photoRef: string;
  gps?: GeoPoint;
  createdAt: string;
}

export interface PromptCard {
  headline: string;
  subtext: string;
}

export interface SnapInput {
  deviceId: string;
  transactionId: string;
  photoRef: string;
  gps?: GeoPoint;
  locationName?: string;
  city?: string;
  items?: LedgerItem[];
  shareWith?: string[];
  ttlSeconds?: number;
}

export interface MediaUploadIntent {
  id: string;
  purpose: "SNAP" | "BOUNTY";
  fileName: string;
  mimeType: string;
  uploadUrl: string;
  mediaRef: string;
  status: "pending" | "uploaded";
  createdAt: string;
  uploadToken: string;
  storagePath: string;
}

export interface EphemeralShare {
  id: string;
  transactionId: string;
  mediaRef: string;
  recipients: string[];
  viewedBy: string[];
  expiresAt: string;
  status: "active" | "wiped";
  createdAt: string;
  wipedAt?: string;
}

export type BountyType = "MENU" | "QR_STAND";

export interface BountyAiSignals {
  qualityScore: number;
  duplicateLikely: boolean;
  detectedTargets: string[];
  textCoverage: number;
  fraudSignals?: string[];
}

export interface BountySubmission {
  id: string;
  merchantVpa: string;
  type: BountyType;
  photoRef: string;
  gps: GeoPoint;
  payoutPaise: number;
  status: "approved" | "rejected";
  reasons: string[];
  createdAt: string;
}

export interface DeviceProfile {
  id: string;
  platform: "ANDROID";
  label?: string;
  createdAt: string;
  lastSeenAt: string;
}
