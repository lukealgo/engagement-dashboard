import cron from 'node-cron';
import { SlackService } from './SlackService';
import { EngagementService } from './EngagementService';
import { allQuery } from '../database/setup';

export class ScheduledSync {
  private slackService: SlackService;
  private engagementService: EngagementService;

  constructor() {
    this.slackService = new SlackService();
    this.engagementService = new EngagementService();
  }

  start(): void {
    // Sync every hour
    cron.schedule('0 * * * *', async () => {
      console.log('Starting scheduled sync...');
      await this.syncAllChannels();
    });

    // Daily full sync at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('Starting daily full sync...');
      await this.fullSync();
    });

    console.log('Scheduled sync jobs started');
  }

  private async syncAllChannels(): Promise<void> {
    try {
      const channels = await allQuery(
        'SELECT id FROM channels WHERE is_member = 1'
      );

      for (const channel of channels) {
        try {
          await this.engagementService.syncChannelData(channel.id);
          console.log(`Synced channel ${channel.id}`);
        } catch (error) {
          console.error(`Failed to sync channel ${channel.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in scheduled sync:', error);
    }
  }

  private async fullSync(): Promise<void> {
    try {
      // Refresh channel list
      const channels = await this.slackService.getChannels();
      
      for (const channel of channels.filter(c => c.is_member)) {
        try {
          await this.engagementService.syncChannelData(channel.id);
          console.log(`Full synced channel ${channel.name}`);
        } catch (error) {
          console.error(`Failed to full sync channel ${channel.name}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in full sync:', error);
    }
  }
}