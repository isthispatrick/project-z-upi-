import { z } from "zod";

export const geoPointSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  accuracyMeters: z.number().optional(),
});

export const ingestNotificationSchema = z.object({
  deviceId: z.string().min(1),
  sourceApp: z.string().min(1),
  rawText: z.string().min(1),
  capturedAt: z.string().datetime().optional(),
});

export const snapItemSchema = z.object({
  name: z.string().min(1),
  pricePaise: z.number().int().nonnegative(),
});

export const snapUploadSchema = z.object({
  deviceId: z.string().min(1),
  transactionId: z.string().min(1),
  photoRef: z.string().min(1),
  gps: geoPointSchema.optional(),
  locationName: z.string().optional(),
  city: z.string().optional(),
  items: z.array(snapItemSchema).optional(),
  shareWith: z.array(z.string().min(1)).optional(),
  ttlSeconds: z.number().int().positive().optional(),
});

export const bountySubmissionSchema = z.object({
  merchantVpa: z.string().min(3),
  type: z.enum(["MENU", "QR_STAND"]),
  photoRef: z.string().min(1),
  gps: geoPointSchema,
  locationName: z.string().optional(),
  city: z.string().optional(),
  aiSignals: z.object({
    qualityScore: z.number().min(0).max(1),
    duplicateLikely: z.boolean(),
    detectedTargets: z.array(z.string()),
    textCoverage: z.number().min(0).max(1),
    fraudSignals: z.array(z.string()).optional(),
  }),
});

export const shareViewSchema = z.object({
  viewerId: z.string().min(1),
});

export const mediaUploadIntentSchema = z.object({
  purpose: z.enum(["SNAP", "BOUNTY"]),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
});

export const mediaUploadConfirmSchema = z.object({
  uploadIntentId: z.string().min(1),
});

export const snapExtractionSchema = z.object({
  mediaRef: z.string().min(1),
  merchantLabel: z.string().optional(),
  amountPaise: z.number().int().nonnegative().nullable().optional(),
});

export const deviceRegistrationSchema = z.object({
  deviceId: z.string().min(1),
  platform: z.literal("ANDROID"),
  label: z.string().optional(),
});

export const googleAuthSchema = z.object({
  deviceId: z.string().min(1),
  idToken: z.string().min(1),
});

export const friendLinkCreateSchema = z.object({
  userId: z.string().min(1),
  friendUserId: z.string().min(1),
});

export type IngestNotificationInput = z.infer<typeof ingestNotificationSchema>;
export type SnapUploadInput = z.infer<typeof snapUploadSchema>;
export type BountySubmissionInput = z.infer<typeof bountySubmissionSchema>;
export type ShareViewInput = z.infer<typeof shareViewSchema>;
export type MediaUploadIntentInput = z.infer<typeof mediaUploadIntentSchema>;
export type MediaUploadConfirmInput = z.infer<typeof mediaUploadConfirmSchema>;
export type SnapExtractionInput = z.infer<typeof snapExtractionSchema>;
