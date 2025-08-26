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
    )`
  ];

  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_engagement_metrics_channel_date ON engagement_metrics(channel_id, date)`,
    `CREATE INDEX IF NOT EXISTS idx_user_activity_user_channel_date ON user_activity(user_id, channel_id, date)`
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