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

export function getDefaultTemplate(): string {
  return DEFAULT_TEMPLATE;
}
