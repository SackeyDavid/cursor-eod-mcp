import { UserConfigStorage, getUserConfigStorage } from "./storage.js";
import { UserConfig } from "./schema.js";

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
      const updated = this.storage.updateUserConfig(workspacePath, {
        slack_token: config.slack_token,
        refresh_token: config.refresh_token,
        default_channel: config.default_channel,
        format_template: config.format_template,
      });
      return updated!;
    } else {
      return this.storage.createUserConfig({
        workspace_path: workspacePath,
        slack_token: config.slack_token,
        refresh_token: config.refresh_token,
        default_channel: config.default_channel,
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

