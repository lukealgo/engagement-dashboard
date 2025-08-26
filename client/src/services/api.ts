import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export interface Channel {
  id: string;
  name: string;
  is_member: boolean;
  num_members?: number;
  topic?: string;
  purpose?: string;
}

export interface EngagementMetric {
  id: number;
  channel_id: string;
  date: string;
  message_count: number;
  user_count: number;
  reaction_count: number;
  thread_count: number;
  avg_message_length: number;
  engagement_score: number;
  created_at: string;
}

export interface EngagementSummary {
  channel_id: string;
  channel_name: string;
  total_messages: number;
  total_users: number;
  total_reactions: number;
  avg_engagement_score: number;
  most_active_day: string;
  trend: 'up' | 'down' | 'stable';
}

export interface UserRanking {
  user_id: string;
  user_name: string;
  message_count: number;
  reaction_count: number;
  engagement_score: number;
  rank: number;
}

export interface TopPost {
  ts: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  text: string;
  reaction_count: number;
  reply_count: number;
  engagement_score: number;
  date: string;
}

export interface UserActivationMetrics {
  total_workspace_users: number;
  active_users: number;
  activation_rate: number;
  daily_activation: Array<{
    date: string;
    total_users: number;
    active_users: number;
    activation_rate: number;
    new_users: number;
  }>;
  activation_trend: 'up' | 'down' | 'stable';
}

export interface WorkspaceOverview {
  total_channels: number;
  total_messages: number;
  total_users: number;
  total_reactions: number;
  avg_engagement_score: number;
  most_active_channel: {
    id: string;
    name: string;
    message_count: number;
  };
  daily_activity: Array<{
    date: string;
    message_count: number;
    user_count: number;
    engagement_score: number;
  }>;
  channel_breakdown: Array<{
    channel_id: string;
    channel_name: string;
    message_count: number;
    user_count: number;
    engagement_score: number;
  }>;
}

export const slackApi = {
  getChannels: async (): Promise<Channel[]> => {
    const response = await api.get('/slack/channels');
    return response.data;
  },

  getUsers: async () => {
    const response = await api.get('/slack/users');
    return response.data;
  },
};

export const engagementApi = {
  getMetrics: async (params?: {
    channelId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<EngagementMetric[]> => {
    const response = await api.get('/engagement/metrics', { params });
    return response.data;
  },

  getChannelActivity: async (channelId: string, days: number = 30): Promise<EngagementSummary> => {
    const response = await api.get(`/engagement/channels/${channelId}/activity`, {
      params: { days }
    });
    return response.data;
  },

  getUserRankings: async (params?: {
    channelId?: string;
    days?: number;
  }): Promise<UserRanking[]> => {
    const response = await api.get('/engagement/users/rankings', { params });
    return response.data;
  },

  syncChannel: async (channelId: string): Promise<void> => {
    await api.post('/engagement/sync', { channelId });
  },

  syncAllChannels: async (): Promise<void> => {
    await api.post('/engagement/sync/all');
  },

  getWorkspaceOverview: async (days: number = 30): Promise<WorkspaceOverview> => {
    const response = await api.get('/engagement/workspace/overview', {
      params: { days }
    });
    return response.data;
  },

  getTopPosts: async (days: number = 30, limit: number = 10): Promise<TopPost[]> => {
    const response = await api.get('/engagement/top-posts', {
      params: { days, limit }
    });
    return response.data;
  },

  getUserActivationMetrics: async (days: number = 30): Promise<UserActivationMetrics> => {
    const response = await api.get('/engagement/user-activation', {
      params: { days }
    });
    return response.data;
  },
};

export default api;