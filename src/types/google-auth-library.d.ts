declare module "google-auth-library" {
  export class OAuth2Client {
    constructor(clientId?: string);
    verifyIdToken(input: { idToken: string; audience?: string }): Promise<{
      getPayload(): {
        sub?: string;
        email?: string;
        name?: string;
        picture?: string;
      } | undefined;
    }>;
  }
}
