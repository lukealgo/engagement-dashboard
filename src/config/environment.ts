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
  // Do not hard-require any env vars so the app can boot without credentials

  const hibobApiKey = process.env.HIBOBSECRET;
  const hibobServiceUserId = process.env.HIBOBSERVICE;
  const slackBotToken = process.env.SLACK_BOT_TOKEN;

  if (!slackBotToken) {
    console.warn('⚠️  SLACK_BOT_TOKEN not set - Slack features will be disabled');
  }
  if (!hibobApiKey || !hibobServiceUserId) {
    console.warn('⚠️  HiBob credentials not set - HiBob functionality is disabled');
  }

  return {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    slack: {
      botToken: slackBotToken || '',
      appToken: process.env.SLACK_APP_TOKEN,
    },
    hibob: {
      apiKey: hibobApiKey || '',
      serviceUserId: hibobServiceUserId || '',
      baseUrl: process.env.HIBOB_BASE || 'https://api.hibob.com',
    },
    database: {
      url: process.env.DATABASE_URL || './engagement.db',
    },
  };
}

export const config = validateEnvironment();