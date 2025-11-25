import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { UserConfigManager } from "../config/userConfig.js";
import { postToSlack } from "../slackClient.js";
import { formatEodMessage } from "../utils/formatter.js";

const eodStatusArgsSchema = z.object({
  channel: z.string().optional().describe("Slack channel name or ID (e.g., 'halo', 'engineering-team'). If not provided, uses default channel."),
  date: z.string().optional().describe("Date for the EOD status (YYYY-MM-DD format, defaults to today)"),
      summary: z.string().optional().describe("Summary of work done. If not provided, the tool will automatically generate a summary by reviewing all conversations in your Cursor workspace for the specified date (defaults to today). The auto-generated summary will include all work completed, issues resolved, features implemented, and code changes from all conversations."),
  pending: z.string().optional().describe("Pending items or blockers"),
  planTomorrow: z.string().optional().describe("Plan for tomorrow"),
});

export function registerEodStatusTool(server: McpServer) {
  server.registerTool(
    "eod_status",
    {
      title: "Send EOD Status to Slack (Auto-Summarize)",
      description:
        "Send an end-of-day status update to a Slack channel. This tool automatically summarizes all work done by reviewing ALL conversations in your Cursor workspace for the specified date (defaults to today). When called without a summary parameter, it will automatically review all your conversations and generate a comprehensive bullet-point summary of: work completed, issues resolved, features implemented, code changes made, and other significant activities. The summary is then formatted using your custom template and posted to Slack. Supports dynamic channel selection.",
      inputSchema: eodStatusArgsSchema,
    },
    async (args) => {
      console.error("[eod_status] Tool called with args:", JSON.stringify(args, null, 2));
      const configManager = new UserConfigManager();
      const slackToken = configManager.getSlackToken();
      console.error("[eod_status] Token found:", slackToken ? `Yes (${slackToken.substring(0, 15)}...)` : "No");

      if (!slackToken) {
        console.error("[eod_status] Error: No token found");
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
      
      // Determine channel (from args, config, or env var)
      const channel = args.channel || config?.default_channel || process.env.SLACK_DEFAULT_CHANNEL;
      if (!channel) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: "No channel specified. Please provide a channel parameter or set a default channel using 'set_default_channel' tool.",
            },
          ],
        };
      }

      // Handle summary generation
      let summary = args.summary;
      if (!summary) {
        // Auto-generate summary from all conversations
        // Signal to AI that it should review all conversations and generate summary
        const targetDate = args.date || new Date().toISOString().split("T")[0];
        const channelSource = args.channel ? "specified channel" : config?.default_channel ? "default channel" : "environment variable";
        return {
          isError: false,
          content: [
            {
              type: "text",
              text: `🔄 Auto-generating summary from all conversations for ${targetDate}...\n\nWill send to channel: ${channel} (${channelSource})\n\nPlease review ALL conversations in this Cursor workspace for ${targetDate} and generate a comprehensive bullet-point summary of:\n\n• Work completed\n• Issues resolved\n• Features implemented\n• Code changes made\n• Bugs fixed\n• Tests written\n• Documentation updated\n• Any other significant activities\n\nAfter generating the summary, please call eod_status again with the summary parameter to send it to Slack. The channel will automatically be set to "${channel}" (you don't need to specify it). The summary should be concise but comprehensive, covering all work-related activities from all conversations in the workspace for this date.`,
            },
          ],
        };
      }

      try {
        // Get format template (from config or use default)
        const formatTemplate = config?.format_template || configManager.getDefaultTemplate();

        // Format the message using user's template
        const formatOptions: {
          date?: string | Date;
          summary: string;
          pending?: string;
          planTomorrow?: string;
          workspace: string;
          channel: string;
        } = {
          summary: summary,
          workspace: configManager.getWorkspacePath(),
          channel: channel,
        };
        if (args.date) {
          formatOptions.date = args.date;
        }
        if (args.pending) {
          formatOptions.pending = args.pending;
        }
        if (args.planTomorrow) {
          formatOptions.planTomorrow = args.planTomorrow;
        }
        const formattedMessage = formatEodMessage(formatTemplate, formatOptions);
        console.error("[eod_status] Formatted message:", formattedMessage.substring(0, 100) + "...");

        // Post to Slack
        console.error("[eod_status] Posting to Slack channel:", channel);
        await postToSlack({
          token: slackToken,
          channel: channel,
          text: formattedMessage,
        });

        console.error("[eod_status] Success! Message sent to", channel);
        return {
          content: [
            {
              type: "text",
              text: `✅ EOD status sent to Slack channel: ${channel}`,
            },
          ],
        };
      } catch (error) {
        console.error("[eod_status] Error:", error instanceof Error ? error.message : "Unknown error");
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Failed to send EOD status: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
          ],
        };
      }
    }
  );
}

