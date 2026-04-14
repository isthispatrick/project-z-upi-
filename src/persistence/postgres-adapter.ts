import { Client } from "pg";
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

export class PostgresPersistenceAdapter implements PersistenceAdapter {
  constructor(private readonly client: Client) {}

  async initialize(): Promise<void> {
    await this.client.connect();
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        payload JSONB NOT NULL
      );
      CREATE TABLE IF NOT EXISTS merchants (
        id TEXT PRIMARY KEY,
        payload JSONB NOT NULL
      );
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        payload JSONB NOT NULL
      );
      CREATE TABLE IF NOT EXISTS shares (
        id TEXT PRIMARY KEY,
        payload JSONB NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ledger_entries (
        id TEXT PRIMARY KEY,
        payload JSONB NOT NULL
      );
      CREATE TABLE IF NOT EXISTS bounties (
        id TEXT PRIMARY KEY,
        payload JSONB NOT NULL
      );
      CREATE TABLE IF NOT EXISTS media_upload_intents (
        id TEXT PRIMARY KEY,
        payload JSONB NOT NULL
      );
    `);
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    return this.getById<Transaction>("transactions", id);
  }

  async saveTransaction(transaction: Transaction): Promise<void> {
    await this.upsert("transactions", transaction.id, transaction);
  }

  async getDevice(id: string): Promise<DeviceProfile | undefined> {
    return this.getById<DeviceProfile>("devices", id);
  }

  async saveDevice(device: DeviceProfile): Promise<void> {
    await this.upsert("devices", device.id, device);
  }

  async getMerchant(vpa: string): Promise<MerchantProfile | undefined> {
    return this.getById<MerchantProfile>("merchants", vpa);
  }

  async saveMerchant(merchant: MerchantProfile): Promise<void> {
    await this.upsert("merchants", merchant.vpa, merchant);
  }

  async listMerchants(): Promise<MerchantProfile[]> {
    const result = await this.client.query("SELECT payload FROM merchants");
    return result.rows.map((row: { payload: MerchantProfile }) => row.payload);
  }

  async getShare(id: string): Promise<EphemeralShare | undefined> {
    return this.getById<EphemeralShare>("shares", id);
  }

  async saveShare(share: EphemeralShare): Promise<void> {
    await this.upsert("shares", share.id, share);
  }

  async listLedgerEntriesByDevice(deviceId: string): Promise<LedgerEntry[]> {
    const result = await this.client.query(
      "SELECT payload FROM ledger_entries WHERE payload->>'deviceId' = $1 ORDER BY payload->>'createdAt' DESC",
      [deviceId],
    );
    return result.rows.map((row: { payload: LedgerEntry }) => row.payload);
  }

  async saveLedgerEntry(entry: LedgerEntry): Promise<void> {
    await this.upsert("ledger_entries", entry.id, entry);
  }

  async saveBounty(bounty: BountySubmission): Promise<void> {
    await this.upsert("bounties", bounty.id, bounty);
  }

  async countBountiesForMerchant(merchantVpa: string, type: BountySubmission["type"]): Promise<number> {
    const result = await this.client.query(
      "SELECT COUNT(*)::int AS count FROM bounties WHERE payload->>'merchantVpa' = $1 AND payload->>'type' = $2",
      [merchantVpa, type],
    );
    return result.rows[0]?.count ?? 0;
  }

  async getMediaUploadIntent(id: string): Promise<MediaUploadIntent | undefined> {
    return this.getById<MediaUploadIntent>("media_upload_intents", id);
  }

  async saveMediaUploadIntent(intent: MediaUploadIntent): Promise<void> {
    await this.upsert("media_upload_intents", intent.id, intent);
  }

  private async getById<T>(table: string, id: string): Promise<T | undefined> {
    const result = await this.client.query(`SELECT payload FROM ${table} WHERE id = $1`, [id]);
    return result.rows[0]?.payload as T | undefined;
  }

  private async upsert(table: string, id: string, payload: unknown): Promise<void> {
    await this.client.query(
      `INSERT INTO ${table} (id, payload) VALUES ($1, $2::jsonb)
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload`,
      [id, JSON.stringify(payload)],
    );
  }
}
