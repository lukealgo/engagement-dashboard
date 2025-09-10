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

// HiBob API Types
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

export interface HiBobDashboardMetrics {
  headcount: {
    total: number;
    byDepartment: Record<string, number>;
    bySite: Record<string, number>;
    joiners30d: number;
    joiners90d: number;
    leavers30d: number;
    leavers90d: number;
  };
  tasks: {
    totalOpen: number;
    completionRate30d: number;
    overdueCount: number;
    dueSoonCount: number;
    byDepartment: Record<string, { total: number; completed: number; rate: number }>;
  };
  timeOff: {
    totalRequests30d: number;
    approvedRequests30d: number;
    approvalRate30d: number;
    whosOutToday: number;
    whosOutThisWeek: number;
    upcomingThisMonth: number;
  };
  engagement: {
    averageEngagementScore?: number;
    responseRate?: number;
    byDepartment?: Record<string, number>;
  };
}

export interface HiBobTimeOffEntry {
  id: number;
  employee_id: string;
  date: string;
  portion: 'full' | 'am' | 'pm';
  policy_type: string;
  employee_name?: string;
  department?: string;
  site?: string;
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
  employee_name?: string;
  department?: string;
}

export interface HiBobTenureData {
  tenure: Array<{
    id: string;
    display_name: string;
    start_date?: string;
    department?: string;
    site?: string;
    tenure_years: number;
  }>;
  upcomingAnniversaries: Array<{
    id: string;
    display_name: string;
    start_date?: string;
    department?: string;
    current_tenure_years: number;
    days_to_next_anniversary: number;
  }>;
}

// Webinar API Types
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

export interface Webinar {
  id: number;
  name: string;
  host: string;
  host_id?: number;
  meeting_code?: string;
  total_attendees: number;
  unique_attendees: number;
  average_duration: string;
  created_at: string;
  updated_at: string;
  attendees: WebinarAttendee[];
}

export interface WebinarHost {
  id: number;
  name: string;
  webinar_count: number;
  total_attendees: number;
  created_at: string;
}

export interface WebinarStats {
  total_webinars: number;
  total_attendees: number;
  average_attendance_per_webinar: number;
  most_popular_host: string;
  top_webinars_by_attendance: Webinar[];
  recent_webinars: Webinar[];
}

export interface CSVUploadResponse {
  success: boolean;
  webinar_id: number;
  attendees_imported: number;
  attendees_filtered: number;
  message: string;
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
    await api.post('/engagement/sync', { channelId }, { timeout: 60000 });
  },

  syncAllChannels: async (): Promise<void> => {
    await api.post('/engagement/sync/all', {}, { timeout: 300000 }); // 5 minutes
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

export const hibobApi = {
  getDashboardMetrics: async (): Promise<HiBobDashboardMetrics> => {
    const response = await api.get('/hibob/metrics');
    return response.data;
  },

  syncAllData: async (): Promise<{ message: string }> => {
    const response = await api.post('/hibob/sync');
    return response.data;
  },

  syncEmployees: async (): Promise<{ message: string }> => {
    const response = await api.post('/hibob/sync/employees');
    return response.data;
  },

  syncTasks: async (): Promise<{ message: string }> => {
    const response = await api.post('/hibob/sync/tasks');
    return response.data;
  },

  syncTimeOff: async (): Promise<{ message: string }> => {
    const response = await api.post('/hibob/sync/timeoff');
    return response.data;
  },

  syncReports: async (): Promise<{ message: string }> => {
    const response = await api.post('/hibob/sync/reports');
    return response.data;
  },

  getEmployees: async (params?: {
    department?: string;
    site?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<HiBobEmployee[]> => {
    const response = await api.get('/hibob/employees', { params });
    return response.data;
  },

  getEmployee: async (id: string): Promise<HiBobEmployee> => {
    const response = await api.get(`/hibob/employees/${id}`);
    return response.data;
  },

  getTasks: async (params?: {
    status?: string;
    employee_id?: string;
    department?: string;
    limit?: number;
    offset?: number;
  }): Promise<HiBobTask[]> => {
    const response = await api.get('/hibob/tasks', { params });
    return response.data;
  },

  getTimeOffRequests: async (params?: {
    status?: string;
    employee_id?: string;
    department?: string;
    days?: number;
    limit?: number;
    offset?: number;
  }): Promise<any[]> => {
    const response = await api.get('/hibob/timeoff/requests', { params });
    return response.data;
  },

  getWhosOut: async (params?: {
    from?: string;
    to?: string;
    department?: string;
  }): Promise<HiBobTimeOffEntry[]> => {
    const response = await api.get('/hibob/timeoff/whosout', { params });
    return response.data;
  },

  getTimeOffCalendar: async (params?: {
    from?: string;
    to?: string;
  }): Promise<any[]> => {
    const response = await api.get('/hibob/timeoff/calendar', { params });
    return response.data;
  },

  getReports: async (): Promise<any[]> => {
    const response = await api.get('/hibob/reports');
    return response.data;
  },

  getReport: async (name: string): Promise<any> => {
    const response = await api.get(`/hibob/reports/${name}`);
    return response.data;
  },

  getOrgMobility: async (days: number = 90): Promise<any[]> => {
    const response = await api.get('/hibob/org-mobility', { params: { days } });
    return response.data;
  },

  getTenureData: async (): Promise<HiBobTenureData> => {
    const response = await api.get('/hibob/tenure');
    return response.data;
  },
};

export const webinarApi = {
  // Get all webinars
  getWebinars: async (): Promise<Webinar[]> => {
    const response = await api.get('/webinars');
    return response.data;
  },

  // Get webinar by ID
  getWebinar: async (id: number): Promise<Webinar> => {
    const response = await api.get(`/webinars/${id}`);
    return response.data;
  },

  // Get webinar hosts
  getWebinarHosts: async (): Promise<WebinarHost[]> => {
    const response = await api.get('/webinars/hosts');
    return response.data;
  },

  // Get webinar statistics
  getWebinarStats: async (): Promise<WebinarStats> => {
    const response = await api.get('/webinars/stats');
    return response.data;
  },

  // Upload CSV and create webinar
  uploadCSV: async (formData: FormData): Promise<CSVUploadResponse> => {
    const response = await api.post('/webinars/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 1 minute timeout for file upload
    });
    return response.data;
  },

  // Delete webinar
  deleteWebinar: async (id: number): Promise<void> => {
    await api.delete(`/webinars/${id}`);
  },
};

export default api;