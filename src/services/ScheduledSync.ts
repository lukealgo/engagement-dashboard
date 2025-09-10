import cron from 'node-cron';
import { SlackService } from './SlackService';
import { EngagementService } from './EngagementService';
import { HiBobService } from './HiBobService';
import { allQuery } from '../database/setup';

export class ScheduledSync {
  private slackService: SlackService;
  private engagementService: EngagementService;
  private hibobService: HiBobService;

  constructor() {
    this.slackService = new SlackService();
    this.engagementService = new EngagementService();
    this.hibobService = new HiBobService();
  }

  start(): void {
    // Sync Slack channels every hour
    cron.schedule('0 * * * *', async () => {
      console.log('Starting scheduled Slack sync...');
      await this.syncAllChannels();
    });

    // Sync HiBob data every 4 hours (to respect rate limits)
    cron.schedule('0 */4 * * *', async () => {
      console.log('Starting scheduled HiBob sync...');
      await this.syncHiBobData();
    });

    // Daily full sync at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('Starting daily full sync...');
      await this.fullSync();
    });

    // Daily HiBob full sync at 3 AM
    cron.schedule('0 3 * * *', async () => {
      console.log('Starting daily HiBob full sync...');
      await this.fullHiBobSync();
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

  private async syncHiBobData(): Promise<void> {
    try {
      // Sync HiBob data (incremental updates)
      await this.hibobService.syncTasks();
      await this.hibobService.syncTimeOffData();
      console.log('HiBob incremental sync completed');
    } catch (error) {
      console.error('Error in HiBob incremental sync:', error);
    }
  }

  private async fullHiBobSync(): Promise<void> {
    try {
      // Full HiBob sync (all data)
      await this.hibobService.syncAllData();
      console.log('HiBob full sync completed');
    } catch (error) {
      console.error('Error in HiBob full sync:', error);
    }
  }
}