export interface AppEnv {
  databaseUrl?: string;
  googleWebClientId?: string;
}

export function loadEnv(): AppEnv {
  return {
    databaseUrl: process.env.DATABASE_URL,
    googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID,
  };
}
