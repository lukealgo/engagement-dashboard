import { HiBobApiClient } from './HiBobApiClient';

export interface HiBobEmployee {
  id: string;
  displayName: string;
  email?: string;
  managerId?: string;
  department?: string;
  site?: string;
  jobTitle?: string;
  startDate?: string;
  status?: string;
  avatarUrl?: string;
  employment?: {
    startDate?: string;
    status?: string;
  };
  work?: {
    department?: string;
    site?: string;
    manager?: string;
    reportsTo?: string;
  };
  about?: {
    displayName?: string;
    email?: string;
    avatarUrl?: string;
  };
}

export interface HiBobPublicProfile {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

export interface HiBobWorkHistory {
  employeeId: string;
  effectiveDate: string;
  department?: string;
  site?: string;
  manager?: string;
  jobTitle?: string;
}

export interface HiBobLifecycleEvent {
  employeeId: string;
  effectiveDate: string;
  status: string;
  reason?: string;
  type?: string;
}

export interface PeopleSearchParams {
  fields?: string[];
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
}

export class HiBobPeopleService {
  private apiClient: HiBobApiClient;

  constructor() {
    this.apiClient = new HiBobApiClient();
  }

  async searchPeople(params: PeopleSearchParams = {}): Promise<HiBobEmployee[]> {
    const {
      fields = ['id', 'firstName', 'lastName', 'displayName', 'email'], // Try different field names
      limit = 10, // Start with smaller limit for testing
      offset = 0,
      filters = {}
    } = params;

    console.log('HiBobPeopleService: Searching for employees with params:', { fields, limit, offset, filters });

    return this.apiClient.withRateLimit(async () => {
      const response = await this.apiClient.post<{ employees: HiBobEmployee[] }>('/v1/people/search', {
        fields,
        limit,
        offset,
        ...filters
      });

      console.log(`HiBobPeopleService: Received ${response.employees?.length || 0} employees from search`);

      let employees = response.employees || [];

      // If search only returns IDs, try to get detailed info for each employee
      if (employees.length > 0 && Object.keys(employees[0]).length === 1 && employees[0].id) {
        console.log('HiBobPeopleService: Search only returned IDs, trying detailed endpoint...');

        const detailedEmployees: HiBobEmployee[] = [];

        // Only get details for first few employees for testing
        const employeesToFetch = Math.min(employees.length, 3);

        for (let i = 0; i < employeesToFetch; i++) {
          const employeeId = employees[i].id;
          try {
            console.log(`HiBobPeopleService: Getting details for employee ${employeeId}...`);
            const detailedResponse = await this.apiClient.post<{ employee: HiBobEmployee }>(`/v1/people/fields-by-employee-id`, {
              employeeId: employeeId,
              fields: ['id', 'firstName', 'lastName', 'displayName', 'email', 'department', 'site', 'manager', 'work']
            });

            if (detailedResponse.employee) {
              detailedEmployees.push(detailedResponse.employee);
              console.log(`HiBobPeopleService: Got detailed info for ${employeeId}`);
            }
          } catch (error) {
            console.warn(`HiBobPeopleService: Failed to get details for ${employeeId}:`, error);
            // Keep the basic employee info if detailed fetch fails
            detailedEmployees.push(employees[i]);
          }
        }

        // For remaining employees, use basic info
        for (let i = employeesToFetch; i < employees.length; i++) {
          detailedEmployees.push(employees[i]);
        }

        employees = detailedEmployees;
      }

      // Log detailed field analysis for first employee
      if (employees.length > 0) {
        const firstEmployee = employees[0];
        console.log('HiBobPeopleService: Final first employee fields:', Object.keys(firstEmployee));
        console.log('HiBobPeopleService: Final first employee data:', JSON.stringify(firstEmployee, null, 2));

        // Check for displayName specifically
        if (!firstEmployee.displayName && !(firstEmployee as any).firstName && !(firstEmployee as any).lastName) {
          console.warn('HiBobPeopleService: WARNING - displayName, firstName, and lastName are all missing!');
          console.log('HiBobPeopleService: Available fields:', Object.keys(firstEmployee));
        }
      }

      return employees;
    }, 1000); // 50/min = ~1.2s between requests
  }

  async getPublicProfiles(): Promise<HiBobPublicProfile[]> {
    return this.apiClient.withRateLimit(async () => {
      const response = await this.apiClient.get<{ employees: HiBobPublicProfile[] }>('/v1/people/public-profile');
      return response.employees || [];
    });
  }

  async getEmployeeDetails(employeeId: string, fields?: string[]): Promise<HiBobEmployee | null> {
    const defaultFields = [
      'displayName', 'email', 'department', 'manager', 'site',
      'employment.startDate', 'employment.status', 'work', 'about'
    ];

    return this.apiClient.withRateLimit(async () => {
      const response = await this.apiClient.post<{ employee: HiBobEmployee }>(`/v1/people/fields-by-employee-id`, {
        employeeId,
        fields: fields || defaultFields
      });

      return response.employee || null;
    }, 500); // 100/min = ~0.6s between requests
  }

  async getWorkHistory(employeeId: string): Promise<HiBobWorkHistory[]> {
    return this.apiClient.withRateLimit(async () => {
      const response = await this.apiClient.get<{ history: HiBobWorkHistory[] }>(`/v1/tables/work/history?employeeId=${employeeId}`);
      return response.history || [];
    });
  }

  async getBulkWorkHistory(): Promise<HiBobWorkHistory[]> {
    return this.apiClient.withRateLimit(async () => {
      const response = await this.apiClient.get<{ history: HiBobWorkHistory[] }>(`/v1/tables/work/history`);
      return response.history || [];
    });
  }

  async getLifecycleHistory(employeeId: string): Promise<HiBobLifecycleEvent[]> {
    return this.apiClient.withRateLimit(async () => {
      const response = await this.apiClient.get<{ history: HiBobLifecycleEvent[] }>(`/v1/tables/lifecycle/history?employeeId=${employeeId}`);
      return response.history || [];
    });
  }

  async getBulkLifecycleHistory(): Promise<HiBobLifecycleEvent[]> {
    return this.apiClient.withRateLimit(async () => {
      const response = await this.apiClient.get<{ history: HiBobLifecycleEvent[] }>(`/v1/tables/lifecycle/history`);
      return response.history || [];
    });
  }

  // Helper method to get all active employees
  async getAllActiveEmployees(): Promise<HiBobEmployee[]> {
    const employees = await this.searchPeople({
      fields: ['id', 'displayName', 'email', 'department', 'manager', 'site', 'employment.startDate', 'employment.status'],
      filters: {
        'employment.status': 'Employed'
      }
    });

    return employees.filter(emp => emp.status === 'Employed' || emp.employment?.status === 'Employed');
  }

  // Helper method to get headcount metrics
  async getHeadcountMetrics(): Promise<{
    total: number;
    byDepartment: Record<string, number>;
    bySite: Record<string, number>;
  }> {
    // Since we don't have detailed employee data, let's count all employees from the database
    // In a real implementation, we'd filter by employment status, but we work with what we have
    const allEmployees = await this.searchPeople({ limit: 1000 }); // Get as many as possible

    const byDepartment: Record<string, number> = {};
    const bySite: Record<string, number> = {};

    allEmployees.forEach(emp => {
      const dept = emp.department || emp.work?.department || 'Unknown';
      const site = emp.site || emp.work?.site || 'Unknown';

      byDepartment[dept] = (byDepartment[dept] || 0) + 1;
      bySite[site] = (bySite[site] || 0) + 1;
    });

    return {
      total: allEmployees.length,
      byDepartment,
      bySite
    };
  }
}
