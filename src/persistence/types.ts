import type {
  BountySubmission,
  DeviceProfile,
  EphemeralShare,
  LedgerEntry,
  MediaUploadIntent,
  MerchantProfile,
  Transaction,
} from "../domain/types.js";

export interface PersistenceAdapter {
  initialize(): Promise<void>;
  getTransaction(id: string): Promise<Transaction | undefined>;
  saveTransaction(transaction: Transaction): Promise<void>;
  getDevice(id: string): Promise<DeviceProfile | undefined>;
  saveDevice(device: DeviceProfile): Promise<void>;
  getMerchant(vpa: string): Promise<MerchantProfile | undefined>;
  saveMerchant(merchant: MerchantProfile): Promise<void>;
  listMerchants(): Promise<MerchantProfile[]>;
  getShare(id: string): Promise<EphemeralShare | undefined>;
  saveShare(share: EphemeralShare): Promise<void>;
  listLedgerEntriesByDevice(deviceId: string): Promise<LedgerEntry[]>;
  saveLedgerEntry(entry: LedgerEntry): Promise<void>;
  saveBounty(bounty: BountySubmission): Promise<void>;
  countBountiesForMerchant(merchantVpa: string, type: BountySubmission["type"]): Promise<number>;
  getMediaUploadIntent(id: string): Promise<MediaUploadIntent | undefined>;
  saveMediaUploadIntent(intent: MediaUploadIntent): Promise<void>;
}
