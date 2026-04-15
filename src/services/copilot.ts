import type {
  BountyAiSignals,
  BountySubmission,
  DeviceProfile,
  ExpenseCategory,
  LedgerEntry,
  MerchantMemoryDecision,
  MerchantProfile,
  ParsedNotification,
  SnapInput,
  Transaction,
  UserProfile,
} from "../domain/types.js";
import { verifyBountySubmission } from "../domain/bounties/verification.js";
import { createMediaUploadIntent } from "../domain/media/upload.js";
import {
  buildMerchantMemoryDecision,
  buildSnapPrompt,
  categorizePayment,
  humanizeMerchantHandle,
  updateAverageTicketSize,
  updateMerchantLocation,
} from "../domain/merchants/intelligence.js";
import { parseNotificationText } from "../domain/notifications/parser.js";
import { createEphemeralShare, markShareViewed } from "../domain/social/ephemeral.js";
import { extractSnapDraft } from "../domain/vision/extraction.js";
import { createId } from "../lib/id.js";
import { hasUploadedMedia } from "../lib/media-storage.js";
import type { PersistenceAdapter } from "../persistence/types.js";
import type { VerifiedGoogleUser } from "./google-auth.js";

export class SocialFinanceCopilotService {
  constructor(private readonly store: PersistenceAdapter) {}

  async ingestNotification(input: {
    deviceId: string;
    sourceApp: string;
    rawText: string;
    capturedAt?: string;
  }): Promise<{
    parsed: ParsedNotification;
    transaction: Transaction;
    merchant?: MerchantProfile;
    memory: MerchantMemoryDecision;
    prompt: ReturnType<typeof buildSnapPrompt>;
  }> {
    const capturedAt = input.capturedAt ?? new Date().toISOString();
    await this.touchDevice(input.deviceId);
    const parsed = parseNotificationText(input.rawText, input.sourceApp, capturedAt);
    const merchant = await this.resolveMerchantProfile(parsed);
    const memory = buildMerchantMemoryDecision(merchant);
    const inferredCategory = categorizePayment(parsed);
    const category =
      inferredCategory === "UNCLASSIFIED" ? merchant?.categoryHint ?? inferredCategory : inferredCategory;

    const transaction: Transaction = {
      id: createId("txn"),
      deviceId: input.deviceId,
      source: "notification",
      sourceApp: input.sourceApp,
      rawText: input.rawText,
      amountPaise: parsed.amountPaise,
      occurredAt: parsed.occurredAt,
      merchantVpa: parsed.merchantVpa,
      merchantLabel: merchant?.displayName ?? parsed.merchantLabel,
      category,
      merchantResolution: merchant?.resolution ?? "new",
      createdAt: new Date().toISOString(),
    };

    await this.store.saveTransaction(transaction);

    const prompt = buildSnapPrompt({
      amountPaise: transaction.amountPaise,
      category,
      merchant,
      memoryDecision: memory,
    });

    return {
      parsed,
      transaction,
      merchant,
      memory,
      prompt,
    };
  }

  async logSnap(input: SnapInput): Promise<{
    ledgerEntry: LedgerEntry;
    merchant?: MerchantProfile;
    shareId?: string;
  }> {
    const transaction = await this.store.getTransaction(input.transactionId);
    if (!transaction) {
      throw new Error("Transaction not found");
    }

    let merchant = transaction.merchantVpa
      ? await this.store.getMerchant(transaction.merchantVpa)
      : undefined;

    if (merchant && input.gps) {
      merchant = updateMerchantLocation(merchant, input.gps, input.locationName, input.city);
      await this.store.saveMerchant(merchant);
    }

    if (merchant && transaction.amountPaise !== null) {
      merchant = updateAverageTicketSize(merchant, transaction.amountPaise);
      await this.store.saveMerchant(merchant);
    }

    const entry: LedgerEntry = {
      id: createId("ledger"),
      deviceId: input.deviceId,
      transactionId: transaction.id,
      merchantVpa: transaction.merchantVpa,
      merchantLabel:
        merchant?.displayName ??
        transaction.merchantLabel ??
        humanizeMerchantHandle(transaction.merchantVpa, transaction.merchantLabel),
      category: this.resolveLedgerCategory(transaction.category, input.items),
      totalAmountPaise: transaction.amountPaise,
      items: input.items ?? [],
      photoRef: input.photoRef,
      gps: input.gps,
      createdAt: new Date().toISOString(),
    };

    await this.store.saveLedgerEntry(entry);

    let shareId: string | undefined;
    if (input.shareWith && input.shareWith.length > 0) {
      const share = createEphemeralShare({
        transactionId: transaction.id,
        mediaRef: input.photoRef,
        recipients: input.shareWith,
        ttlSeconds: input.ttlSeconds,
      });

      await this.store.saveShare(share);
      shareId = share.id;
    }

    return {
      ledgerEntry: entry,
      merchant,
      shareId,
    };
  }

  async viewShare(shareId: string, viewerId: string) {
    const share = await this.store.getShare(shareId);
    if (!share) {
      throw new Error("Share not found");
    }

    const updated = markShareViewed(share, viewerId);
    await this.store.saveShare(updated);
    return updated;
  }

  async submitBounty(input: {
    merchantVpa: string;
    type: "MENU" | "QR_STAND";
    photoRef: string;
    gps: { lat: number; lng: number; accuracyMeters?: number };
    aiSignals: BountyAiSignals;
    locationName?: string;
    city?: string;
  }): Promise<{
    submission: BountySubmission;
    merchant?: MerchantProfile;
  }> {
    const duplicateCount = await this.store.countBountiesForMerchant(input.merchantVpa, input.type);

    const merchant = await this.store.getMerchant(input.merchantVpa);
    const verdict = verifyBountySubmission({
      type: input.type,
      aiSignals: input.aiSignals,
      duplicateCount,
      isFirstMapping: !merchant?.gps,
    });

    const submission: BountySubmission = {
      id: createId("bounty"),
      merchantVpa: input.merchantVpa,
      type: input.type,
      photoRef: input.photoRef,
      gps: input.gps,
      payoutPaise: verdict.payoutPaise,
      status: verdict.status,
      reasons: verdict.reasons,
      createdAt: new Date().toISOString(),
    };

    await this.store.saveBounty(submission);

    let updatedMerchant = merchant;
    if (merchant && verdict.status === "approved" && !merchant.gps) {
      updatedMerchant = updateMerchantLocation(merchant, input.gps, input.locationName, input.city);
      await this.store.saveMerchant(updatedMerchant);
    }

    return {
      submission,
      merchant: updatedMerchant,
    };
  }

  lookupMerchant(vpa: string): Promise<MerchantProfile | undefined> {
    return this.store.getMerchant(vpa.toLowerCase());
  }

  async registerDevice(input: { deviceId: string; platform: "ANDROID"; label?: string }): Promise<DeviceProfile> {
    const now = new Date().toISOString();
    const existing = await this.store.getDevice(input.deviceId);
    const updated: DeviceProfile = existing
      ? { ...existing, label: input.label ?? existing.label, lastSeenAt: now }
      : {
          id: input.deviceId,
          platform: input.platform,
          label: input.label,
          createdAt: now,
          lastSeenAt: now,
        };

    await this.store.saveDevice(updated);
    return updated;
  }

  listLedgerEntries(deviceId: string) {
    return this.store.listLedgerEntriesByDevice(deviceId);
  }

  async signInWithGoogle(input: {
    deviceId: string;
    verifiedUser: VerifiedGoogleUser;
  }): Promise<{ user: UserProfile; device: DeviceProfile }> {
    const now = new Date().toISOString();
    const existingUser = await this.store.findUserByProvider("GOOGLE", input.verifiedUser.providerUserId);
    const user: UserProfile = existingUser
      ? {
          ...existingUser,
          email: input.verifiedUser.email,
          displayName: input.verifiedUser.displayName,
          photoUrl: input.verifiedUser.photoUrl,
          lastSeenAt: now,
        }
      : {
          id: createId("user"),
          email: input.verifiedUser.email,
          displayName: input.verifiedUser.displayName,
          photoUrl: input.verifiedUser.photoUrl,
          authProvider: "GOOGLE",
          providerUserId: input.verifiedUser.providerUserId,
          createdAt: now,
          lastSeenAt: now,
        };

    await this.store.saveUser(user);

    const existingDevice = await this.store.getDevice(input.deviceId);
    const device: DeviceProfile = existingDevice
      ? { ...existingDevice, userId: user.id, lastSeenAt: now }
      : {
          id: input.deviceId,
          platform: "ANDROID",
          userId: user.id,
          createdAt: now,
          lastSeenAt: now,
        };

    await this.store.saveDevice(device);
    return { user, device };
  }

  getShare(shareId: string) {
    return this.store.getShare(shareId);
  }

  async createUploadIntent(input: {
    purpose: "SNAP" | "BOUNTY";
    fileName: string;
    mimeType: string;
  }) {
    const intent = createMediaUploadIntent(input);
    await this.store.saveMediaUploadIntent(intent);
    return intent;
  }

  async confirmUploadIntent(uploadIntentId: string) {
    const existing = await this.store.getMediaUploadIntent(uploadIntentId);
    if (!existing) {
      throw new Error("Upload intent not found");
    }

    const uploaded = await hasUploadedMedia(existing.storagePath);
    if (!uploaded) {
      throw new Error("Upload content not found");
    }

    const updated = {
      ...existing,
      status: "uploaded" as const,
    };

    await this.store.saveMediaUploadIntent(updated);
    return updated;
  }

  getUploadIntent(uploadIntentId: string) {
    return this.store.getMediaUploadIntent(uploadIntentId);
  }

  async extractSnapData(input: {
    mediaRef: string;
    merchantLabel?: string;
    amountPaise?: number | null;
  }) {
    const uploadIntentId = this.extractUploadIntentId(input.mediaRef);
    const uploadIntent = uploadIntentId ? await this.store.getMediaUploadIntent(uploadIntentId) : undefined;

    if (uploadIntent && uploadIntent.status === "uploaded") {
      const uploaded = await hasUploadedMedia(uploadIntent.storagePath);
      if (uploaded) {
        return extractSnapDraft({
          filePath: uploadIntent.storagePath,
          merchantLabel: input.merchantLabel,
          amountPaise: input.amountPaise,
        });
      }
    }

    return extractSnapDraft({
      merchantLabel: input.merchantLabel,
      amountPaise: input.amountPaise,
    });
  }

  private async resolveMerchantProfile(parsed: ParsedNotification): Promise<MerchantProfile | undefined> {
    if (!parsed.merchantVpa) {
      return undefined;
    }

    const known = await this.store.getMerchant(parsed.merchantVpa);
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

    await this.store.saveMerchant(placeholder);
    return placeholder;
  }

  private async touchDevice(deviceId: string): Promise<void> {
    const existing = await this.store.getDevice(deviceId);
    const now = new Date().toISOString();

    if (!existing) {
      await this.store.saveDevice({
        id: deviceId,
        platform: "ANDROID",
        createdAt: now,
        lastSeenAt: now,
      });
      return;
    }

    await this.store.saveDevice({
      ...existing,
      lastSeenAt: now,
    });
  }

  private resolveLedgerCategory(
    fallback: ExpenseCategory,
    items?: Array<{ name: string }>,
  ): ExpenseCategory {
    if (items && items.some((item) => /coffee|tea|chai|sandwich|snack/i.test(item.name))) {
      return "CAFE";
    }

    return fallback;
  }

  private extractUploadIntentId(mediaRef: string): string | undefined {
    const matched = /^media:\/\/([^/]+)\//.exec(mediaRef);
    return matched?.[1];
  }
}
