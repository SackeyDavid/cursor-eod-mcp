# Installation Guide

Detailed step-by-step installation instructions for the EOD Status MCP Server.

## Prerequisites

Before installing, ensure you have:

- **Node.js 18+** installed ([Download](https://nodejs.org/))
- **Cursor IDE** with MCP support
- **A Slack workspace** where you can create apps
- **Administrator access** to your Slack workspace (for app installation)

## Step 1: Install the MCP Server

### Option A: From Source

1. Clone the repository:
```bash
git clone https://github.com/yourusername/halo-eod-mcp.git
cd halo-eod-mcp
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

4. Note the full path to the `dist/index.js` file. You'll need this for the Cursor configuration.

### Option B: From npm (when published)

```bash
npm install -g halo-eod-mcp
```

## Step 2: Configure Cursor MCP

1. Open Cursor IDE
2. Navigate to MCP settings (usually in Settings → MCP or `~/.cursor/mcp.json`)
3. Add the server configuration:

```json
{
  "mcpServers": {
    "halo-eod-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/halo-eod-mcp/dist/index.js"]
    }
  }
}
```

**Important**: Use the absolute path to `dist/index.js`, not a relative path.

4. Save the configuration
5. Restart Cursor IDE

## Step 3: Verify Installation

After restarting Cursor, the MCP server should be loaded. You can verify by:

1. Opening a chat in Cursor
2. Typing a command like `list_channels` (it will fail until configured, but should show the tool exists)

## Step 4: Set Up Slack Integration

### Create a Slack App

1. Go to https://api.slack.com/apps
2. Click **"Create New App"**
3. Select **"From scratch"**
4. Enter app name: `EOD Status Bot` (or your preferred name)
5. Select your workspace
6. Click **"Create App"**

### Configure OAuth Scopes

1. In your app settings, click **"OAuth & Permissions"** in the sidebar
2. Scroll down to **"Scopes"** → **"Bot Token Scopes"**
3. Click **"Add an OAuth Scope"** and add:
   - `chat:write` - Allows the app to send messages
   - `channels:read` - Allows reading public channel information
   - `groups:read` - Allows reading private channel information

### Install App to Workspace

1. Scroll up to the top of the OAuth & Permissions page
2. Click **"Install to Workspace"**
3. Review the permissions and click **"Allow"**
4. You'll be redirected back to the OAuth & Permissions page

### Copy Bot Token

1. On the OAuth & Permissions page, find **"Bot User OAuth Token"**
2. It should start with `xoxb-`
3. Click **"Copy"** to copy the token
4. **Keep this token secure** - don't share it publicly

## Step 5: Configure in Cursor

1. In Cursor, open a chat
2. Type: `configure`
3. When prompted, paste your Slack Bot Token
4. Optionally set a default channel (e.g., `halo`)
5. Optionally customize the format template

The configuration will be saved to your workspace.

## Step 6: Test the Integration

1. List your Slack channels:
```
list_channels
```

2. Send a test EOD status:
```
eod_status your-channel-name
```

The AI should automatically generate a summary and post it to Slack!

## Troubleshooting

### Server Not Loading

- Check that the path in `mcp.json` is correct and absolute
- Verify `dist/index.js` exists after building
- Check Cursor's console/logs for errors
- Ensure Node.js is in your PATH

### Configuration Fails

- Verify your Slack token starts with `xoxb-`
- Check that all required scopes are added
- Ensure the app is installed to your workspace
- Try regenerating the token in Slack app settings

### Can't Post to Slack

- Verify the channel name is correct
- Check that the bot has access to the channel
- Ensure `chat:write` scope is added
- Try listing channels to verify token works

### Database Errors

- Ensure the `data/` directory is writable
- Check disk space
- Verify SQLite is working (it's included with Node.js)

## Next Steps

- Customize your format template: `update_format_template`
- Set a default channel: `set_default_channel`
- Preview your format: `preview_format`

See the [README.md](../README.md) for more usage examples.

