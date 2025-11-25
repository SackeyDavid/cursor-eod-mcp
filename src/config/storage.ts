import Database from "better-sqlite3";
import type { UserConfig } from "./schema.js";
import { initializeDatabase } from "./schema.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure data directory exists
const dataDir = join(__dirname, "../../data");
try {
  mkdirSync(dataDir, { recursive: true });
} catch (err) {
  // Directory might already exist
}

const dbPath = join(dataDir, "eod-mcp.db");
let db: Database.Database | null = null;

function getDatabase(): Database.Database {
  if (!db) {
    db = initializeDatabase(dbPath);
  }
  return db;
}

export class UserConfigStorage {
  private db: Database.Database;

  constructor() {
    this.db = getDatabase();
  }

  getUserConfig(workspacePath: string): UserConfig | null {
    const stmt = this.db.prepare("SELECT * FROM users WHERE workspace_path = ?");
    const result = stmt.get(workspacePath) as UserConfig | undefined;
    return result || null;
  }

  createUserConfig(config: Omit<UserConfig, "id" | "created_at" | "updated_at">): UserConfig {
    const stmt = this.db.prepare(`
      INSERT INTO users (workspace_path, slack_token, refresh_token, default_channel, format_template)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      config.workspace_path,
      config.slack_token,
      config.refresh_token || null,
      config.default_channel || null,
      config.format_template
    );

    return this.getUserConfig(config.workspace_path)!;
  }

  updateUserConfig(workspacePath: string, updates: Partial<Omit<UserConfig, "id" | "workspace_path" | "created_at">>): UserConfig | null {
    const current = this.getUserConfig(workspacePath);
    if (!current) {
      return null;
    }

    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.slack_token !== undefined) {
      fields.push("slack_token = ?");
      values.push(updates.slack_token);
    }
    if (updates.refresh_token !== undefined) {
      fields.push("refresh_token = ?");
      values.push(updates.refresh_token);
    }
    if (updates.default_channel !== undefined) {
      fields.push("default_channel = ?");
      values.push(updates.default_channel);
    }
    if (updates.format_template !== undefined) {
      fields.push("format_template = ?");
      values.push(updates.format_template);
    }

    if (fields.length === 0) {
      return current;
    }

    fields.push("updated_at = datetime('now')");
    values.push(workspacePath);

    const stmt = this.db.prepare(`
      UPDATE users SET ${fields.join(", ")} WHERE workspace_path = ?
    `);
    stmt.run(...values);

    return this.getUserConfig(workspacePath);
  }

  deleteUserConfig(workspacePath: string): boolean {
    const stmt = this.db.prepare("DELETE FROM users WHERE workspace_path = ?");
    const result = stmt.run(workspacePath);
    return result.changes > 0;
  }

  getAllUserConfigs(): UserConfig[] {
    const stmt = this.db.prepare("SELECT * FROM users");
    return stmt.all() as UserConfig[];
  }
}

// Singleton instance
let storageInstance: UserConfigStorage | null = null;

export function getUserConfigStorage(): UserConfigStorage {
  if (!storageInstance) {
    storageInstance = new UserConfigStorage();
  }
  return storageInstance;
}

