import { WebClient } from "@slack/web-api";

export interface SlackMessageOptions {
  token: string;
  channel: string;
  text: string;
}

/**
 * Post message to Slack using Web API
 */
export async function postToSlack(options: SlackMessageOptions): Promise<void> {
  const { token, channel, text } = options;
  const client = new WebClient(token);

  try {
    // Resolve channel name to ID if needed
    let channelId = channel;
    
    // If channel doesn't start with 'C' (Slack channel ID format), try to resolve it
    if (!channel.startsWith("C") && !channel.startsWith("G")) {
      try {
        const result = await client.conversations.list({
          types: "public_channel,private_channel",
        });
        
        const foundChannel = result.channels?.find(
          (c) => c.name === channel || c.id === channel
        );
        
        if (foundChannel?.id) {
          channelId = foundChannel.id;
        }
      } catch (err) {
        // If we can't list channels, try using the channel name directly
        // Slack API might accept channel names
      }
    }

    const response = await client.chat.postMessage({
      channel: channelId,
      text: text,
      parse: "full", // Enable Markdown parsing
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.error || "Unknown error"}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to post to Slack: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Validate Slack token
 */
export async function validateSlackToken(token: string): Promise<{
  valid: boolean;
  team?: string;
  user?: string;
  error?: string;
}> {
  const client = new WebClient(token);

  try {
    const result = await client.auth.test();
    
    if (!result.ok) {
      return {
        valid: false,
        error: result.error || "Token validation failed",
      };
    }

    return {
      valid: true,
      team: result.team || undefined,
      user: result.user || undefined,
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * List available Slack channels
 */
export async function listSlackChannels(token: string): Promise<Array<{
  id: string;
  name: string;
  is_private: boolean;
}>> {
  const client = new WebClient(token);

  try {
    const result = await client.conversations.list({
      types: "public_channel,private_channel",
      exclude_archived: true,
    });

    if (!result.ok || !result.channels) {
      return [];
    }

    return result.channels
      .filter((channel) => channel.id && channel.name)
      .map((channel) => ({
        id: channel.id!,
        name: channel.name!,
        is_private: channel.is_private || false,
      }));
  } catch (error) {
    throw new Error(
      `Failed to list channels: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
