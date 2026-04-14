import { Client } from "pg";
import { loadEnv } from "../config/env.js";
import type { MerchantProfile } from "../domain/types.js";
import { MemoryPersistenceAdapter } from "./memory-adapter.js";
import { PostgresPersistenceAdapter } from "./postgres-adapter.js";
import type { PersistenceAdapter } from "./types.js";

const seededAt = new Date("2026-04-01T10:00:00.000Z").toISOString();

export const seededMerchants: MerchantProfile[] = [
  {
    vpa: "tapri123@paytm",
    displayName: "Indiranagar Tapri",
    categoryHint: "CAFE",
    resolution: "seeded",
    mappedFromCrowdCount: 11,
    averageTicketSizePaise: 4500,
    vibe: "late-night chai stop",
    locationName: "12th Main, Indiranagar",
    city: "Bengaluru",
    gps: { lat: 12.9719, lng: 77.6412, accuracyMeters: 18 },
    firstMappedAt: seededAt,
    lastSeenAt: seededAt,
  },
  {
    vpa: "newcafe.blr@icici",
    displayName: "New Cafe",
    categoryHint: "CAFE",
    resolution: "seeded",
    mappedFromCrowdCount: 4,
    averageTicketSizePaise: 15000,
    vibe: "work-friendly coffee bar",
    locationName: "Koramangala 5th Block",
    city: "Bengaluru",
    gps: { lat: 12.9279, lng: 77.6271, accuracyMeters: 16 },
    firstMappedAt: seededAt,
    lastSeenAt: seededAt,
  },
  {
    vpa: "raoscafe@ybl",
    displayName: "Rao's Cafe",
    categoryHint: "CAFE",
    resolution: "seeded",
    mappedFromCrowdCount: 9,
    averageTicketSizePaise: 6200,
    vibe: "student hangout",
    locationName: "HSR Layout Sector 2",
    city: "Bengaluru",
    gps: { lat: 12.9116, lng: 77.6473, accuracyMeters: 20 },
    firstMappedAt: seededAt,
    lastSeenAt: seededAt,
  },
];

export async function createPersistenceAdapter(): Promise<PersistenceAdapter> {
  const env = loadEnv();
  const adapter: PersistenceAdapter = env.databaseUrl
    ? new PostgresPersistenceAdapter(new Client({ connectionString: env.databaseUrl }))
    : new MemoryPersistenceAdapter();

  await adapter.initialize();

  for (const merchant of seededMerchants) {
    const existing = await adapter.getMerchant(merchant.vpa);
    if (!existing) {
      await adapter.saveMerchant(merchant);
    }
  }

  return adapter;
}
