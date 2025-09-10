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

// HiBob Models
export interface HiBobEmployee {
  id: string;
  display_name: string;
  email?: string;
  manager_id?: string;
  department?: string;
  site?: string;
  job_title?: string;
  start_date?: string;
  status?: string;
  avatar_url?: string;
  employment_status?: string;
  created_at: string;
  updated_at: string;
}

export interface HiBobLifecycleEvent {
  id: number;
  employee_id: string;
  effective_date: string;
  status: string;
  reason?: string;
  type?: string;
  created_at: string;
}

export interface HiBobTask {
  id: string;
  employee_id: string;
  title: string;
  description?: string;
  list_name: string;
  status: 'open' | 'completed' | 'cancelled';
  due_date?: string;
  created_date?: string;
  last_updated: string;
  priority?: 'low' | 'medium' | 'high';
  assignee?: string;
  completed_date?: string;
  created_at: string;
  updated_at: string;
}

export interface HiBobTimeOffRequest {
  request_id: string;
  employee_id: string;
  policy_type: string;
  start_date: string;
  end_date: string;
  dates: string; // JSON string array
  duration: number;
  duration_unit: string;
  status: 'approved' | 'pending' | 'cancelled' | 'rejected';
  reason?: string;
  created_at: string;
  updated_at?: string;
  approved_at?: string;
  db_created_at: string;
  db_updated_at: string;
}

export interface HiBobTimeOffEntry {
  id: number;
  employee_id: string;
  date: string;
  portion: 'full' | 'am' | 'pm';
  policy_type: string;
  request_id?: string;
  approval_status?: string;
  created_at: string;
}

export interface HiBobTimeOffBalance {
  id: number;
  employee_id: string;
  policy_type: string;
  balance: number;
  taken: number;
  pending: number;
  accrued: number;
  carried_over?: number;
  last_updated: string;
}

export interface HiBobWorkHistory {
  id: number;
  employee_id: string;
  effective_date: string;
  department?: string;
  site?: string;
  manager?: string;
  job_title?: string;
  created_at: string;
}

export interface HiBobReportData {
  id: number;
  report_name: string;
  data: string; // JSON string
  metadata?: string; // JSON string
  generated_at: string;
  expires_at?: string;
  created_at: string;
}

export interface HiBobEngagementMetric {
  id: number;
  metric_type: string;
  value: number;
  period_start: string;
  period_end: string;
  department?: string;
  site?: string;
  created_at: string;
}

export interface HiBobWebhookEvent {
  id: number;
  event_type: string;
  event_id: string;
  resource_type: string;
  resource_id: string;
  payload: string; // JSON string
  processed: boolean;
  processed_at?: string;
  created_at: string;
}

// Webinar Models
export interface WebinarHost {
  id: number;
  name: string;
  created_at: string;
}

export interface Webinar {
  id: number;
  name: string;
  host_id: number;
  meeting_code?: string;
  total_attendees: number;
  unique_attendees: number;
  average_duration: string;
  created_at: string;
  updated_at: string;
}

export interface WebinarAttendee {
  id: number;
  webinar_id: number;
  participant_name: string;
  attendance_started_at?: string;
  joined_at?: string;
  attendance_stopped_at?: string;
  attended_duration: string;
  meeting_code?: string;
  created_at: string;
}