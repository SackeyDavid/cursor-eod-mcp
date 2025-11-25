import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { UserConfigManager } from "../config/userConfig.js";
import { listSlackChannels } from "../slackClient.js";

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

      try {
        const channels = await listSlackChannels(config.slack_token);

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

        let response = `Available Slack Channels:\n\n`;
        channels.forEach((channel, index) => {
          const marker = channel.name === config.default_channel ? " (default)" : "";
          const privacy = channel.is_private ? "🔒" : "🌐";
          response += `${index + 1}. ${privacy} ${channel.name}${marker}\n`;
        });

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
              text: `Failed to list channels: ${error instanceof Error ? error.message : "Unknown error"}`,
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

      try {
        const updated = configManager.updateConfig({
          default_channel: args.channel,
        });

        if (!updated) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: "Failed to update default channel.",
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: `✅ Default channel set to: ${updated.default_channel}`,
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

