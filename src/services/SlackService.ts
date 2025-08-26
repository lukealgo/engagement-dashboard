import { WebClient } from '@slack/web-api';
import { ConversationsListResponse, ConversationsHistoryResponse, UsersListResponse } from '@slack/web-api';

export interface SlackChannel {
  id: string;
  name: string;
  is_member: boolean;
  num_members?: number;
  topic?: string;
  purpose?: string;
}

export interface SlackMessage {
  ts: string;
  user?: string;
  text: string;
  thread_ts?: string;
  reply_count?: number;
  reactions?: Array<{
    name: string;
    count: number;
    users: string[];
  }>;
}

export interface SlackUser {
  id: string;
  name: string;
  real_name?: string;
  display_name?: string;
  is_bot: boolean;
  deleted: boolean;
}

export class SlackService {
  private client: WebClient;

  constructor() {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) {
      throw new Error('SLACK_BOT_TOKEN environment variable is required');
    }
    
    this.client = new WebClient(token);
  }

  async getChannels(): Promise<SlackChannel[]> {
    try {
      const response: ConversationsListResponse = await this.client.conversations.list({
        types: 'public_channel,private_channel',
        exclude_archived: true,
        limit: 1000
      });

      if (!response.channels) {
        return [];
      }

      return response.channels.map(channel => ({
        id: channel.id!,
        name: channel.name!,
        is_member: channel.is_member || false,
        num_members: channel.num_members,
        topic: channel.topic?.value,
        purpose: channel.purpose?.value
      }));
    } catch (error) {
      console.error('Error fetching channels:', error);
      throw error;
    }
  }

  async getChannelMessages(
    channelId: string,
    limit: number = 100,
    oldest?: string
  ): Promise<SlackMessage[]> {
    try {
      const response: ConversationsHistoryResponse = await this.client.conversations.history({
        channel: channelId,
        limit,
        oldest
      });

      if (!response.messages) {
        return [];
      }

      return response.messages.map(message => ({
        ts: message.ts!,
        user: message.user,
        text: message.text || '',
        thread_ts: message.thread_ts,
        reply_count: message.reply_count,
        reactions: message.reactions?.map(reaction => ({
          name: reaction.name!,
          count: reaction.count!,
          users: reaction.users || []
        }))
      }));
    } catch (error) {
      console.error('Error fetching channel messages:', error);
      throw error;
    }
  }

  async getUsers(): Promise<SlackUser[]> {
    try {
      const response: UsersListResponse = await this.client.users.list({
        limit: 1000
      });

      if (!response.members) {
        return [];
      }

      return response.members.map(user => ({
        id: user.id!,
        name: user.name!,
        real_name: user.real_name,
        display_name: user.profile?.display_name,
        is_bot: user.is_bot || false,
        deleted: user.deleted || false
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  async getChannelInfo(channelId: string) {
    try {
      const response = await this.client.conversations.info({
        channel: channelId
      });

      return response.channel;
    } catch (error) {
      console.error('Error fetching channel info:', error);
      throw error;
    }
  }

  async getReplies(channelId: string, threadTs: string) {
    try {
      const response = await this.client.conversations.replies({
        channel: channelId,
        ts: threadTs
      });

      return response.messages || [];
    } catch (error) {
      console.error('Error fetching replies:', error);
      throw error;
    }
  }
}