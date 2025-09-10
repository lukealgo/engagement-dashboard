import sqlite3 from 'sqlite3';
import { config } from '../config/environment';

export let db: sqlite3.Database;

export async function setupDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(config.database.url, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      
      console.log('Connected to SQLite database');
      initializeTables()
        .then(() => resolve())
        .catch(reject);
    });
  });
}

async function initializeTables(): Promise<void> {
  const tables = [
    `CREATE TABLE IF NOT EXISTS channels (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_member BOOLEAN DEFAULT 0,
      num_members INTEGER,
      topic TEXT,
      purpose TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      real_name TEXT,
      display_name TEXT,
      is_bot BOOLEAN DEFAULT 0,
      deleted BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    
    `CREATE TABLE IF NOT EXISTS messages (
      ts TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL,
      user_id TEXT,
      text TEXT NOT NULL,
      thread_ts TEXT,
      reply_count INTEGER DEFAULT 0,
      reaction_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (channel_id) REFERENCES channels(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS reactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      message_ts TEXT NOT NULL,
      name TEXT NOT NULL,
      count INTEGER DEFAULT 1,
      users TEXT NOT NULL, -- JSON array of user IDs
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (message_ts) REFERENCES messages(ts)
    )`,
    
    `CREATE TABLE IF NOT EXISTS engagement_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      channel_id TEXT NOT NULL,
      date DATE NOT NULL,
      message_count INTEGER DEFAULT 0,
      user_count INTEGER DEFAULT 0,
      reaction_count INTEGER DEFAULT 0,
      thread_count INTEGER DEFAULT 0,
      avg_message_length REAL DEFAULT 0,
      engagement_score REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (channel_id) REFERENCES channels(id),
      UNIQUE(channel_id, date)
    )`,
    
    `CREATE TABLE IF NOT EXISTS user_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      date DATE NOT NULL,
      message_count INTEGER DEFAULT 0,
      reaction_count INTEGER DEFAULT 0,
      thread_count INTEGER DEFAULT 0,
      avg_message_length REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (channel_id) REFERENCES channels(id),
      UNIQUE(user_id, channel_id, date)
    )`,

    // HiBob Tables
    `CREATE TABLE IF NOT EXISTS hibob_employees (
      id TEXT PRIMARY KEY,
      display_name TEXT NOT NULL,
      email TEXT,
      manager_id TEXT,
      department TEXT,
      site TEXT,
      job_title TEXT,
      start_date DATE,
      status TEXT,
      avatar_url TEXT,
      employment_status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS hibob_lifecycle_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL,
      effective_date DATE NOT NULL,
      status TEXT NOT NULL,
      reason TEXT,
      type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES hibob_employees(id)
    )`,

    `CREATE TABLE IF NOT EXISTS hibob_tasks (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      list_name TEXT NOT NULL,
      status TEXT NOT NULL,
      due_date DATE,
      created_date DATE,
      last_updated DATETIME NOT NULL,
      priority TEXT,
      assignee TEXT,
      completed_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES hibob_employees(id)
    )`,

    `CREATE TABLE IF NOT EXISTS hibob_time_off_requests (
      request_id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      policy_type TEXT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      dates TEXT NOT NULL, -- JSON array
      duration REAL NOT NULL,
      duration_unit TEXT NOT NULL,
      status TEXT NOT NULL,
      reason TEXT,
      created_at DATETIME NOT NULL,
      updated_at DATETIME,
      approved_at DATETIME,
      db_created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      db_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES hibob_employees(id)
    )`,

    `CREATE TABLE IF NOT EXISTS hibob_time_off_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL,
      date DATE NOT NULL,
      portion TEXT NOT NULL,
      policy_type TEXT NOT NULL,
      request_id TEXT,
      approval_status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES hibob_employees(id),
      FOREIGN KEY (request_id) REFERENCES hibob_time_off_requests(request_id),
      UNIQUE(employee_id, date, request_id)
    )`,

    `CREATE TABLE IF NOT EXISTS hibob_time_off_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL,
      policy_type TEXT NOT NULL,
      balance REAL NOT NULL,
      taken REAL DEFAULT 0,
      pending REAL DEFAULT 0,
      accrued REAL DEFAULT 0,
      carried_over REAL DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES hibob_employees(id),
      UNIQUE(employee_id, policy_type)
    )`,

    `CREATE TABLE IF NOT EXISTS hibob_work_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL,
      effective_date DATE NOT NULL,
      department TEXT,
      site TEXT,
      manager TEXT,
      job_title TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES hibob_employees(id)
    )`,

    `CREATE TABLE IF NOT EXISTS hibob_report_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      report_name TEXT NOT NULL,
      data TEXT NOT NULL, -- JSON
      metadata TEXT, -- JSON
      generated_at DATETIME NOT NULL,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(report_name, generated_at)
    )`,

    `CREATE TABLE IF NOT EXISTS hibob_engagement_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric_type TEXT NOT NULL,
      value REAL NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      department TEXT,
      site TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS hibob_webhook_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      event_id TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id TEXT NOT NULL,
      payload TEXT NOT NULL, -- JSON
      processed BOOLEAN DEFAULT 0,
      processed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(event_type, event_id)
    )`,

    // Webinar Tables
    `CREATE TABLE IF NOT EXISTS webinar_hosts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS webinars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      host_id INTEGER NOT NULL,
      meeting_code TEXT,
      total_attendees INTEGER DEFAULT 0,
      unique_attendees INTEGER DEFAULT 0,
      average_duration TEXT DEFAULT '00:00:00',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (host_id) REFERENCES webinar_hosts(id)
    )`,

    `CREATE TABLE IF NOT EXISTS webinar_attendees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      webinar_id INTEGER NOT NULL,
      participant_name TEXT NOT NULL,
      attendance_started_at DATETIME,
      joined_at DATETIME,
      attendance_stopped_at DATETIME,
      attended_duration TEXT NOT NULL,
      meeting_code TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (webinar_id) REFERENCES webinars(id)
    )`
  ];

  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_engagement_metrics_channel_date ON engagement_metrics(channel_id, date)`,
    `CREATE INDEX IF NOT EXISTS idx_user_activity_user_channel_date ON user_activity(user_id, channel_id, date)`,

    // HiBob Indexes
    `CREATE INDEX IF NOT EXISTS idx_hibob_employees_department ON hibob_employees(department)`,
    `CREATE INDEX IF NOT EXISTS idx_hibob_employees_manager ON hibob_employees(manager_id)`,
    `CREATE INDEX IF NOT EXISTS idx_hibob_employees_site ON hibob_employees(site)`,
    `CREATE INDEX IF NOT EXISTS idx_hibob_employees_status ON hibob_employees(status)`,
    `CREATE INDEX IF NOT EXISTS idx_hibob_lifecycle_employee_date ON hibob_lifecycle_events(employee_id, effective_date)`,
    `CREATE INDEX IF NOT EXISTS idx_hibob_tasks_employee ON hibob_tasks(employee_id)`,
    `CREATE INDEX IF NOT EXISTS idx_hibob_tasks_status ON hibob_tasks(status)`,
    `CREATE INDEX IF NOT EXISTS idx_hibob_tasks_due_date ON hibob_tasks(due_date)`,
    `CREATE INDEX IF NOT EXISTS idx_hibob_time_off_requests_employee ON hibob_time_off_requests(employee_id)`,
    `CREATE INDEX IF NOT EXISTS idx_hibob_time_off_requests_status ON hibob_time_off_requests(status)`,
    `CREATE INDEX IF NOT EXISTS idx_hibob_time_off_requests_dates ON hibob_time_off_requests(start_date, end_date)`,
    `CREATE INDEX IF NOT EXISTS idx_hibob_time_off_entries_employee_date ON hibob_time_off_entries(employee_id, date)`,
    `CREATE INDEX IF NOT EXISTS idx_hibob_time_off_balances_employee ON hibob_time_off_balances(employee_id)`,
    `CREATE INDEX IF NOT EXISTS idx_hibob_work_history_employee_date ON hibob_work_history(employee_id, effective_date)`,
    `CREATE INDEX IF NOT EXISTS idx_hibob_report_data_name ON hibob_report_data(report_name)`,
    `CREATE INDEX IF NOT EXISTS idx_hibob_engagement_metrics_type_period ON hibob_engagement_metrics(metric_type, period_start, period_end)`,
    `CREATE INDEX IF NOT EXISTS idx_hibob_webhook_events_type ON hibob_webhook_events(event_type)`,
    `CREATE INDEX IF NOT EXISTS idx_hibob_webhook_events_processed ON hibob_webhook_events(processed)`,

    // Webinar Indexes
    `CREATE INDEX IF NOT EXISTS idx_webinars_host_id ON webinars(host_id)`,
    `CREATE INDEX IF NOT EXISTS idx_webinars_created_at ON webinars(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_webinar_attendees_webinar_id ON webinar_attendees(webinar_id)`,
    `CREATE INDEX IF NOT EXISTS idx_webinar_attendees_participant_name ON webinar_attendees(participant_name)`,
    `CREATE INDEX IF NOT EXISTS idx_webinar_hosts_name ON webinar_hosts(name)`
  ];

  for (const table of tables) {
    await runQuery(table);
  }
  
  for (const index of indexes) {
    await runQuery(index);
  }
  
  console.log('Database tables initialized successfully');
}

export function runQuery(sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

export function getQuery(sql: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

export function allQuery(sql: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}