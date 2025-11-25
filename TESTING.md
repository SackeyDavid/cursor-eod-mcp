# Testing Guide - EOD Status MCP Server

This guide walks you through testing the MCP server locally in Cursor before publishing to the marketplace.

## Prerequisites

1. **Node.js 18+** installed
2. **Cursor IDE** installed
3. **A Slack workspace** where you can create apps
4. **Git** (optional, for version control)

## Step 1: Build the Project

```bash
# Navigate to project directory
cd /Users/Kofi/dev/halo-eod-mcp

# Install dependencies (if not already done)
npm install

# Build the TypeScript code
npm run build
```

Verify the build succeeded - you should see a `dist/` folder with compiled JavaScript files.

## Step 2: Configure Cursor to Use the MCP Server

### Find Your Cursor MCP Config File

The Cursor MCP config file is located at:
- **All platforms**: `~/cursor/mcp.json`

You can also access it via:
- Cursor Settings → MCP → Edit Config
- Or directly edit: `~/cursor/mcp.json`

### Add the Server Configuration

Add this to your Cursor MCP config file:

```json
{
  "mcpServers": {
    "halo-eod-mcp": {
      "command": "node",
      "args": ["/Users/Kofi/dev/halo-eod-mcp/dist/index.js"]
    }
  }
}
```

**Important**: Replace `/Users/Kofi/dev/halo-eod-mcp` with the **absolute path** to your project directory.

### Restart Cursor

Close and reopen Cursor IDE to load the MCP server.

## Step 3: Verify Server is Loaded

1. Open a chat in Cursor
2. Type: `list_channels` or `configure`
3. If you see the tool available (or get a "not configured" error), the server is loaded correctly
4. If you see an error about the server not being found, check:
   - The path in the config is correct and absolute
   - The `dist/index.js` file exists
   - You restarted Cursor after adding the config

## Step 4: Set Up Slack Integration

### Create a Slack App

1. Go to https://api.slack.com/apps
2. Click **"Create New App"** → **"From scratch"**
3. Name: `EOD Status Test Bot`
4. Select your workspace
5. Click **"Create App"**

### Configure OAuth Scopes

1. In the sidebar, click **"OAuth & Permissions"**
2. Scroll to **"Scopes"** → **"Bot Token Scopes"**
3. Click **"Add an OAuth Scope"** and add:
   - `chat:write` - Send messages
   - `channels:read` - Read public channels
   - `groups:read` - Read private channels

### Install App to Workspace

1. Scroll up to the top of the OAuth & Permissions page
2. Click **"Install to Workspace"**
3. Review permissions and click **"Allow"**
4. You'll be redirected back - **copy the "Bot User OAuth Token"** (starts with `xoxb-`)

## Step 5: Configure the MCP Server

In Cursor chat, run:

```
configure slack_token="xoxb-your-token-here" default_channel="general"
```

Replace:
- `xoxb-your-token-here` with your actual Bot Token
- `general` with a channel name that exists in your workspace

You should see: `✅ Configuration saved successfully!`

## Step 6: Test Each Tool

### Test 1: List Channels

```
list_channels
```

**Expected**: List of all Slack channels in your workspace

### Test 2: Set Default Channel

```
set_default_channel channel="your-test-channel"
```

**Expected**: Confirmation that default channel was set

### Test 3: Preview Format Template

```
preview_format
```

**Expected**: Preview of how messages will look with sample data

### Test 4: Update Format Template

```
update_format_template template="*EOD ({date})*\n\n{summary}"
```

**Expected**: Confirmation that template was updated

### Test 5: Send EOD Status (Manual Summary)

```
eod_status channel="your-test-channel" summary="• Tested MCP server\n• Verified Slack integration\n• All tools working"
```

**Expected**: 
- Message appears in your Slack channel
- Success confirmation in Cursor

### Test 6: Send EOD Status (Auto-Summary)

```
eod_status your-test-channel
```

**Expected**:
- AI generates summary from workspace conversations
- Message posted to Slack
- Success confirmation

## Step 7: Test Error Handling

### Test Missing Configuration

1. Delete or rename `data/eod-mcp.json`
2. Try: `eod_status channel="test"`
3. **Expected**: Error message asking to run `configure` first

### Test Invalid Token

1. Run: `configure slack_token="invalid-token"`
2. **Expected**: Token validation error

### Test Invalid Channel

1. Run: `eod_status channel="nonexistent-channel-12345" summary="test"`
2. **Expected**: Error about channel not found or access denied

## Step 8: Test Multi-Workspace Support

1. Open a different workspace/folder in Cursor
2. Run: `configure slack_token="xoxb-your-token" default_channel="different-channel"`
3. **Expected**: Separate configuration saved for this workspace
4. Check `data/eod-mcp.json` - should have multiple entries with different `workspace_path` values

## Step 9: Verify Data Persistence

1. Close and reopen Cursor
2. Run: `list_channels`
3. **Expected**: Should work without reconfiguration (config persisted)

## Step 10: Test Format Customization

1. Create a custom template:
```
update_format_template template="🚀 *EOD Update - {date}*\n\n*Summary:*\n{summary}\n\n*Pending:*\n{pending}\n\n*Tomorrow:*\n{planTomorrow}"
```

2. Preview it:
```
preview_format
```

3. Send a test message:
```
eod_status channel="test" summary="Test message" pending="Nothing pending" planTomorrow="More testing"
```

4. **Expected**: Message in Slack uses your custom format

## Troubleshooting

### Server Not Loading

- Check the path in MCP config is absolute
- Verify `dist/index.js` exists
- Check Cursor console/logs for errors
- Ensure Node.js is in your PATH

### Configuration Not Saving

- Check `data/` directory exists and is writable
- Verify `data/eod-mcp.json` is being created
- Check file permissions

### Slack API Errors

- Verify token is correct and starts with `xoxb-`
- Check scopes are added in Slack app settings
- Ensure app is installed to workspace
- Verify channel name is correct

### Build Errors

- Run `npm install` to ensure dependencies are installed
- Check Node.js version: `node --version` (should be 18+)
- Try deleting `node_modules` and `dist`, then `npm install` and `npm run build`

## Checklist Before Publishing

- [ ] All tools work correctly
- [ ] Error handling works as expected
- [ ] Multi-workspace support verified
- [ ] Data persistence confirmed
- [ ] Format customization works
- [ ] README.md is complete and accurate
- [ ] Installation instructions are clear
- [ ] Landing page is ready (if applicable)
- [ ] Version number is correct in `package.json`
- [ ] All dependencies are listed in `package.json`
- [ ] `.gitignore` excludes sensitive files

## Next Steps After Testing

1. Update version in `package.json` if needed
2. Create a GitHub repository
3. Push code to GitHub
4. Prepare marketplace submission (if applicable)
5. Create release notes
6. Tag a release version

## Quick Test Script

Run this in Cursor chat to test everything at once:

```
configure slack_token="YOUR_TOKEN" default_channel="test"
list_channels
set_default_channel channel="test"
preview_format
eod_status channel="test" summary="Quick test\n• Tool 1 works\n• Tool 2 works"
```

If all commands succeed, your MCP server is ready to publish!

