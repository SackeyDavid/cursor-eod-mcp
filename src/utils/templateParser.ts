export interface TemplateVariables {
  date?: string;
  summary?: string;
  pending?: string;
  planTomorrow?: string;
  workspace?: string;
  project_name?: string;
  user_name?: string;
  channel?: string;
  [key: string]: string | undefined;
}

/**
 * Parse template and replace variables with values
 * Supports Markdown formatting
 */
export function parseTemplate(template: string, variables: TemplateVariables): string {
  let result = template;

  // Replace all variables in format {variable_name}
  for (const [key, value] of Object.entries(variables)) {
    if (value !== undefined && value !== null) {
      const regex = new RegExp(`\\{${key}\\}`, "g");
      result = result.replace(regex, String(value));
    }
  }

  // Clean up empty lines (more than 2 consecutive newlines)
  result = result.replace(/\n{3,}/g, "\n\n");

  return result.trim();
}

/**
 * Extract all variable names from a template
 */
export function extractVariables(template: string): string[] {
  const regex = /\{([^}]+)\}/g;
  const variables: string[] = [];
  let match;

  while ((match = regex.exec(template)) !== null) {
    const varName = match[1];
    if (varName && !variables.includes(varName)) {
      variables.push(varName);
    }
  }

  return variables;
}

/**
 * Validate template syntax
 */
export function validateTemplate(template: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for unclosed braces
  const openBraces = (template.match(/\{/g) || []).length;
  const closeBraces = (template.match(/\}/g) || []).length;

  if (openBraces !== closeBraces) {
    errors.push("Unmatched braces in template");
  }

  // Check for empty variable names
  const emptyVars = template.match(/\{\s*\}/g);
  if (emptyVars) {
    errors.push("Empty variable names found");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get default variables available
 */
export function getDefaultVariables(): string[] {
  return [
    "date",
    "summary",
    "pending",
    "planTomorrow",
    "workspace",
    "project_name",
    "user_name",
    "channel",
  ];
}

