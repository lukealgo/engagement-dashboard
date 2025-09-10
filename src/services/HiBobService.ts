import { HiBobPeopleService, HiBobEmployee } from './HiBobPeopleService';
import { HiBobTasksService } from './HiBobTasksService';
import { HiBobTimeOffService } from './HiBobTimeOffService';
import { HiBobReportsService } from './HiBobReportsService';
import { db, runQuery, allQuery, getQuery } from '../database/setup';
import {
  HiBobEmployee as DBEmployee,
  HiBobLifecycleEvent as DBLifecycleEvent,
  HiBobTask as DBTask,
  HiBobTimeOffRequest as DBTimeOffRequest,
  HiBobTimeOffEntry as DBTimeOffEntry,
  HiBobWorkHistory as DBWorkHistory,
  HiBobEngagementMetric as DBEngagementMetric,
  HiBobWebhookEvent as DBWebhookEvent
} from '../database/models';

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

export class HiBobService {
  private peopleService: HiBobPeopleService;
  private tasksService: HiBobTasksService;
  private timeOffService: HiBobTimeOffService;
  private reportsService: HiBobReportsService;

  constructor() {
    this.peopleService = new HiBobPeopleService();
    this.tasksService = new HiBobTasksService();
    this.timeOffService = new HiBobTimeOffService();
    this.reportsService = new HiBobReportsService();
  }

  // Data synchronization methods
  async syncAllData(): Promise<void> {
    console.log('Starting HiBob data synchronization...');

    const errors: string[] = [];

    try {
      // Sync employees
      try {
        await this.syncEmployees();
      } catch (error: any) {
        if (error.message.includes('Authentication Failed') || error.message.includes('Access Denied')) {
          errors.push(`Employees sync failed: ${error.message}`);
          console.error('HiBob authentication error during employee sync:', error.message);
        } else {
          errors.push(`Employees sync failed: ${error.message}`);
          console.error('Error syncing employees:', error);
        }
      }

      // Sync tasks
      try {
        await this.syncTasks();
      } catch (error: any) {
        if (error.message.includes('Authentication Failed') || error.message.includes('Access Denied')) {
          errors.push(`Tasks sync failed: ${error.message}`);
          console.error('HiBob authentication error during task sync:', error.message);
        } else {
          errors.push(`Tasks sync failed: ${error.message}`);
          console.error('Error syncing tasks:', error);
        }
      }

      // Sync time-off data
      try {
        await this.syncTimeOffData();
      } catch (error: any) {
        if (error.message.includes('Authentication Failed') || error.message.includes('Access Denied')) {
          errors.push(`Time-off sync failed: ${error.message}`);
          console.error('HiBob authentication error during time-off sync:', error.message);
        } else {
          errors.push(`Time-off sync failed: ${error.message}`);
          console.error('Error syncing time-off data:', error);
        }
      }

      // Sync reports
      try {
        await this.syncReports();
      } catch (error: any) {
        if (error.message.includes('Authentication Failed') || error.message.includes('Access Denied')) {
          errors.push(`Reports sync failed: ${error.message}`);
          console.error('HiBob authentication error during reports sync:', error.message);
        } else {
          errors.push(`Reports sync failed: ${error.message}`);
          console.error('Error syncing reports:', error);
        }
      }

      if (errors.length > 0) {
        console.warn('HiBob sync completed with errors:', errors);
        // Don't throw error if it's just authentication issues - let the UI handle it gracefully
        if (errors.some(error => !error.includes('Authentication Failed') && !error.includes('Access Denied'))) {
          throw new Error(`HiBob sync completed with errors: ${errors.join('; ')}`);
        }
      } else {
        console.log('HiBob data synchronization completed successfully');
      }
    } catch (error) {
      console.error('Critical error during HiBob data synchronization:', error);
      throw error;
    }
  }

  async syncEmployees(): Promise<void> {
    console.log('Syncing employee data...');

    try {
      const employees = await this.peopleService.searchPeople({
        fields: [
          'id', 'firstName', 'lastName', 'email', 'work', 'about'
        ]
      });

      console.log(`HiBobService: Received ${employees.length} employees from API`);

      // Log what fields are actually available
      if (employees.length > 0) {
        const firstEmployee = employees[0];
        console.log('HiBobService: First employee fields:', Object.keys(firstEmployee));
        console.log('HiBobService: First employee data:', JSON.stringify(firstEmployee, null, 2));

        // Check for required fields
        if (!firstEmployee.displayName) {
          console.warn('HiBobService: CRITICAL - displayName field is missing! This will cause database constraint error.');
          console.log('HiBobService: Available fields in employee object:', Object.keys(firstEmployee));
        }
      }

      const lifecycleEvents = await this.peopleService.getBulkLifecycleHistory();
      const workHistory = await this.peopleService.getBulkWorkHistory();

      // Store employees
      for (const employee of employees) {
        await this.upsertEmployee(employee);
      }

      // Store lifecycle events
      for (const event of lifecycleEvents) {
        await this.upsertLifecycleEvent(event);
      }

      // Store work history
      for (const history of workHistory) {
        await this.upsertWorkHistory(history);
      }

      console.log(`Synced ${employees.length} employees, ${lifecycleEvents.length} lifecycle events, ${workHistory.length} work history records`);
    } catch (error) {
      console.error('Error syncing employees:', error);
      throw error;
    }
  }

  async syncTasks(): Promise<void> {
    console.log('Syncing task data...');

    try {
      const openTasks = await this.tasksService.getOpenTasks();

      for (const task of openTasks) {
        await this.upsertTask(task);
      }

      console.log(`Synced ${openTasks.length} tasks`);
    } catch (error) {
      console.error('Error syncing tasks:', error);
      throw error;
    }
  }

  async syncTimeOffData(): Promise<void> {
    console.log('Syncing time-off data...');

    try {
      // Get recent time-off requests
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const requests = await this.timeOffService.getTimeOffRequestsChanges(thirtyDaysAgo);

      // Get who's out this week
      const whosOutThisWeek = await this.timeOffService.getWhosOutThisWeek();

      // Store time-off requests
      for (const request of requests) {
        await this.upsertTimeOffRequest(request);
      }

      // Store time-off entries
      for (const entry of whosOutThisWeek) {
        await this.upsertTimeOffEntry(entry);
      }

      console.log(`Synced ${requests.length} time-off requests, ${whosOutThisWeek.length} time-off entries`);
    } catch (error) {
      console.error('Error syncing time-off data:', error);
      throw error;
    }
  }

  async syncReports(): Promise<void> {
    console.log('Syncing report data...');

    try {
      const reports = await this.reportsService.getEngagementReports();

      for (const report of reports) {
        try {
          const reportData = await this.reportsService.getReportData(report.name);
          await this.storeReportData(reportData);
        } catch (error) {
          console.warn(`Failed to sync report ${report.name}:`, error);
        }
      }

      console.log(`Synced ${reports.length} reports`);
    } catch (error) {
      console.error('Error syncing reports:', error);
      throw error;
    }
  }

  // Database operations
  private async upsertEmployee(employee: HiBobEmployee): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO hibob_employees
      (id, display_name, email, manager_id, department, site, job_title, start_date, status, avatar_url, employment_status, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    // Generate display name if missing
    let displayName = employee.displayName;
    if (!displayName) {
      // Try to construct from firstName and lastName if available
      const firstName = (employee as any).firstName;
      const lastName = (employee as any).lastName;
      if (firstName && lastName) {
        displayName = `${firstName} ${lastName}`;
      } else if (firstName) {
        displayName = firstName;
      } else if (lastName) {
        displayName = lastName;
      } else {
        // Fallback to ID or "Unknown Employee"
        displayName = `Employee ${employee.id.slice(-4)}`;
      }
      console.log(`HiBobService: Generated displayName for employee ${employee.id}: "${displayName}"`);
    }

    await runQuery(sql, [
      employee.id,
      displayName,
      employee.email,
      employee.managerId,
      employee.department || employee.work?.department,
      employee.site || employee.work?.site,
      employee.jobTitle,
      employee.startDate || employee.employment?.startDate,
      employee.status || employee.employment?.status,
      employee.avatarUrl || employee.about?.avatarUrl,
      employee.employment?.status || 'Employed' // Default to Employed if no status available
    ]);
  }

  private async upsertLifecycleEvent(event: any): Promise<void> {
    const sql = `
      INSERT OR IGNORE INTO hibob_lifecycle_events
      (employee_id, effective_date, status, reason, type)
      VALUES (?, ?, ?, ?, ?)
    `;

    await runQuery(sql, [
      event.employeeId,
      event.effectiveDate,
      event.status,
      event.reason,
      event.type
    ]);
  }

  private async upsertTask(task: any): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO hibob_tasks
      (id, employee_id, title, description, list_name, status, due_date, created_date, last_updated, priority, assignee, completed_date, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    await runQuery(sql, [
      task.id,
      task.employeeId,
      task.title,
      task.description,
      task.listName,
      task.status,
      task.dueDate,
      task.createdDate,
      task.lastUpdated,
      task.priority,
      task.assignee,
      task.completedDate
    ]);
  }

  private async upsertTimeOffRequest(request: any): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO hibob_time_off_requests
      (request_id, employee_id, policy_type, start_date, end_date, dates, duration, duration_unit, status, reason, created_at, updated_at, approved_at, db_updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    await runQuery(sql, [
      request.requestId,
      request.employeeId,
      request.policyType,
      request.startDate,
      request.endDate,
      JSON.stringify(request.dates),
      request.duration,
      request.durationUnit,
      request.status,
      request.reason,
      request.createdAt,
      request.updatedAt,
      request.approvedAt
    ]);
  }

  private async upsertTimeOffEntry(entry: any): Promise<void> {
    const sql = `
      INSERT OR IGNORE INTO hibob_time_off_entries
      (employee_id, date, portion, policy_type, request_id, approval_status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await runQuery(sql, [
      entry.employeeId,
      entry.date,
      entry.portion,
      entry.policyType,
      entry.requestId,
      entry.approvalStatus
    ]);
  }

  private async upsertWorkHistory(history: any): Promise<void> {
    const sql = `
      INSERT OR IGNORE INTO hibob_work_history
      (employee_id, effective_date, department, site, manager, job_title)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await runQuery(sql, [
      history.employeeId,
      history.effectiveDate,
      history.department,
      history.site,
      history.manager,
      history.jobTitle
    ]);
  }

  private async storeReportData(reportData: any): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO hibob_report_data
      (report_name, data, metadata, generated_at, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `;

    await runQuery(sql, [
      reportData.reportName,
      JSON.stringify(reportData.data),
      JSON.stringify(reportData.metadata),
      reportData.metadata?.generatedAt || new Date().toISOString(),
      null // No expiration for now
    ]);
  }

  // Dashboard metrics methods
  async getDashboardMetrics(): Promise<HiBobDashboardMetrics> {
    const [headcount, tasks, timeOff, engagement] = await Promise.all([
      this.getHeadcountMetrics(),
      this.getTaskMetrics(),
      this.getTimeOffMetrics(),
      this.getEngagementMetrics()
    ]);

    return {
      headcount,
      tasks,
      timeOff,
      engagement
    };
  }

  private async getHeadcountMetrics() {
    const sql = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN DATE(start_date) >= DATE('now', '-30 days') THEN 1 END) as joiners_30d,
        COUNT(CASE WHEN DATE(start_date) >= DATE('now', '-90 days') THEN 1 END) as joiners_90d
      FROM hibob_employees
      WHERE employment_status = 'Employed'
    `;

    const result = await getQuery(sql);

    // Get leavers from lifecycle events
    const leaversSql = `
      SELECT
        COUNT(CASE WHEN DATE(effective_date) >= DATE('now', '-30 days') THEN 1 END) as leavers_30d,
        COUNT(CASE WHEN DATE(effective_date) >= DATE('now', '-90 days') THEN 1 END) as leavers_90d
      FROM hibob_lifecycle_events
      WHERE status IN ('Terminated', 'Resigned')
    `;

    const leaversResult = await getQuery(leaversSql);

    // Get breakdown by department
    const deptSql = `
      SELECT department, COUNT(*) as count
      FROM hibob_employees
      WHERE employment_status = 'Employed' AND department IS NOT NULL
      GROUP BY department
    `;

    const deptResults = await allQuery(deptSql);
    const byDepartment: Record<string, number> = {};
    deptResults.forEach((row: any) => {
      byDepartment[row.department] = row.count;
    });

    // Get breakdown by site
    const siteSql = `
      SELECT site, COUNT(*) as count
      FROM hibob_employees
      WHERE employment_status = 'Employed' AND site IS NOT NULL
      GROUP BY site
    `;

    const siteResults = await allQuery(siteSql);
    const bySite: Record<string, number> = {};
    siteResults.forEach((row: any) => {
      bySite[row.site] = row.count;
    });

    return {
      total: result.total,
      byDepartment,
      bySite,
      joiners30d: result.joiners_30d,
      joiners90d: result.joiners_90d,
      leavers30d: leaversResult.leavers_30d,
      leavers90d: leaversResult.leavers_90d
    };
  }

  private async getTaskMetrics() {
    const sql = `
      SELECT
        COUNT(*) as total_open,
        COUNT(CASE WHEN due_date < DATE('now') AND status = 'open' THEN 1 END) as overdue,
        COUNT(CASE WHEN due_date BETWEEN DATE('now') AND DATE('now', '+7 days') AND status = 'open' THEN 1 END) as due_soon
      FROM hibob_tasks
      WHERE status = 'open'
    `;

    const result = await getQuery(sql);

    // Get completion rate for last 30 days
    const completionSql = `
      SELECT
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(*) as total
      FROM hibob_tasks
      WHERE last_updated >= DATE('now', '-30 days')
    `;

    const completionResult = await getQuery(completionSql);
    const completionRate30d = completionResult.total > 0
      ? (completionResult.completed / completionResult.total) * 100
      : 0;

    // Get by department (requires joining with employees)
    const deptSql = `
      SELECT
        e.department,
        COUNT(t.id) as total,
        COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed
      FROM hibob_tasks t
      JOIN hibob_employees e ON t.employee_id = e.id
      WHERE e.department IS NOT NULL
      GROUP BY e.department
    `;

    const deptResults = await allQuery(deptSql);
    const byDepartment: Record<string, { total: number; completed: number; rate: number }> = {};

    deptResults.forEach((row: any) => {
      const rate = row.total > 0 ? (row.completed / row.total) * 100 : 0;
      byDepartment[row.department] = {
        total: row.total,
        completed: row.completed,
        rate
      };
    });

    return {
      totalOpen: result.total_open,
      completionRate30d,
      overdueCount: result.overdue,
      dueSoonCount: result.due_soon,
      byDepartment
    };
  }

  private async getTimeOffMetrics() {
    // Get requests in last 30 days
    const requestsSql = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved
      FROM hibob_time_off_requests
      WHERE created_at >= DATE('now', '-30 days')
    `;

    const requestsResult = await getQuery(requestsSql);
    const approvalRate30d = requestsResult.total > 0
      ? (requestsResult.approved / requestsResult.total) * 100
      : 0;

    // Get who's out today and this week
    const today = new Date().toISOString().split('T')[0];
    const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const whosOutTodaySql = `
      SELECT COUNT(DISTINCT employee_id) as count
      FROM hibob_time_off_entries
      WHERE date = ?
    `;

    const whosOutTodayResult = await getQuery(whosOutTodaySql, [today]);

    const whosOutThisWeekSql = `
      SELECT COUNT(DISTINCT employee_id) as count
      FROM hibob_time_off_entries
      WHERE date BETWEEN ? AND ?
    `;

    const whosOutThisWeekResult = await getQuery(whosOutThisWeekSql, [today, weekFromNow]);

    const upcomingThisMonthSql = `
      SELECT COUNT(DISTINCT employee_id) as count
      FROM hibob_time_off_entries
      WHERE date BETWEEN DATE('now') AND DATE('now', '+30 days')
    `;

    const upcomingResult = await getQuery(upcomingThisMonthSql);

    return {
      totalRequests30d: requestsResult.total,
      approvedRequests30d: requestsResult.approved,
      approvalRate30d,
      whosOutToday: whosOutTodayResult.count,
      whosOutThisWeek: whosOutThisWeekResult.count,
      upcomingThisMonth: upcomingResult.count
    };
  }

  private async getEngagementMetrics() {
    // Try to get data from stored reports
    const reportSql = `
      SELECT data, metadata
      FROM hibob_report_data
      WHERE report_name LIKE '%engagement%'
      ORDER BY generated_at DESC
      LIMIT 1
    `;

    const reportResult = await getQuery(reportSql);

    if (!reportResult) {
      return {};
    }

    try {
      const data = JSON.parse(reportResult.data);
      const metadata = JSON.parse(reportResult.metadata || '{}');

      return {
        averageEngagementScore: metadata.averageEngagementScore,
        responseRate: metadata.responseRate,
        byDepartment: metadata.byDepartment || {}
      };
    } catch (error) {
      console.warn('Error parsing engagement report data:', error);
      return {};
    }
  }

  // Webhook handling
  async processWebhookEvent(eventType: string, eventId: string, payload: any): Promise<void> {
    // Store the webhook event
    const sql = `
      INSERT OR IGNORE INTO hibob_webhook_events
      (event_type, event_id, resource_type, resource_id, payload)
      VALUES (?, ?, ?, ?, ?)
    `;

    const resourceType = payload.resourceType || eventType.split('.')[0];
    const resourceId = payload.resourceId || payload.id;

    await runQuery(sql, [
      eventType,
      eventId,
      resourceType,
      resourceId,
      JSON.stringify(payload)
    ]);

    // Process the event based on type
    switch (eventType) {
      case 'employee.updated':
        await this.handleEmployeeUpdate(payload);
        break;
      case 'task.changedStatus':
        await this.handleTaskUpdate(payload);
        break;
      case 'timeoff.request.created':
      case 'timeoff.request.updated':
        await this.handleTimeOffUpdate(payload);
        break;
      default:
        console.log(`Unhandled webhook event type: ${eventType}`);
    }

    // Mark as processed
    await runQuery(
      'UPDATE hibob_webhook_events SET processed = 1, processed_at = CURRENT_TIMESTAMP WHERE event_id = ?',
      [eventId]
    );
  }

  private async handleEmployeeUpdate(payload: any): Promise<void> {
    try {
      const employee = await this.peopleService.getEmployeeDetails(payload.employeeId);
      if (employee) {
        await this.upsertEmployee(employee);
      }
    } catch (error) {
      console.error('Error handling employee update:', error);
    }
  }

  private async handleTaskUpdate(payload: any): Promise<void> {
    try {
      // Get updated task details
      const tasks = await this.tasksService.getEmployeeTasks(payload.employeeId);
      const updatedTask = tasks.find(t => t.id === payload.taskId);

      if (updatedTask) {
        await this.upsertTask(updatedTask);
      }
    } catch (error) {
      console.error('Error handling task update:', error);
    }
  }

  private async handleTimeOffUpdate(payload: any): Promise<void> {
    try {
      // Get updated time-off request details
      const requests = await this.timeOffService.getTimeOffRequestsChanges();
      const updatedRequest = requests.find(r => r.requestId === payload.requestId);

      if (updatedRequest) {
        await this.upsertTimeOffRequest(updatedRequest);
      }
    } catch (error) {
      console.error('Error handling time-off update:', error);
    }
  }
}
