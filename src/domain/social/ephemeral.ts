import type { EphemeralShare } from "../types.js";
import { createId } from "../../lib/id.js";

export function createEphemeralShare(input: {
  transactionId: string;
  mediaRef: string;
  recipients: string[];
  ttlSeconds?: number;
}): EphemeralShare {
  const createdAt = new Date();
  const ttlMs = Math.max(300, input.ttlSeconds ?? 1800) * 1000;

  return {
    id: createId("share"),
    transactionId: input.transactionId,
    mediaRef: input.mediaRef,
    recipients: input.recipients,
    viewedBy: [],
    status: "active",
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(createdAt.getTime() + ttlMs).toISOString(),
  };
}

export function markShareViewed(share: EphemeralShare, viewerId: string): EphemeralShare {
  if (share.status === "wiped") {
    return share;
  }

  const viewedBy = share.viewedBy.includes(viewerId)
    ? share.viewedBy
    : [...share.viewedBy, viewerId];

  const everyoneViewed = share.recipients.every((recipient) => viewedBy.includes(recipient));
  const expired = new Date(share.expiresAt).getTime() <= Date.now();

  if (everyoneViewed || expired) {
    return {
      ...share,
      viewedBy,
      status: "wiped",
      wipedAt: new Date().toISOString(),
    };
  }

  return {
    ...share,
    viewedBy,
  };
}
