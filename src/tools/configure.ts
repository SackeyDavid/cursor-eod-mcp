import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { UserConfigManager } from "../config/userConfig.js";
import { validateAndNormalizeToken, getOAuthInstructions } from "../auth/slackOAuth.js";
import { listSlackChannels } from "../slackClient.js";

const configureArgsSchema = z.object({
  slack_token: z.string().describe("Slack OAuth Token - Use xoxp- (user token) to post as yourself, or xoxb- (bot token) to post as the app"),
  default_channel: z.string().optional().describe("Default Slack channel name or ID"),
  format_template: z.string().optional().describe("Custom format template with variables"),
});

export function registerConfigureTool(server: McpServer) {
  server.registerTool(
    "configure",
    {
      title: "Configure EOD MCP Server",
      description:
        "Set up your Slack integration. Provide your Slack OAuth Token (xoxp- for user token to post as yourself, or xoxb- for bot token to post as the app). Optionally set default channel and format template.",
      inputSchema: configureArgsSchema,
    },
    async (args) => {
      console.error("[configure] Tool called with args:", JSON.stringify({ ...args, slack_token: args.slack_token ? args.slack_token.substring(0, 15) + "..." : undefined }, null, 2));
      const configManager = new UserConfigManager();
      const workspacePath = configManager.getWorkspacePath();
      console.error("[configure] Workspace path:", workspacePath);

      try {
        // Validate token
        console.error("[configure] Validating token...");
        const tokenValidation = await validateAndNormalizeToken(args.slack_token);
        console.error("[configure] Token validation result:", tokenValidation.valid ? "Valid" : "Invalid");
        
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
        if (!defaultChannel && tokenValidation.token) {
          try {
            const channels = await listSlackChannels(tokenValidation.token);
            if (channels.length > 0) {
              // Suggest first channel
              defaultChannel = channels[0]?.name;
            }
          } catch (err) {
            // Continue without default channel
          }
        }

        // Save configuration
        const saveConfig: {
          workspace_path?: string;
          slack_token: string;
          refresh_token?: string;
          default_channel?: string;
          format_template?: string;
        } = {
          workspace_path: workspacePath,
          slack_token: tokenValidation.token!,
        };
        if (defaultChannel) {
          saveConfig.default_channel = defaultChannel;
        }
        if (args.format_template) {
          saveConfig.format_template = args.format_template;
        }
        console.error("[configure] Saving configuration...");
        const config = configManager.saveConfig(saveConfig);
        console.error("[configure] Configuration saved successfully!");

        const tokenType = tokenValidation.token?.startsWith("xoxp-") ? "User Token" : "Bot Token";
        const postingAs = tokenValidation.token?.startsWith("xoxp-") ? "YOU" : "the app/bot";
        
        let response = `✅ Configuration saved successfully!\n\n`;
        response += `Workspace: ${workspacePath}\n`;
        response += `Slack Team: ${tokenValidation.team ?? "Unknown"}\n`;
        response += `Token Type: ${tokenType}\n`;
        response += `Messages will post as: ${postingAs}\n`;
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
        console.error("[configure] Error:", error instanceof Error ? error.message : "Unknown error");
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

