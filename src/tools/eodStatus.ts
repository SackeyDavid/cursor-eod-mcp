import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { UserConfigManager } from "../config/userConfig.js";
import { postToSlack } from "../slackClient.js";
import { formatEodMessage } from "../utils/formatter.js";

const eodStatusArgsSchema = z.object({
  channel: z.string().optional().describe("Slack channel name or ID (e.g., 'halo', 'engineering-team'). If not provided, uses default channel."),
  date: z.string().optional().describe("Date for the EOD status (YYYY-MM-DD format, defaults to today)"),
  summary: z.string().optional().describe("Summary of work done. If not provided, AI will auto-generate from all workspace conversations for the day."),
  pending: z.string().optional().describe("Pending items or blockers"),
  planTomorrow: z.string().optional().describe("Plan for tomorrow"),
});

export function registerEodStatusTool(server: McpServer) {
  server.registerTool(
    "eod_status",
    {
      title: "Send EOD Status to Slack",
      description:
        "Send an end-of-day status update to a Slack channel. If summary is not provided, automatically generate a concise bullet-point summary by reviewing all conversations in the workspace for the specified date (defaults to today). The summary should include all work completed, issues resolved, features implemented, and other significant activities from all conversations in the workspace for that day. Use the user's configured format template and Slack token. Supports dynamic channel selection.",
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
        // Signal to AI that it should generate summary from conversation history
        // The AI should call generate_eod_summary tool or review conversations directly
        return {
          isError: false,
          content: [
            {
              type: "text",
              text: `Please generate a summary of all conversations in this workspace for ${args.date || "today"}. Review all conversations and create a concise bullet-point summary of work completed, then call eod_status again with the summary parameter.`,
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

