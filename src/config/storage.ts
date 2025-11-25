import type { UserConfig } from "./schema.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure data directory exists
// When running from dist/, go up to project root, then into data/
const dataDir = join(__dirname, "../../data");
try {
  mkdirSync(dataDir, { recursive: true });
} catch (err) {
  // Directory might already exist
}

const dbPath = join(dataDir, "eod-mcp.json");

interface StorageData {
  users: UserConfig[];
}

function loadData(): StorageData {
  if (!existsSync(dbPath)) {
    return { users: [] };
  }
  try {
    const content = readFileSync(dbPath, "utf-8");
    return JSON.parse(content) as StorageData;
  } catch (err) {
    return { users: [] };
  }
}

function saveData(data: StorageData): void {
  writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf-8");
}

export class UserConfigStorage {
  getUserConfig(workspacePath: string): UserConfig | null {
    const data = loadData();
    const user = data.users.find((u) => u.workspace_path === workspacePath);
    return user || null;
  }

  createUserConfig(config: Omit<UserConfig, "id" | "created_at" | "updated_at">): UserConfig {
    const data = loadData();
    
    // Generate ID
    const maxId = data.users.reduce((max, u) => Math.max(max, u.id || 0), 0);
    const newId = maxId + 1;
    
    const now = new Date().toISOString();
    const userConfig: UserConfig = {
      id: newId,
      workspace_path: config.workspace_path,
      slack_token: config.slack_token,
      refresh_token: config.refresh_token || null,
      default_channel: config.default_channel || null,
      format_template: config.format_template,
      created_at: now,
      updated_at: now,
    };

    data.users.push(userConfig);
    saveData(data);
    return userConfig;
  }

  updateUserConfig(workspacePath: string, updates: Partial<Omit<UserConfig, "id" | "workspace_path" | "created_at">>): UserConfig | null {
    const data = loadData();
    const index = data.users.findIndex((u) => u.workspace_path === workspacePath);
    
    if (index === -1) {
      return null;
    }

    const current = data.users[index]!;
    const updated: UserConfig = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    data.users[index] = updated;
    saveData(data);
    return updated;
  }

  deleteUserConfig(workspacePath: string): boolean {
    const data = loadData();
    const initialLength = data.users.length;
    data.users = data.users.filter((u) => u.workspace_path !== workspacePath);
    
    if (data.users.length < initialLength) {
      saveData(data);
      return true;
    }
    return false;
  }

  getAllUserConfigs(): UserConfig[] {
    const data = loadData();
    return data.users;
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
