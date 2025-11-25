import Database from "better-sqlite3";

export interface UserConfig {
  id?: number;
  workspace_path: string;
  slack_token: string;
  refresh_token?: string | null;
  default_channel?: string | null;
  format_template: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_TEMPLATE = `*EOD Status ({date})*

{summary}

{pending}

{planTomorrow}`;

export function initializeDatabase(dbPath: string = "data/eod-mcp.db"): Database.Database {
  const db = new Database(dbPath);
  
  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_path TEXT NOT NULL UNIQUE,
      slack_token TEXT NOT NULL,
      refresh_token TEXT,
      default_channel TEXT,
      format_template TEXT NOT NULL DEFAULT '${DEFAULT_TEMPLATE.replace(/'/g, "''")}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Create index on workspace_path for faster lookups
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_workspace_path ON users(workspace_path)
  `);

  return db;
}

