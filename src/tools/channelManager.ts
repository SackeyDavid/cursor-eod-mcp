import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { UserConfigManager } from "../config/userConfig.js";
import { listSlackChannels, validateSlackToken } from "../slackClient.js";
import { getOAuthInstructions } from "../auth/slackOAuth.js";
import type { UserConfig } from "../config/schema.js";

const listChannelsArgsSchema = z.object({});

const setDefaultChannelArgsSchema = z.object({
  channel: z.string().describe("Channel name or ID to set as default"),
});

export function registerChannelManagerTools(server: McpServer) {
  server.registerTool(
    "list_channels",
    {
      title: "List Slack Channels",
      description: "List all available Slack channels for the configured workspace",
      inputSchema: listChannelsArgsSchema,
    },
    async () => {
      console.error("[list_channels] Tool called");
      const configManager = new UserConfigManager();
      const slackToken = configManager.getSlackToken();
      console.error("[list_channels] Token found:", slackToken ? `Yes (${slackToken.substring(0, 15)}...)` : "No");

      if (!slackToken) {
        console.error("[list_channels] Error: No token found");
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

      // Validate token before attempting to list channels
      const config = configManager.getCurrentUserConfig();
      const hasStoredConfig = config !== null;
      
      try {
        console.error("[list_channels] Validating token...");
        const tokenValidation = await validateSlackToken(slackToken);
        
        if (!tokenValidation.valid) {
          console.error("[list_channels] Token validation failed:", tokenValidation.error);
          let errorMessage = "Your Slack token is invalid or expired.";
          
          if (hasStoredConfig) {
            errorMessage += " Please run the 'configure' tool again with a valid token to update your configuration.";
          } else {
            errorMessage += `\n\n${getOAuthInstructions()}`;
          }
          
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: errorMessage,
              },
            ],
          };
        }
        
        console.error("[list_channels] Token validated, fetching channels from Slack...");
        const channels = await listSlackChannels(slackToken);
        console.error("[list_channels] Found", channels.length, "channels");

        if (channels.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "No channels found. Make sure your Slack token has the 'channels:read' scope.",
              },
            ],
          };
        }

        const defaultChannel = config?.default_channel || process.env.SLACK_DEFAULT_CHANNEL || null;
        
        let response = `Available Slack Channels:\n\n`;
        channels.forEach((channel, index) => {
          const marker = channel.name === defaultChannel ? " (default)" : "";
          const privacy = channel.is_private ? "🔒" : "🌐";
          response += `${index + 1}. ${privacy} ${channel.name}${marker}\n`;
        });

        console.error("[list_channels] Success! Returning", channels.length, "channels");
        return {
          content: [
            {
              type: "text",
              text: response,
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const isAuthError = (error as any)?.isAuthError || errorMessage.includes("invalid_auth") || errorMessage.includes("not_authed");
        
        console.error("[list_channels] Error:", errorMessage);
        
        // Provide more helpful error messages based on error type
        let userMessage: string;
        
        // Check for authentication errors
        if (isAuthError) {
          if (hasStoredConfig) {
            userMessage = "Your Slack token is invalid or expired. Please run the 'configure' tool again with a valid token to update your configuration.";
          } else {
            userMessage = `Slack authentication failed. Please verify your Slack token is valid and has the required scopes (channels:read, groups:read).\n\n${getOAuthInstructions()}`;
          }
        } else if (errorMessage.includes("missing_scope")) {
          userMessage = "Your Slack token is missing required scopes. Please add 'channels:read' and 'groups:read' scopes to your Slack app and reinstall it to your workspace.";
        } else {
          // For other errors, clean up double-wrapped messages
          if (errorMessage.startsWith("Failed to list channels: Failed to list channels:")) {
            // Remove the duplicate prefix
            userMessage = errorMessage.replace(/^Failed to list channels: /, "");
          } else if (!errorMessage.includes("Failed to list channels")) {
            userMessage = `Failed to list channels: ${errorMessage}`;
          } else {
            userMessage = errorMessage;
          }
        }
        
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: userMessage,
            },
          ],
        };
      }
    }
  );

  server.registerTool(
    "set_default_channel",
    {
      title: "Set Default Channel",
      description: "Set the default Slack channel for EOD status updates",
      inputSchema: setDefaultChannelArgsSchema,
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

      try {
        let updatedConfig: UserConfig | null = null;
        
        // If no config exists but we have a token, create a config first
        if (!config && slackToken) {
          // Create a new config with the token from environment variable
          console.error("[set_default_channel] Creating new config with token from environment");
          updatedConfig = configManager.saveConfig({
            slack_token: slackToken,
            default_channel: args.channel,
          });
        } else if (config) {
          // Update existing config
          console.error("[set_default_channel] Updating existing config");
          updatedConfig = configManager.updateConfig({
            default_channel: args.channel,
          });

          if (!updatedConfig) {
            return {
              isError: true,
              content: [
                {
                  type: "text",
                  text: "Failed to update default channel. Please run the 'configure' tool first to set up your Slack integration.",
                },
              ],
            };
          }
        } else {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: "No configuration found. Please run the 'configure' tool first to set up your Slack integration.",
              },
            ],
          };
        }

        if (!updatedConfig) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: "Failed to set default channel.",
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `✅ Default channel set to: ${updatedConfig.default_channel}`,
            },
          ],
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to set default channel: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );
}

