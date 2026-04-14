import type {
  BountySubmission,
  DeviceProfile,
  EphemeralShare,
  LedgerEntry,
  MediaUploadIntent,
  MerchantProfile,
  Transaction,
} from "../domain/types.js";
import type { PersistenceAdapter } from "./types.js";

export class MemoryPersistenceAdapter implements PersistenceAdapter {
  readonly transactions = new Map<string, Transaction>();
  readonly devices = new Map<string, DeviceProfile>();
  readonly merchants = new Map<string, MerchantProfile>();
  readonly ledgerEntries = new Map<string, LedgerEntry>();
  readonly shares = new Map<string, EphemeralShare>();
  readonly bounties = new Map<string, BountySubmission>();
  readonly mediaUploadIntents = new Map<string, MediaUploadIntent>();

  async initialize(): Promise<void> {}

  async getTransaction(id: string): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async saveTransaction(transaction: Transaction): Promise<void> {
    this.transactions.set(transaction.id, transaction);
  }

  async getDevice(id: string): Promise<DeviceProfile | undefined> {
    return this.devices.get(id);
  }

  async saveDevice(device: DeviceProfile): Promise<void> {
    this.devices.set(device.id, device);
  }

  async getMerchant(vpa: string): Promise<MerchantProfile | undefined> {
    return this.merchants.get(vpa);
  }

  async saveMerchant(merchant: MerchantProfile): Promise<void> {
    this.merchants.set(merchant.vpa, merchant);
  }

  async listMerchants(): Promise<MerchantProfile[]> {
    return [...this.merchants.values()];
  }

  async getShare(id: string): Promise<EphemeralShare | undefined> {
    return this.shares.get(id);
  }

  async saveShare(share: EphemeralShare): Promise<void> {
    this.shares.set(share.id, share);
  }

  async listLedgerEntriesByDevice(deviceId: string): Promise<LedgerEntry[]> {
    return [...this.ledgerEntries.values()].filter((entry) => entry.deviceId === deviceId);
  }

  async saveLedgerEntry(entry: LedgerEntry): Promise<void> {
    this.ledgerEntries.set(entry.id, entry);
  }

  async saveBounty(bounty: BountySubmission): Promise<void> {
    this.bounties.set(bounty.id, bounty);
  }

  async countBountiesForMerchant(merchantVpa: string, type: BountySubmission["type"]): Promise<number> {
    return [...this.bounties.values()].filter(
      (submission) => submission.merchantVpa === merchantVpa && submission.type === type,
    ).length;
  }

  async getMediaUploadIntent(id: string): Promise<MediaUploadIntent | undefined> {
    return this.mediaUploadIntents.get(id);
  }

  async saveMediaUploadIntent(intent: MediaUploadIntent): Promise<void> {
    this.mediaUploadIntents.set(intent.id, intent);
  }
}
