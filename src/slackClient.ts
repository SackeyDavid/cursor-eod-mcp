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
          (c: { name?: string; id?: string }) => c.name === channel || c.id === channel
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

const isLikelySlackApiToken = (token: string) => /^xox[a-zA-Z]-/.test(token);

/**
 * Validate Slack token
 */
export async function validateSlackToken(token: string): Promise<{
  valid: boolean;
  team?: string;
  user?: string;
  error?: string;
}> {
  if (!isLikelySlackApiToken(token)) {
    return {
      valid: false,
      error: "Token format looks wrong (expected Slack bot token like xoxb-...). Webhook URLs will not work for API calls."
    };
  }

  const client = new WebClient(token);

  try {
    const result = await client.auth.test();
    
    if (!result.ok) {
      return {
        valid: false,
        error: result.error || "Token validation failed",
      };
    }

    const response: {
      valid: boolean;
      team?: string;
      user?: string;
      error?: string;
    } = {
      valid: true,
    };
    
    if (result.team) {
      response.team = result.team;
    }
    if (result.user) {
      response.user = result.user;
    }
    
    return response;
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
  if (!isLikelySlackApiToken(token)) {
    const authError: any = new Error("invalid_auth");
    authError.isAuthError = true;
    authError.slackErrorCode = "invalid_token_format";
    throw authError;
  }

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
        is_private: channel.is_private ?? false,
      }));
  } catch (error: any) {
    // Slack WebClient errors have a 'data' property with error details
    if (error?.data?.error) {
      const errorCode = error.data.error;
      if (errorCode === 'invalid_auth' || errorCode === 'not_authed') {
        const authError: any = new Error("invalid_auth");
        authError.isAuthError = true;
        authError.slackErrorCode = errorCode;
        throw authError;
      }
    }
    
    // Check error message for auth errors
    const errorMessage = error?.message || String(error);
    if (errorMessage.includes("invalid_auth") || errorMessage.includes("not_authed")) {
      const authError: any = new Error("invalid_auth");
      authError.isAuthError = true;
      throw authError;
    }
    
    // Re-throw original error to preserve error chain
    throw error;
  }
}
