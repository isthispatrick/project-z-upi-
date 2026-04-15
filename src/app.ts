import express from "express";
import { loadEnv } from "./config/env.js";
import { createPersistenceAdapter } from "./persistence/factory.js";
import { persistUploadedMedia } from "./lib/media-storage.js";
import {
  bountySubmissionSchema,
  deviceRegistrationSchema,
  googleAuthSchema,
  ingestNotificationSchema,
  mediaUploadConfirmSchema,
  mediaUploadIntentSchema,
  shareViewSchema,
  snapExtractionSchema,
  snapUploadSchema,
} from "./contracts/api.js";
import { SocialFinanceCopilotService } from "./services/copilot.js";
import { GoogleAuthService } from "./services/google-auth.js";

export async function createApp() {
  const app = express();
  const store = await createPersistenceAdapter();
  const service = new SocialFinanceCopilotService(store);
  const env = loadEnv();
  const googleAuthService = new GoogleAuthService(env.googleWebClientId);

  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.json({
      ok: true,
      service: "social-finance-copilot",
      timestamp: new Date().toISOString(),
    });
  });

  app.post("/api/notifications/ingest", async (request, response) => {
    const parsed = ingestNotificationSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    response.json(await service.ingestNotification(parsed.data));
  });

  app.post("/api/devices/register", async (request, response) => {
    const parsed = deviceRegistrationSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    response.status(201).json(await service.registerDevice(parsed.data));
  });

  app.post("/api/auth/google", async (request, response) => {
    const parsed = googleAuthSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const verifiedUser = await googleAuthService.verifyIdToken(parsed.data.idToken);
      response.status(201).json(await service.signInWithGoogle({
        deviceId: parsed.data.deviceId,
        verifiedUser,
      }));
    } catch (error) {
      response.status(401).json({
        error: error instanceof Error ? error.message : "Google authentication failed",
      });
    }
  });

  app.post("/api/snaps", async (request, response) => {
    const parsed = snapUploadSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      response.status(201).json(await service.logSnap(parsed.data));
    } catch (error) {
      response.status(404).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/api/media/upload-intents", async (request, response) => {
    const parsed = mediaUploadIntentSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    response.status(201).json(await service.createUploadIntent(parsed.data));
  });

  app.post("/api/media/confirm", async (request, response) => {
    const parsed = mediaUploadConfirmSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      response.json(await service.confirmUploadIntent(parsed.data.uploadIntentId));
    } catch (error) {
      response.status(404).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/api/vision/extract-snap", async (request, response) => {
    const parsed = snapExtractionSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    response.json(await service.extractSnapData(parsed.data));
  });

  app.put("/uploads/:uploadIntentId", express.raw({ type: "*/*", limit: "15mb" }), async (request, response) => {
    const uploadIntent = await service.getUploadIntent(request.params.uploadIntentId);
    const token = typeof request.query.token === "string" ? request.query.token : "";

    if (!uploadIntent || token !== uploadIntent.uploadToken) {
      response.status(404).json({ error: "Upload intent not found" });
      return;
    }

    if (!Buffer.isBuffer(request.body) || request.body.length === 0) {
      response.status(400).json({ error: "Missing upload body" });
      return;
    }

    await persistUploadedMedia(uploadIntent.id, uploadIntent.fileName, request.body);
    response.status(204).send();
  });

  app.get("/api/merchants/resolve", async (request, response) => {
    const vpa = request.query.vpa;
    if (typeof vpa !== "string" || vpa.length === 0) {
      response.status(400).json({ error: "Missing vpa query parameter" });
      return;
    }

    const merchant = await service.lookupMerchant(vpa);
    if (!merchant) {
      response.status(404).json({ error: "Merchant not found" });
      return;
    }

    response.json(merchant);
  });

  app.get("/api/ledger", async (request, response) => {
    const deviceId = request.query.deviceId;
    if (typeof deviceId !== "string" || deviceId.length === 0) {
      response.status(400).json({ error: "Missing deviceId query parameter" });
      return;
    }

    response.json(await service.listLedgerEntries(deviceId));
  });

  app.post("/api/bounties/submissions", async (request, response) => {
    const parsed = bountySubmissionSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    response.status(201).json(await service.submitBounty(parsed.data));
  });

  app.get("/api/shares/:shareId", async (request, response) => {
    const share = await service.getShare(request.params.shareId);
    if (!share) {
      response.status(404).json({ error: "Share not found" });
      return;
    }

    response.json(share);
  });

  app.post("/api/shares/:shareId/view", async (request, response) => {
    const parsed = shareViewSchema.safeParse(request.body);
    if (!parsed.success) {
      response.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      response.json(await service.viewShare(request.params.shareId, parsed.data.viewerId));
    } catch (error) {
      response.status(404).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  return app;
}
