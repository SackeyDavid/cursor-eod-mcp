import { parseTemplate, TemplateVariables } from "./templateParser.js";

export interface FormatOptions {
  date?: string | Date;
  summary?: string;
  pending?: string;
  planTomorrow?: string;
  workspace?: string;
  project_name?: string;
  user_name?: string;
  channel?: string;
  [key: string]: string | Date | undefined;
}

/**
 * Format EOD status message using template
 */
export function formatEodMessage(
  template: string,
  options: FormatOptions
): string {
  const formatDate = (value: string | Date | undefined): string => {
    if (!value) {
      const now = new Date();
      return now.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }

    if (value instanceof Date) {
      return value.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }

    // Try to parse ISO date string
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }

    return value;
  };

  const toLines = (value: string | undefined): string => {
    if (!value) return "";
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n");
  };

  const variables: TemplateVariables = {
    date: formatDate(options.date),
    summary: toLines(options.summary),
    pending: toLines(options.pending),
    planTomorrow: toLines(options.planTomorrow),
    workspace: options.workspace || "",
    project_name: options.project_name || "",
    user_name: options.user_name || "",
    channel: options.channel || "",
  };

  // Add any custom variables
  for (const [key, value] of Object.entries(options)) {
    if (
      !["date", "summary", "pending", "planTomorrow", "workspace", "project_name", "user_name", "channel"].includes(
        key
      )
    ) {
      variables[key] = typeof value === "string" ? value : String(value);
    }
  }

  return parseTemplate(template, variables);
}

