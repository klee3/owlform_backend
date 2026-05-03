import winston from 'winston';
import { Env, envSchema } from './env.schema';

const startupLogger = winston.createLogger({
  level: 'error',
  transports: [new winston.transports.Console()],
});

let cachedConfig: AppConfig | null = null;

export type AppConfig = {
  env: Env['NODE_ENV'];
  port: number;
  databaseUrl: string;
  frontendUrl: string;
  jwt: {
    accessTokenSecret: string;
    accessTokenExpiresIn: string;
    refreshTokenSecret: string;
    refreshTokenExpiresIn: string;
  };
  google: {
    clientId: string;
    clientSecret: string;
    callbackUrl: string;
  };
};

export function createConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    startupLogger.error('Invalid environment variables', {
      issues: result.error.issues,
    });
    process.exit(1);
  }

  const parsed = result.data;

  cachedConfig = Object.freeze({
    env: parsed.NODE_ENV,
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    frontendUrl: parsed.FRONTEND_URL,
    jwt: {
      accessTokenSecret: parsed.JWT_SECRET,
      accessTokenExpiresIn: parsed.JWT_EXPIRE_IN,
      refreshTokenSecret: parsed.JWT_REFRESH_SECRET,
      refreshTokenExpiresIn: parsed.JWT_REFRESH_EXPIRE_IN,
    },
    google: {
      clientId: parsed.GOOGLE_CLIENT_ID,
      clientSecret: parsed.GOOGLE_CLIENT_SECRET,
      callbackUrl: parsed.GOOGLE_CALLBACK_URL,
    },
  });

  return cachedConfig;
}
