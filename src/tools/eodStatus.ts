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

      // Determine channel
      const channel = args.channel || config.default_channel;
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
        // Format the message using user's template
        const formattedMessage = formatEodMessage(config.format_template, {
          date: args.date ?? undefined,
          summary: summary,
          pending: args.pending ?? undefined,
          planTomorrow: args.planTomorrow ?? undefined,
          workspace: configManager.getWorkspacePath(),
          channel: channel,
        });

        // Post to Slack
        await postToSlack({
          token: config.slack_token,
          channel: channel,
          text: formattedMessage,
        });

        return {
          content: [
            {
              type: "text",
              text: `✅ EOD status sent to Slack channel: ${channel}`,
            },
          ],
        };
      } catch (error) {
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

