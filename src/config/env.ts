export interface AppEnv {
  databaseUrl?: string;
}

export function loadEnv(): AppEnv {
  return {
    databaseUrl: process.env.DATABASE_URL,
  };
}
