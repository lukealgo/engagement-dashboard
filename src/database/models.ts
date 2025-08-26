export interface Channel {
  id: string;
  name: string;
  is_member: boolean;
  num_members?: number;
  topic?: string;
  purpose?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  real_name?: string;
  display_name?: string;
  is_bot: boolean;
  deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  ts: string;
  channel_id: string;
  user_id?: string;
  text: string;
  thread_ts?: string;
  reply_count: number;
  reaction_count: number;
  created_at: string;
}

export interface Reaction {
  id: number;
  message_ts: string;
  name: string;
  count: number;
  users: string; // JSON string
  created_at: string;
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

export interface UserActivity {
  id: number;
  user_id: string;
  channel_id: string;
  date: string;
  message_count: number;
  reaction_count: number;
  thread_count: number;
  avg_message_length: number;
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