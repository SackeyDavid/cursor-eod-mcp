import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { UserConfigManager } from "../config/userConfig.js";
import { validateTemplate, extractVariables, getDefaultVariables } from "../utils/templateParser.js";
import { formatEodMessage } from "../utils/formatter.js";

const updateFormatTemplateArgsSchema = z.object({
  template: z.string().describe("Format template with variables like {date}, {summary}, {pending}, {planTomorrow}"),
});

const previewFormatArgsSchema = z.object({
  template: z.string().optional().describe("Template to preview (uses current template if not provided)"),
});

export function registerFormatManagerTools(server: McpServer) {
  server.registerTool(
    "update_format_template",
    {
      title: "Update Format Template",
      description:
        "Update the format template for EOD status messages. Supports Markdown and variables: {date}, {summary}, {pending}, {planTomorrow}, {workspace}, {project_name}, {user_name}, {channel}",
      inputSchema: updateFormatTemplateArgsSchema,
    },
    async (args) => {
      const configManager = new UserConfigManager();
      const config = configManager.getCurrentUserConfig();

      if (!config) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Not configured. Please run the 'configure' tool first to set up your Slack integration.",
            },
          ],
        };
      }

      // Validate template
      const validation = validateTemplate(args.template);
      if (!validation.valid) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Template validation failed:\n${validation.errors.join("\n")}`,
            },
          ],
        };
      }

      try {
        const updated = configManager.updateConfig({
          format_template: args.template,
        });

        if (!updated) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: "Failed to update format template.",
              },
            ],
          };
        }

        const variables = extractVariables(args.template);
        const defaultVars = getDefaultVariables();
        const customVars = variables.filter((v) => !defaultVars.includes(v));

        let response = `✅ Format template updated!\n\n`;
        response += `Variables used: ${variables.join(", ")}\n`;
        if (customVars.length > 0) {
          response += `Custom variables: ${customVars.join(", ")}\n`;
        }
        response += `\nUse the 'preview_format' tool to see how it will look.`;

        return {
          content: [
            {
              type: "text",
              text: response,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to update format template: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );

  server.registerTool(
    "preview_format",
    {
      title: "Preview Format Template",
      description: "Preview how your format template will render with sample data",
      inputSchema: previewFormatArgsSchema,
    },
    async (args) => {
      const configManager = new UserConfigManager();
      const slackToken = configManager.getSlackToken();

      if (!slackToken) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "Slack token not found. Please set SLACK_BOT_TOKEN or SLACK_TOKEN environment variable, or run the 'configure' tool to set up your Slack integration.",
            },
          ],
        };
      }

      const config = configManager.getCurrentUserConfig();
      const template = args.template || config?.format_template || configManager.getDefaultTemplate();

      // Validate template
      const validation = validateTemplate(template);
      if (!validation.valid) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Template validation failed:\n${validation.errors.join("\n")}`,
            },
          ],
        };
      }

      try {
        // Generate preview with sample data
        const preview = formatEodMessage(template, {
          date: new Date(),
          summary: "• Completed feature X\n• Fixed bug Y\n• Reviewed PR #123",
          pending: "• Waiting for feedback on feature Z\n• Need to update documentation",
          planTomorrow: "• Start on feature A\n• Review design mockups",
          workspace: configManager.getWorkspacePath(),
          project_name: "My Project",
          user_name: "Developer",
          channel: config?.default_channel || process.env.SLACK_DEFAULT_CHANNEL || "general",
        });

        let response = `Format Preview:\n\n`;
        response += "---\n";
        response += preview;
        response += "\n---\n\n";
        response += `Variables available: ${getDefaultVariables().join(", ")}`;

        return {
          content: [
            {
              type: "text",
              text: response,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to preview format: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );
}

