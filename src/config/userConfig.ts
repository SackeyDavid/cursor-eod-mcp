import { UserConfigStorage, getUserConfigStorage } from "./storage.js";
import type { UserConfig } from "./schema.js";

export class UserConfigManager {
  private storage: UserConfigStorage;

  constructor() {
    this.storage = getUserConfigStorage();
  }

  /**
   * Get user config for a workspace, or create default if not exists
   */
  getOrCreateConfig(workspacePath: string): UserConfig | null {
    let config = this.storage.getUserConfig(workspacePath);
    
    if (!config) {
      // Return null if no config exists - user needs to configure first
      return null;
    }
    
    return config;
  }

  /**
   * Get workspace path from environment or use default
   */
  getWorkspacePath(): string {
    // Try to get from environment variable first
    const envPath = process.env.CURSOR_WORKSPACE_PATH || process.env.WORKSPACE_PATH;
    if (envPath) {
      return envPath;
    }

    // Fallback to current working directory
    return process.cwd();
  }

  /**
   * Get Slack token from environment variable
   */
  getSlackTokenFromEnv(): string | null {
    const token = process.env.SLACK_BOT_TOKEN || process.env.SLACK_TOKEN || null;
    console.error("[UserConfigManager] getSlackTokenFromEnv:", token ? `Found (${token.substring(0, 15)}...)` : "Not found");
    return token;
  }

  /**
   * Check if Slack token is available (from env or config)
   */
  hasSlackToken(): boolean {
    const envToken = this.getSlackTokenFromEnv();
    if (envToken) {
      return true;
    }
    const config = this.getCurrentUserConfig();
    return config !== null && !!config.slack_token;
  }

  /**
   * Get Slack token (from env var or config)
   */
  getSlackToken(): string | null {
    const envToken = this.getSlackTokenFromEnv();
    if (envToken) {
      return envToken;
    }
    const config = this.getCurrentUserConfig();
    return config?.slack_token || null;
  }

  /**
   * Get current user's config
   */
  getCurrentUserConfig(): UserConfig | null {
    const workspacePath = this.getWorkspacePath();
    return this.getOrCreateConfig(workspacePath);
  }

  /**
   * Check if user is configured
   */
  isConfigured(workspacePath?: string): boolean {
    const path = workspacePath || this.getWorkspacePath();
    return this.storage.getUserConfig(path) !== null;
  }

  /**
   * Create or update user configuration
   */
  saveConfig(config: {
    workspace_path?: string;
    slack_token: string;
    refresh_token?: string;
    default_channel?: string;
    format_template?: string;
  }): UserConfig {
    const workspacePath = config.workspace_path || this.getWorkspacePath();
    const existing = this.storage.getUserConfig(workspacePath);

    if (existing) {
        const updates: Partial<Omit<UserConfig, "id" | "workspace_path" | "created_at">> = {
          slack_token: config.slack_token,
        };
        if (config.refresh_token !== undefined) {
          updates.refresh_token = config.refresh_token ?? null;
        }
        if (config.default_channel !== undefined) {
          updates.default_channel = config.default_channel ?? null;
        }
        if (config.format_template !== undefined) {
          updates.format_template = config.format_template;
        }
        const updated = this.storage.updateUserConfig(workspacePath, updates);
      return updated!;
    } else {
      return this.storage.createUserConfig({
        workspace_path: workspacePath,
        slack_token: config.slack_token,
        refresh_token: config.refresh_token ?? null,
        default_channel: config.default_channel ?? null,
        format_template: config.format_template || this.getDefaultTemplate(),
      });
    }
  }

  /**
   * Update specific fields
   */
  updateConfig(updates: {
    slack_token?: string;
    refresh_token?: string;
    default_channel?: string;
    format_template?: string;
  }): UserConfig | null {
    const workspacePath = this.getWorkspacePath();
    return this.storage.updateUserConfig(workspacePath, updates);
  }

  /**
   * Get default template
   */
  getDefaultTemplate(): string {
    return `*EOD Status ({date})*

{summary}

{pending}

{planTomorrow}`;
  }
}

