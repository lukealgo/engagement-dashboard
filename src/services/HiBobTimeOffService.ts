import { HiBobApiClient } from './HiBobApiClient';

export interface HiBobTimeOffEntry {
  employeeId: string;
  date: string;
  portion: 'full' | 'am' | 'pm';
  policyType: string;
  requestId?: string;
  approvalStatus?: string;
}

export interface HiBobTimeOffRequest {
  requestId: string;
  employeeId: string;
  policyType: string;
  startDate: string;
  endDate: string;
  dates: string[];
  duration: number;
  durationUnit: string;
  status: 'approved' | 'pending' | 'cancelled' | 'rejected';
  reason?: string;
  createdAt: string;
  updatedAt?: string;
  approvedAt?: string;
}

export interface HiBobTimeOffBalance {
  employeeId: string;
  policyType: string;
  balance: number;
  taken: number;
  pending: number;
  accrued: number;
  carriedOver?: number;
}

export interface TimeOffStats {
  totalRequests: number;
  approvedRequests: number;
  pendingRequests: number;
  averageDuration: number;
  byPolicyType: Record<string, number>;
  byMonth: Record<string, number>;
  upcomingTimeOff: HiBobTimeOffEntry[];
  whosOutToday: HiBobTimeOffEntry[];
  whosOutThisWeek: HiBobTimeOffEntry[];
}

export class HiBobTimeOffService {
  private apiClient: HiBobApiClient;

  constructor() {
    this.apiClient = new HiBobApiClient();
  }

  async getWhosOut(fromDate: string, toDate: string): Promise<HiBobTimeOffEntry[]> {
    return this.apiClient.withRateLimit(async () => {
      const url = new URL(`${this.apiClient['baseUrl']}/v1/timeoff/whosout`);
      url.searchParams.set('from', fromDate);
      url.searchParams.set('to', toDate);

      const response = await fetch(url.toString(), {
        headers: this.apiClient['headers']
      });

      if (!response.ok) {
        throw new Error(`HiBob API error ${response.status}: ${await response.text()}`);
      }

      const data = await response.json() as { entries?: HiBobTimeOffEntry[] };
      return data.entries || [];
    });
  }

  async getWhosOutToday(date?: string): Promise<HiBobTimeOffEntry[]> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return this.apiClient.withRateLimit(async () => {
      const response = await this.apiClient.get<{ entries: HiBobTimeOffEntry[] }>(`/v1/timeoff/outtoday?date=${targetDate}`);
      return response.entries || [];
    });
  }

  async getTimeOffRequestsChanges(since?: string, to?: string): Promise<HiBobTimeOffRequest[]> {
    return this.apiClient.withRateLimit(async () => {
      let url = '/v1/timeoff/requests/changes';
      const params = new URLSearchParams();

      if (since) params.append('since', since);
      if (to) params.append('to', to);

      if (params.toString()) {
        url += '?' + params.toString();
      }

      const response = await this.apiClient.get<{ requests: HiBobTimeOffRequest[] }>(url);
      return response.requests || [];
    });
  }

  async getEmployeeBalance(employeeId: string): Promise<HiBobTimeOffBalance[]> {
    return this.apiClient.withRateLimit(async () => {
      const response = await this.apiClient.get<{ balances: HiBobTimeOffBalance[] }>(`/v1/timeoff/employees/${employeeId}/balance`);
      return response.balances || [];
    }, 500); // Higher rate limit for this endpoint
  }

  // Helper methods for common queries
  async getWhosOutThisWeek(): Promise<HiBobTimeOffEntry[]> {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1); // Start of week (Monday)

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6); // End of week (Sunday)

    const fromDate = monday.toISOString().split('T')[0];
    const toDate = sunday.toISOString().split('T')[0];

    return this.getWhosOut(fromDate, toDate);
  }

  async getUpcomingTimeOff(daysAhead: number = 30): Promise<HiBobTimeOffEntry[]> {
    const fromDate = new Date().toISOString().split('T')[0];
    const toDate = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    return this.getWhosOut(fromDate, toDate);
  }

  // Calculate time-off statistics
  async getTimeOffStats(days: number = 30): Promise<TimeOffStats> {
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const requests = await this.getTimeOffRequestsChanges(sinceDate);
    const upcomingTimeOff = await this.getUpcomingTimeOff(30);
    const whosOutToday = await this.getWhosOutToday();
    const whosOutThisWeek = await this.getWhosOutThisWeek();

    const totalRequests = requests.length;
    const approvedRequests = requests.filter(r => r.status === 'approved').length;
    const pendingRequests = requests.filter(r => r.status === 'pending').length;

    const approvedDurations = requests
      .filter(r => r.status === 'approved')
      .map(r => r.duration);
    const averageDuration = approvedDurations.length > 0
      ? approvedDurations.reduce((sum, dur) => sum + dur, 0) / approvedDurations.length
      : 0;

    // Group by policy type
    const byPolicyType: Record<string, number> = {};
    requests.forEach(request => {
      byPolicyType[request.policyType] = (byPolicyType[request.policyType] || 0) + 1;
    });

    // Group by month
    const byMonth: Record<string, number> = {};
    requests.forEach(request => {
      const month = new Date(request.createdAt).toISOString().substring(0, 7); // YYYY-MM
      byMonth[month] = (byMonth[month] || 0) + 1;
    });

    return {
      totalRequests,
      approvedRequests,
      pendingRequests,
      averageDuration,
      byPolicyType,
      byMonth,
      upcomingTimeOff,
      whosOutToday,
      whosOutThisWeek
    };
  }

  // Get time-off calendar data for heatmap
  async getTimeOffCalendarData(
    fromDate: string,
    toDate: string
  ): Promise<Record<string, HiBobTimeOffEntry[]>> {
    const entries = await this.getWhosOut(fromDate, toDate);
    const calendarData: Record<string, HiBobTimeOffEntry[]> = {};

    entries.forEach(entry => {
      if (!calendarData[entry.date]) {
        calendarData[entry.date] = [];
      }
      calendarData[entry.date].push(entry);
    });

    return calendarData;
  }

  // Get time-off trends over time
  async getTimeOffTrends(months: number = 12): Promise<{
    requestsOverTime: Array<{ month: string; count: number; approved: number; pending: number }>;
    approvalRate: number;
  }> {
    const sinceDate = new Date();
    sinceDate.setMonth(sinceDate.getMonth() - months);

    const requests = await this.getTimeOffRequestsChanges(sinceDate.toISOString());

    const monthlyStats: Record<string, { total: number; approved: number; pending: number }> = {};

    requests.forEach(request => {
      const month = new Date(request.createdAt).toISOString().substring(0, 7);
      if (!monthlyStats[month]) {
        monthlyStats[month] = { total: 0, approved: 0, pending: 0 };
      }
      monthlyStats[month].total++;
      if (request.status === 'approved') monthlyStats[month].approved++;
      if (request.status === 'pending') monthlyStats[month].pending++;
    });

    const requestsOverTime = Object.entries(monthlyStats)
      .map(([month, stats]) => ({
        month,
        count: stats.total,
        approved: stats.approved,
        pending: stats.pending
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const totalApproved = requestsOverTime.reduce((sum, month) => sum + month.approved, 0);
    const totalRequests = requestsOverTime.reduce((sum, month) => sum + month.count, 0);
    const approvalRate = totalRequests > 0 ? (totalApproved / totalRequests) * 100 : 0;

    return {
      requestsOverTime,
      approvalRate
    };
  }
}
