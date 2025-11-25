import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { UserConfigManager } from "../config/userConfig.js";
import { validateAndNormalizeToken, getOAuthInstructions } from "../auth/slackOAuth.js";
import { listSlackChannels } from "../slackClient.js";

const configureArgsSchema = z.object({
  slack_token: z.string().describe("Slack Bot User OAuth Token (starts with xoxb-)"),
  default_channel: z.string().optional().describe("Default Slack channel name or ID"),
  format_template: z.string().optional().describe("Custom format template with variables"),
});

export function registerConfigureTool(server: McpServer) {
  server.registerTool(
    "configure",
    {
      title: "Configure EOD MCP Server",
      description:
        "Set up your Slack integration. Provide your Slack Bot User OAuth Token. Optionally set default channel and format template.",
      inputSchema: configureArgsSchema,
    },
    async (args) => {
      const configManager = new UserConfigManager();
      const workspacePath = configManager.getWorkspacePath();

      try {
        // Validate token
        const tokenValidation = await validateAndNormalizeToken(args.slack_token);
        
        if (!tokenValidation.valid) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Token validation failed: ${tokenValidation.error}\n\n${getOAuthInstructions()}`,
              },
            ],
          };
        }

        // Get available channels if default_channel not provided
        let defaultChannel = args.default_channel;
        if (!defaultChannel) {
          try {
            const channels = await listSlackChannels(tokenValidation.token!);
            if (channels.length > 0) {
              // Suggest first channel
              defaultChannel = channels[0].name;
            }
          } catch (err) {
            // Continue without default channel
          }
        }

        // Save configuration
        const config = configManager.saveConfig({
          workspace_path: workspacePath,
          slack_token: tokenValidation.token!,
          default_channel: defaultChannel ?? undefined,
          format_template: args.format_template ?? undefined,
        });

        let response = `✅ Configuration saved successfully!\n\n`;
        response += `Workspace: ${workspacePath}\n`;
        response += `Slack Team: ${tokenValidation.team ?? "Unknown"}\n`;
        if (config.default_channel) {
          response += `Default Channel: ${config.default_channel}\n`;
        }
        response += `\nYou can now use the eod_status tool to send updates.`;

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
              text: `Configuration failed: ${error instanceof Error ? error.message : "Unknown error"}\n\n${getOAuthInstructions()}`,
            },
          ],
        };
      }
    }
  );
}

