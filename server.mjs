import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import { initDB, upsertSlackUser, getSlackConfigByInternalUserId } from './src/db.mjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Validate required environment variables
const requiredEnvVars = [
  'SLACK_CLIENT_ID',
  'SLACK_CLIENT_SECRET',
  'SLACK_REDIRECT_URI',
  'DATABASE_URL'
];

const missingEnvVars = requiredEnvVars.filter(key => !process.env[key]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Initialize Database
initDB().catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

// Serve static files from public directory
app.use(express.static('public'));

// 1. Healthcheck
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// 2. Landing Page
// Handled by express.static for '/', explicitly adding here for clarity if needed, 
// but usually static middleware handles index.html on root.
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 4. Slack OAuth Start
app.get('/slack/oauth/start', (req, res) => {
  const state = req.query.state || 'demo-user';
  const scopes = 'chat:write,channels:read,groups:read'; // Bot scopes
  const userScopes = 'chat:write'; // User scopes

  const slackAuthUrl = new URL('https://slack.com/oauth/v2/authorize');
  slackAuthUrl.searchParams.append('client_id', process.env.SLACK_CLIENT_ID);
  slackAuthUrl.searchParams.append('scope', scopes);
  slackAuthUrl.searchParams.append('user_scope', userScopes);
  slackAuthUrl.searchParams.append('redirect_uri', process.env.SLACK_REDIRECT_URI);
  slackAuthUrl.searchParams.append('state', state);

  console.log(`Redirecting to Slack OAuth: ${slackAuthUrl.toString()}`);
  res.redirect(slackAuthUrl.toString());
});

// 5. Slack OAuth Callback
app.get('/slack/oauth/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    console.error('Slack OAuth error:', error);
    return res.status(500).send(`<h1>OAuth Error</h1><p>${error}</p>`);
  }

  if (!code) {
    return res.status(400).send('Missing ?code from Slack');
  }

  try {
    const response = await axios.post(
      'https://slack.com/api/oauth.v2.access',
      new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        code: code.toString(),
        redirect_uri: process.env.SLACK_REDIRECT_URI,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const data = response.data;

    if (!data.ok) {
      console.error('Slack API error:', data);
      return res.status(500).send(`<h1>Slack API Error</h1><pre>${JSON.stringify(data, null, 2)}</pre>`);
    }

    // Extract tokens
    const internalUserId = state;
    const slackUserId = data.authed_user.id;
    const slackTeamId = data.team.id;
    const slackUserToken = data.authed_user.access_token;
    const slackBotToken = data.access_token || null;

    await upsertSlackUser({
      internalUserId,
      slackUserId,
      slackTeamId,
      slackUserToken,
      slackBotToken,
    });

    const maskedBotToken = slackBotToken ? `${slackBotToken.slice(0, 10)}...` : 'Not Available';
    const maskedUserToken = slackUserToken ? `${slackUserToken.slice(0, 10)}...` : 'Not Available';

    console.log(`Tokens saved for user ${internalUserId}. Bot: ${maskedBotToken}, User: ${maskedUserToken}`);

    // Success page
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Slack Connected - Cursor EOD MCP</title>
          <link rel="stylesheet" href="/styles.css">
          <style>
            body { display: flex; justify-content: center; align-items: center; height: 100vh; flex-direction: column; }
            .card { max-width: 600px; padding: 2rem; background: rgba(255,255,255,0.1); border-radius: 16px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2); text-align: center; }
            h1 { color: white; margin-bottom: 1rem; }
            p { color: #ccc; margin-bottom: 1.5rem; }
            .warning-note { background: rgba(255, 165, 0, 0.15); border: 1px solid rgba(255, 165, 0, 0.3); padding: 1rem; border-radius: 8px; color: #ffcd85; margin-bottom: 2rem; font-size: 0.9rem; }
            .tokens { background: #111; padding: 1rem; border-radius: 8px; text-align: left; overflow-x: auto; font-family: monospace; margin-bottom: 2rem; color: #0f0; }
            .btn { display: inline-block; padding: 10px 20px; background: white; color: #00005C; text-decoration: none; border-radius: 6px; font-weight: bold; }
          </style>
      </head>
      <body>
          <div class="card">
              <h1>Slack Connected Successfully!</h1>
              <p>Your workspace has been authenticated. You can now use these tokens in your Cursor EOD MCP configuration.</p>
              
              <div class="warning-note">
                  <strong>⚠️ Important:</strong> Copy these tokens to a safe place now. You will need them later when installing the MCP server in Cursor.
              </div>

              <div class="tokens">
                  SLACK_BOT_TOKEN = ${slackBotToken}<br>
                  SLACK_USER_TOKEN = ${slackUserToken}<br>
                  SLACK_DEFAULT_CHANNEL = halo
              </div>

              <a href="/" class="btn">Return to Home</a>
          </div>
      </body>
      </html>
    `);

  } catch (err) {
    console.error('Error during token exchange:', err);
    res.status(500).send('<h1>Internal Server Error</h1>');
  }
});

// 6. MCP Config Endpoint
app.get('/api/mcp-config/:internalUserId', async (req, res) => {
  const { internalUserId } = req.params;
  
  try {
    const config = await getSlackConfigByInternalUserId(internalUserId);
    
    if (!config) {
      return res.status(404).json({ error: 'not_found' });
    }

    res.json({
      SLACK_BOT_TOKEN: config.slackBotToken,
      SLACK_USER_TOKEN: config.slackUserToken || "",
      SLACK_DEFAULT_CHANNEL: config.slackDefaultChannel
    });
  } catch (err) {
    console.error('Error fetching config:', err);
    res.status(500).json({ error: 'internal_server_error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

