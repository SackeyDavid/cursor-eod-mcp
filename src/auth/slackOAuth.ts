import { validateSlackToken } from "../slackClient.js";

/**
 * Generate OAuth URL for Slack
 */
export function generateSlackOAuthUrl(
  clientId: string,
  redirectUri: string,
  scopes: string[] = ["chat:write", "channels:read", "groups:read"]
): string {
  const scopeString = scopes.join(",");
  return `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopeString}&redirect_uri=${encodeURIComponent(redirectUri)}`;
}

/**
 * Get OAuth instructions for manual token entry
 */
export function getOAuthInstructions(): string {
  return `To connect your Slack account:

1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name your app (e.g., "EOD Status Bot")
4. Select your workspace
5. Go to "OAuth & Permissions" in the sidebar
6. Under "Scopes", add these Bot Token Scopes:
   - chat:write
   - channels:read
   - groups:read
7. Scroll up and click "Install to Workspace"
8. Authorize the app
9. Copy the "Bot User OAuth Token" (starts with xoxb-)
10. Paste it here when prompted

Alternatively, if you already have a Slack app:
- Go to your app's "OAuth & Permissions" page
- Copy the "Bot User OAuth Token"
- Paste it here`;
}

/**
 * Validate and normalize Slack token
 */
export async function validateAndNormalizeToken(token: string): Promise<{
  valid: boolean;
  token?: string;
  error?: string;
  team?: string;
  user?: string;
}> {
  // Normalize token (remove whitespace)
  const normalizedToken = token.trim();

  // Basic validation - Slack tokens start with xoxb- or xoxp-
  if (!normalizedToken.startsWith("xoxb-") && !normalizedToken.startsWith("xoxp-")) {
    return {
      valid: false,
      error: "Invalid token format. Slack tokens should start with 'xoxb-' or 'xoxp-'",
    };
  }

  // Validate token with Slack API
  const validation = await validateSlackToken(normalizedToken);

  if (!validation.valid) {
    return {
      valid: false,
      error: validation.error || "Token validation failed",
    };
  }

  const result: {
    valid: boolean;
    token?: string;
    error?: string;
    team?: string;
    user?: string;
  } = {
    valid: true,
    token: normalizedToken,
  };
  
  if (validation.team) {
    result.team = validation.team;
  }
  if (validation.user) {
    result.user = validation.user;
  }
  
  return result;
}

