import { HiBobApiClient } from './HiBobApiClient';

export interface HiBobTask {
  id: string;
  employeeId: string;
  title: string;
  description?: string;
  listName: string;
  status: 'open' | 'completed' | 'cancelled';
  dueDate?: string;
  createdDate?: string;
  lastUpdated: string;
  priority?: 'low' | 'medium' | 'high';
  assignee?: string;
  completedDate?: string;
}

export interface HiBobTaskCompletionStats {
  totalTasks: number;
  completedTasks: number;
  openTasks: number;
  completionRate: number;
  byDepartment: Record<string, { total: number; completed: number; rate: number }>;
  byAssignee: Record<string, { total: number; completed: number; rate: number }>;
  recentCompletions: HiBobTask[];
}

export class HiBobTasksService {
  private apiClient: HiBobApiClient;

  constructor() {
    this.apiClient = new HiBobApiClient();
  }

  async getOpenTasks(): Promise<HiBobTask[]> {
    return this.apiClient.withRateLimit(async () => {
      const response = await this.apiClient.get<{ tasks: HiBobTask[] }>('/v1/tasks/open');
      return response.tasks || [];
    });
  }

  async getEmployeeTasks(employeeId: string): Promise<HiBobTask[]> {
    return this.apiClient.withRateLimit(async () => {
      const response = await this.apiClient.get<{ tasks: HiBobTask[] }>(`/v1/tasks/employees/${employeeId}`);
      return response.tasks || [];
    });
  }

  async completeTask(taskId: string): Promise<void> {
    return this.apiClient.withRateLimit(async () => {
      await this.apiClient.post(`/v1/tasks/complete`, { taskId });
    });
  }

  // Helper method to get all tasks with optional filtering
  async getAllTasks(status?: 'open' | 'completed' | 'all'): Promise<HiBobTask[]> {
    const tasks: HiBobTask[] = [];

    // Get open tasks
    if (status === 'open' || status === 'all' || !status) {
      const openTasks = await this.getOpenTasks();
      tasks.push(...openTasks);
    }

    // For completed tasks, we'd need to query by employee or maintain a local cache
    // HiBob API primarily exposes open tasks, completed ones need different approach
    if (status === 'completed') {
      // This would require getting tasks for all employees or webhook-based tracking
      console.warn('Getting completed tasks requires employee-by-employee queries or webhook tracking');
    }

    return tasks;
  }

  // Calculate task completion statistics
  async getTaskCompletionStats(
    days: number = 30,
    departmentBreakdown: boolean = true
  ): Promise<HiBobTaskCompletionStats> {
    const openTasks = await this.getOpenTasks();

    // For completion stats, we need historical data
    // This is a simplified version - in practice you'd want to store historical task data
    const totalTasks = openTasks.length;
    const completedTasks = 0; // Would need historical data for this
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const byDepartment: Record<string, { total: number; completed: number; rate: number }> = {};
    const byAssignee: Record<string, { total: number; completed: number; rate: number }> = {};

    // Group by department and assignee (would need employee data for department mapping)
    openTasks.forEach(task => {
      // Department breakdown would require joining with employee data
      const dept = 'Unknown'; // Placeholder - would need employee lookup

      if (!byDepartment[dept]) {
        byDepartment[dept] = { total: 0, completed: 0, rate: 0 };
      }
      byDepartment[dept].total++;

      if (!byAssignee[task.assignee || task.employeeId]) {
        byAssignee[task.assignee || task.employeeId] = { total: 0, completed: 0, rate: 0 };
      }
      byAssignee[task.assignee || task.employeeId].total++;
    });

    // Calculate rates
    Object.keys(byDepartment).forEach(dept => {
      const deptStats = byDepartment[dept];
      deptStats.rate = deptStats.total > 0 ? (deptStats.completed / deptStats.total) * 100 : 0;
    });

    Object.keys(byAssignee).forEach(assignee => {
      const assigneeStats = byAssignee[assignee];
      assigneeStats.rate = assigneeStats.total > 0 ? (assigneeStats.completed / assigneeStats.total) * 100 : 0;
    });

    return {
      totalTasks,
      completedTasks,
      openTasks: totalTasks,
      completionRate,
      byDepartment,
      byAssignee,
      recentCompletions: [] // Would need historical data
    };
  }

  // Get tasks by department (requires employee data for mapping)
  async getTasksByDepartment(): Promise<Record<string, HiBobTask[]>> {
    const openTasks = await this.getOpenTasks();
    const tasksByDepartment: Record<string, HiBobTask[]> = {};

    // This is a simplified version - in practice you'd join with employee data
    openTasks.forEach(task => {
      const dept = 'Unknown'; // Would need employee lookup by task.employeeId
      if (!tasksByDepartment[dept]) {
        tasksByDepartment[dept] = [];
      }
      tasksByDepartment[dept].push(task);
    });

    return tasksByDepartment;
  }

  // Get overdue tasks
  async getOverdueTasks(): Promise<HiBobTask[]> {
    const openTasks = await this.getOpenTasks();
    const now = new Date();

    return openTasks.filter(task => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate < now;
    });
  }

  // Get tasks due soon (next 7 days)
  async getTasksDueSoon(daysAhead: number = 7): Promise<HiBobTask[]> {
    const openTasks = await this.getOpenTasks();
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + daysAhead);

    return openTasks.filter(task => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate >= now && dueDate <= futureDate;
    });
  }
}

