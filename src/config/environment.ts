import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface Config {
  port: number;
  nodeEnv: string;
  slack: {
    botToken: string;
    appToken?: string;
  };
  hibob: {
    apiKey: string;
    serviceUserId: string;
    baseUrl: string;
  };
  database: {
    url: string;
  };
}

export function validateEnvironment(): Config {
  const requiredEnvVars = ['SLACK_BOT_TOKEN', 'HIBOBSECRET', 'HIBOBSERVICE'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    slack: {
      botToken: process.env.SLACK_BOT_TOKEN!,
      appToken: process.env.SLACK_APP_TOKEN,
    },
    hibob: {
      apiKey: process.env.HIBOBSECRET!,
      serviceUserId: process.env.HIBOBSERVICE!,
      baseUrl: process.env.HIBOB_BASE || 'https://api.hibob.com',
    },
    database: {
      url: process.env.DATABASE_URL || './engagement.db',
    },
  };
}

export const config = validateEnvironment();