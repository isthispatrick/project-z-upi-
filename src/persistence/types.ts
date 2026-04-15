import type {
  BountySubmission,
  DeviceProfile,
  EphemeralShare,
  FriendLink,
  LedgerEntry,
  MediaUploadIntent,
  MerchantProfile,
  Transaction,
  UserProfile,
} from "../domain/types.js";

export interface PersistenceAdapter {
  initialize(): Promise<void>;
  getTransaction(id: string): Promise<Transaction | undefined>;
  saveTransaction(transaction: Transaction): Promise<void>;
  getDevice(id: string): Promise<DeviceProfile | undefined>;
  saveDevice(device: DeviceProfile): Promise<void>;
  getUser(id: string): Promise<UserProfile | undefined>;
  findUserByProvider(provider: UserProfile["authProvider"], providerUserId: string): Promise<UserProfile | undefined>;
  saveUser(user: UserProfile): Promise<void>;
  addFriendLink(link: FriendLink): Promise<void>;
  listFriendLinks(userId: string): Promise<FriendLink[]>;
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
