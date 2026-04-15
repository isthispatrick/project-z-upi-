import { config as loadDotEnvFile } from "dotenv";

export interface AppEnv {
  databaseUrl?: string;
  googleWebClientId?: string;
  openAiApiKey?: string;
  openAiVisionModel?: string;
  requirePostgres?: boolean;
  r2AccountId?: string;
  r2Bucket?: string;
  r2AccessKeyId?: string;
  r2SecretAccessKey?: string;
}

export function loadEnv(): AppEnv {
  loadDotEnvFile();

  return {
    databaseUrl: process.env.DATABASE_URL,
    googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID,
    openAiApiKey: process.env.OPENAI_API_KEY,
    openAiVisionModel: process.env.OPENAI_VISION_MODEL,
    requirePostgres: process.env.REQUIRE_POSTGRES === "true",
    r2AccountId: process.env.R2_ACCOUNT_ID,
    r2Bucket: process.env.R2_BUCKET,
    r2AccessKeyId: process.env.R2_ACCESS_KEY_ID,
    r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  };
}
