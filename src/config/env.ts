import { config as loadDotEnvFile } from "dotenv";

export interface AppEnv {
  databaseUrl?: string;
  googleWebClientId?: string;
}

export function loadEnv(): AppEnv {
  loadDotEnvFile();

  return {
    databaseUrl: process.env.DATABASE_URL,
    googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID,
  };
}
