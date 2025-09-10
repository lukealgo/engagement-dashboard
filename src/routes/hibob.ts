import { Router } from 'express';
import { HiBobService } from '../services/HiBobService';

const router = Router();
const hibobService = new HiBobService();

// Dashboard metrics endpoint
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await hibobService.getDashboardMetrics();
    res.json(metrics);
  } catch (error) {
    console.error('Error fetching HiBob metrics:', error);
    res.status(500).json({ error: 'Failed to fetch HiBob metrics' });
  }
});

// Sync endpoints
router.post('/sync', async (req, res) => {
  try {
    await hibobService.syncAllData();
    res.json({ message: 'HiBob data sync completed successfully' });
  } catch (error) {
    console.error('Error syncing HiBob data:', error);
    res.status(500).json({ error: 'Failed to sync HiBob data' });
  }
});

router.post('/sync/employees', async (req, res) => {
  try {
    await hibobService.syncEmployees();
    res.json({ message: 'Employee data sync completed successfully' });
  } catch (error) {
    console.error('Error syncing employee data:', error);
    res.status(500).json({ error: 'Failed to sync employee data' });
  }
});

router.post('/sync/tasks', async (req, res) => {
  try {
    await hibobService.syncTasks();
    res.json({ message: 'Task data sync completed successfully' });
  } catch (error) {
    console.error('Error syncing task data:', error);
    res.status(500).json({ error: 'Failed to sync task data' });
  }
});

router.post('/sync/timeoff', async (req, res) => {
  try {
    await hibobService.syncTimeOffData();
    res.json({ message: 'Time-off data sync completed successfully' });
  } catch (error) {
    console.error('Error syncing time-off data:', error);
    res.status(500).json({ error: 'Failed to sync time-off data' });
  }
});

router.post('/sync/reports', async (req, res) => {
  try {
    await hibobService.syncReports();
    res.json({ message: 'Report data sync completed successfully' });
  } catch (error) {
    console.error('Error syncing report data:', error);
    res.status(500).json({ error: 'Failed to sync report data' });
  }
});

// Individual data endpoints
router.get('/employees', async (req, res) => {
  try {
    const { department, site, status, limit = '100', offset = '0' } = req.query;

    let whereClause = '';
    const params: any[] = [];

    if (department) {
      whereClause += ' AND department = ?';
      params.push(department);
    }

    if (site) {
      whereClause += ' AND site = ?';
      params.push(site);
    }

    if (status) {
      whereClause += ' AND employment_status = ?';
      params.push(status);
    }

    const sql = `
      SELECT * FROM hibob_employees
      WHERE 1=1 ${whereClause}
      ORDER BY display_name
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit as string), parseInt(offset as string));

    const { allQuery } = await import('../database/setup');
    const employees = await allQuery(sql, params);

    res.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

router.get('/employees/:id', async (req, res) => {
  try {
    const { getQuery } = await import('../database/setup');
    const employee = await getQuery('SELECT * FROM hibob_employees WHERE id = ?', [req.params.id]);

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(employee);
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: 'Failed to fetch employee' });
  }
});

router.get('/tasks', async (req, res) => {
  try {
    const { status, employee_id, department, limit = '100', offset = '0' } = req.query;

    let whereClause = '';
    const params: any[] = [];

    if (status) {
      whereClause += ' AND t.status = ?';
      params.push(status);
    }

    if (employee_id) {
      whereClause += ' AND t.employee_id = ?';
      params.push(employee_id);
    }

    if (department) {
      whereClause += ' AND e.department = ?';
      params.push(department);
    }

    const sql = `
      SELECT t.*, e.display_name as employee_name, e.department
      FROM hibob_tasks t
      LEFT JOIN hibob_employees e ON t.employee_id = e.id
      WHERE 1=1 ${whereClause}
      ORDER BY t.last_updated DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit as string), parseInt(offset as string));

    const { allQuery } = await import('../database/setup');
    const tasks = await allQuery(sql, params);

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.get('/timeoff/requests', async (req, res) => {
  try {
    const { status, employee_id, department, days = '30', limit = '100', offset = '0' } = req.query;

    let whereClause = ' AND r.created_at >= DATE("now", "-' + days + ' days")';
    const params: any[] = [];

    if (status) {
      whereClause += ' AND r.status = ?';
      params.push(status);
    }

    if (employee_id) {
      whereClause += ' AND r.employee_id = ?';
      params.push(employee_id);
    }

    if (department) {
      whereClause += ' AND e.department = ?';
      params.push(department);
    }

    const sql = `
      SELECT r.*, e.display_name as employee_name, e.department
      FROM hibob_time_off_requests r
      LEFT JOIN hibob_employees e ON r.employee_id = e.id
      WHERE 1=1 ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit as string), parseInt(offset as string));

    const { allQuery } = await import('../database/setup');
    const requests = await allQuery(sql, params);

    res.json(requests);
  } catch (error) {
    console.error('Error fetching time-off requests:', error);
    res.status(500).json({ error: 'Failed to fetch time-off requests' });
  }
});

router.get('/timeoff/whosout', async (req, res) => {
  try {
    const { from, to, department } = req.query;

    const fromDate = from || new Date().toISOString().split('T')[0];
    const toDate = to || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let whereClause = ' AND te.date BETWEEN ? AND ?';
    const params: any[] = [fromDate, toDate];

    if (department) {
      whereClause += ' AND e.department = ?';
      params.push(department);
    }

    const sql = `
      SELECT te.*, e.display_name as employee_name, e.department, e.site
      FROM hibob_time_off_entries te
      LEFT JOIN hibob_employees e ON te.employee_id = e.id
      WHERE 1=1 ${whereClause}
      ORDER BY te.date, e.display_name
    `;

    const { allQuery } = await import('../database/setup');
    const entries = await allQuery(sql, params);

    res.json(entries);
  } catch (error) {
    console.error('Error fetching who\'s out:', error);
    res.status(500).json({ error: 'Failed to fetch who\'s out' });
  }
});

router.get('/timeoff/calendar', async (req, res) => {
  try {
    const { from, to } = req.query;

    const fromDate = from || new Date().toISOString().split('T')[0];
    const toDate = to || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const sql = `
      SELECT
        date,
        COUNT(DISTINCT employee_id) as total_out,
        GROUP_CONCAT(DISTINCT policy_type) as policy_types,
        GROUP_CONCAT(DISTINCT e.department) as departments
      FROM hibob_time_off_entries te
      LEFT JOIN hibob_employees e ON te.employee_id = e.id
      WHERE date BETWEEN ? AND ?
      GROUP BY date
      ORDER BY date
    `;

    const { allQuery } = await import('../database/setup');
    const calendar = await allQuery(sql, [fromDate, toDate]);

    res.json(calendar);
  } catch (error) {
    console.error('Error fetching time-off calendar:', error);
    res.status(500).json({ error: 'Failed to fetch time-off calendar' });
  }
});

router.get('/reports', async (req, res) => {
  try {
    const sql = `
      SELECT * FROM hibob_report_data
      ORDER BY generated_at DESC
    `;

    const { allQuery } = await import('../database/setup');
    const reports = await allQuery(sql);

    // Parse JSON data for each report
    const parsedReports = reports.map((report: any) => ({
      ...report,
      data: JSON.parse(report.data),
      metadata: report.metadata ? JSON.parse(report.metadata) : null
    }));

    res.json(parsedReports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

router.get('/reports/:name', async (req, res) => {
  try {
    const sql = `
      SELECT * FROM hibob_report_data
      WHERE report_name = ?
      ORDER BY generated_at DESC
      LIMIT 1
    `;

    const { getQuery } = await import('../database/setup');
    const report = await getQuery(sql, [req.params.name]);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Parse JSON data
    const parsedReport = {
      ...report,
      data: JSON.parse(report.data),
      metadata: report.metadata ? JSON.parse(report.metadata) : null
    };

    res.json(parsedReport);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

router.get('/org-mobility', async (req, res) => {
  try {
    const { days = '90' } = req.query;

    const sql = `
      SELECT
        wh.*,
        e.display_name as employee_name
      FROM hibob_work_history wh
      LEFT JOIN hibob_employees e ON wh.employee_id = e.id
      WHERE wh.effective_date >= DATE('now', '-${days} days')
      ORDER BY wh.effective_date DESC
    `;

    const { allQuery } = await import('../database/setup');
    const mobility = await allQuery(sql);

    res.json(mobility);
  } catch (error) {
    console.error('Error fetching org mobility:', error);
    res.status(500).json({ error: 'Failed to fetch org mobility' });
  }
});

router.get('/tenure', async (req, res) => {
  try {
    const sql = `
      SELECT
        id,
        display_name,
        start_date,
        department,
        site,
        ROUND(JULIANDAY('now') - JULIANDAY(start_date)) / 365.25 as tenure_years
      FROM hibob_employees
      WHERE employment_status = 'Employed' AND start_date IS NOT NULL
      ORDER BY tenure_years DESC
    `;

    const { allQuery } = await import('../database/setup');
    const tenure = await allQuery(sql);

    // Get upcoming anniversaries (next 30 days)
    const anniversarySql = `
      SELECT
        id,
        display_name,
        start_date,
        department,
        ROUND(JULIANDAY('now') - JULIANDAY(start_date)) / 365.25 as current_tenure_years,
        ROUND(JULIANDAY(DATE(start_date, '+' || (ROUND(JULIANDAY('now') - JULIANDAY(start_date)) / 365.25 + 1) || ' years')) - JULIANDAY('now')) as days_to_next_anniversary
      FROM hibob_employees
      WHERE employment_status = 'Employed'
        AND start_date IS NOT NULL
        AND days_to_next_anniversary BETWEEN 0 AND 30
      ORDER BY days_to_next_anniversary
    `;

    const anniversaries = await allQuery(anniversarySql);

    res.json({
      tenure,
      upcomingAnniversaries: anniversaries
    });
  } catch (error) {
    console.error('Error fetching tenure data:', error);
    res.status(500).json({ error: 'Failed to fetch tenure data' });
  }
});

// Test endpoint for debugging
router.get('/test', async (req, res) => {
  try {
    const { HiBobApiClient } = await import('../services/HiBobApiClient');
    const client = new HiBobApiClient();

    // Test the API directly with detailed logging
    console.log('Testing HiBob API connection...');

    // First try the search endpoint
    const searchResponse = await client.post('/v1/people/search', {
      fields: ['id', 'firstName', 'lastName', 'displayName', 'email', 'department', 'site', 'manager', 'work'],
      limit: 3
    }) as { employees: any[] };

    console.log('HiBob API search response:', JSON.stringify(searchResponse, null, 2));

    // If search only returns IDs, try getting detailed info for one employee
    let detailedResponse = null;
    if (searchResponse.employees && searchResponse.employees.length > 0) {
      const employeeId = searchResponse.employees[0].id;
      console.log(`Trying to get detailed info for employee ${employeeId}...`);

      try {
        detailedResponse = await client.post(`/v1/people/fields-by-employee-id`, {
          employeeId: employeeId,
          fields: ['id', 'firstName', 'lastName', 'displayName', 'email', 'department', 'site', 'manager', 'work']
        });
        console.log('Detailed employee response:', JSON.stringify(detailedResponse, null, 2));
      } catch (error) {
        console.log('Detailed employee endpoint failed:', error);
      }
    }

    const response = searchResponse;

    console.log('HiBob API response:', JSON.stringify(response, null, 2));

    // Log what fields are actually available
    if (response.employees && response.employees.length > 0) {
      console.log('First employee fields:', Object.keys(response.employees[0]));
      console.log('First employee data:', response.employees[0]);
    }

    res.json({
      success: true,
      data: response,
      fieldAnalysis: response.employees && response.employees.length > 0 ? {
        availableFields: Object.keys(response.employees[0]),
        sampleData: response.employees[0]
      } : null,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});

// Test onboarding wizards endpoint
router.get('/test/onboarding', async (req, res) => {
  try {
    const { HiBobApiClient } = await import('../services/HiBobApiClient');
    const client = new HiBobApiClient();

    console.log('Testing HiBob onboarding wizards endpoint...');
    const response = await client.get('/v1/onboarding/wizards');

    res.json({
      success: true,
      data: response,
      endpoint: '/v1/onboarding/wizards',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Onboarding endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      endpoint: '/v1/onboarding/wizards',
      timestamp: new Date().toISOString()
    });
  }
});

// Test training endpoint for a specific employee
router.get('/test/training/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { HiBobApiClient } = await import('../services/HiBobApiClient');
    const client = new HiBobApiClient();

    console.log(`Testing HiBob training endpoint for employee ${employeeId}...`);
    const response = await client.get(`/v1/people/${employeeId}/training`);

    res.json({
      success: true,
      data: response,
      endpoint: `/v1/people/${employeeId}/training`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Training endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      endpoint: `/v1/people/${req.params.employeeId}/training`,
      timestamp: new Date().toISOString()
    });
  }
});

// Test activity/login history endpoint (if available)
router.get('/test/activity', async (req, res) => {
  try {
    const { HiBobApiClient } = await import('../services/HiBobApiClient');
    const client = new HiBobApiClient();

    console.log('Testing HiBob activity/login history endpoints...');

    const endpoints = [
      '/v1/activity/logins',
      '/v1/audit/activity',
      '/v1/users/activity',
      '/v1/security/login-history',
      '/v1/audit/logins'
    ];

    const results: Record<string, any> = {};

    for (const endpoint of endpoints) {
      try {
        console.log(`Testing ${endpoint}...`);
        const response = await client.get(endpoint);
        results[endpoint] = { success: true, data: response };
      } catch (error: any) {
        console.log(`${endpoint} failed:`, error.message);
        results[endpoint] = { success: false, error: error.message };
      }
    }

    res.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Activity endpoints error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test social features / kudos endpoints
router.get('/test/social', async (req, res) => {
  try {
    const { HiBobApiClient } = await import('../services/HiBobApiClient');
    const client = new HiBobApiClient();

    console.log('Testing HiBob social/kudos endpoints...');

    const endpoints = [
      '/v1/social/kudos',
      '/v1/kudos/posts',
      '/v1/social/posts',
      '/v1/engagement/kudos',
      '/v1/recognition/posts',
      '/v1/social/activity'
    ];

    const results: Record<string, any> = {};

    for (const endpoint of endpoints) {
      try {
        console.log(`Testing ${endpoint}...`);
        const response = await client.get(endpoint);
        results[endpoint] = { success: true, data: response };
      } catch (error: any) {
        console.log(`${endpoint} failed:`, error.message);
        results[endpoint] = { success: false, error: error.message };
      }
    }

    res.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Social endpoints error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Test chat/messaging endpoints
router.get('/test/chat', async (req, res) => {
  try {
    const { HiBobApiClient } = await import('../services/HiBobApiClient');
    const client = new HiBobApiClient();

    console.log('Testing HiBob chat/messaging endpoints...');

    const endpoints = [
      '/v1/chat/messages',
      '/v1/messaging/history',
      '/v1/communication/messages',
      '/v1/social/messages',
      '/v1/conversations'
    ];

    const results: Record<string, any> = {};

    for (const endpoint of endpoints) {
      try {
        console.log(`Testing ${endpoint}...`);
        const response = await client.get(endpoint);
        results[endpoint] = { success: true, data: response };
      } catch (error: any) {
        console.log(`${endpoint} failed:`, error.message);
        results[endpoint] = { success: false, error: error.message };
      }
    }

    res.json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Chat endpoints error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Webhook endpoint
router.post('/webhook', async (req, res) => {
  try {
    const { eventType, eventId, payload } = req.body;

    if (!eventType || !eventId || !payload) {
      return res.status(400).json({ error: 'Missing required webhook fields' });
    }

    await hibobService.processWebhookEvent(eventType, eventId, payload);

    res.json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

export { router as hibobRouter };
