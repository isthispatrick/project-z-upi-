import { OAuth2Client } from "google-auth-library";

export interface VerifiedGoogleUser {
  providerUserId: string;
  email: string;
  displayName?: string;
  photoUrl?: string;
}

export class GoogleAuthService {
  private readonly client: OAuth2Client;

  constructor(private readonly webClientId?: string) {
    this.client = new OAuth2Client(webClientId);
  }

  async verifyIdToken(idToken: string): Promise<VerifiedGoogleUser> {
    if (!this.webClientId) {
      throw new Error("GOOGLE_WEB_CLIENT_ID is not configured");
    }

    const ticket = await this.client.verifyIdToken({
      idToken,
      audience: this.webClientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email) {
      throw new Error("Invalid Google token payload");
    }

    return {
      providerUserId: payload.sub,
      email: payload.email,
      displayName: payload.name,
      photoUrl: payload.picture,
    };
  }
}
