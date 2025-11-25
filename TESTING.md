# Testing / Usage Guide (Cursor)

Fast path to get the MCP server running in Cursor, connect Slack, and send an EOD.

## Prereqs
- Node 18+
- Cursor installed
- Slack workspace where you can create an app

## 1) Install and build
```bash
cd /Users/Kofi/dev/halo-eod-mcp   # use your absolute path
npm install
npm run build
```

## 2) Wire Cursor to the server
Edit `~/.cursor/mcp.json` (Cursor → Settings → MCP → Edit Config):
```json
{
  "mcpServers": {
    "halo-eod-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/halo-eod-mcp/dist/index.js"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-...",        // bot token
        "SLACK_USER_TOKEN": "xoxp-... (optional; posts as you)",
        "SLACK_DEFAULT_CHANNEL": "your-default-channel"
      }
    }
  }
}
```
Use absolute paths. Restart Cursor after saving.

## 3) Slack token (quick)
1) Create app: https://api.slack.com/apps → New App → From scratch → pick workspace.  
2) OAuth & Permissions → Bot Token Scopes: add `chat:write`, `channels:read`, `groups:read`.  
3) Install/Reinstall to workspace → copy Bot User OAuth Token (xoxb-).  
4) (Optional to post as you) add User Token Scopes `chat:write`, `channels:read`, `groups:read`, reinstall, copy User OAuth Token (xoxp-/xoxs-).  
5) Put the token(s) in `~/.cursor/mcp.json` env or run `configure` in chat.

## 4) Core commands
- Configure (if not using env):  
  `configure slack_token="xoxb-..." default_channel="your-channel"`
- List channels:  
  `list_channels`
- Set default channel:  
  `set_default_channel channel="your-channel"`
- Preview format:  
  `preview_format`
- Send EOD (provide summary text):  
  `eod_status summary="• Did X\n• Reviewed Y\n• Shipped Z"`
  - Optional: `pending="..."` `planTomorrow="..."`
  - Optional: `channel="other-channel"`

## 5) Expected success
- Cursor replies with a success message.  
- Slack shows the formatted post in the channel.  
- If nothing posts: invite the bot/user to the channel, verify the token, restart Cursor.

## 6) Quick smoke script (run in Cursor chat)
```
list_channels
set_default_channel channel="your-channel"
preview_format
eod_status summary="• Quick test\n• Tool 1 works\n• Tool 2 works"
```

## 7) Troubleshooting quick hits
- Server not loading: path must be absolute; `npm run build`; restart Cursor.  
- Slack auth errors: tokens must start with `xoxb-` (bot) or `xoxp-/xoxs-` (user); ensure scopes and reinstall.  
- Channel issues: invite the bot/user to the channel; ensure the name/ID is correct.  
- Still stuck: run `list_channels` to verify token scope and channel visibility.
