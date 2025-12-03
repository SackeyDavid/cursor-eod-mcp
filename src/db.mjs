import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Use DATABASE_URL from environment, or fail if not present (will be handled by server startup check)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS slack_users (
        id SERIAL PRIMARY KEY,
        internal_user_id TEXT NOT NULL UNIQUE,
        slack_user_id TEXT NOT NULL,
        slack_team_id TEXT NOT NULL,
        slack_user_token TEXT NOT NULL,
        slack_bot_token TEXT,
        slack_default_channel TEXT NOT NULL DEFAULT 'halo',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log('Database initialized: slack_users table ready.');
  } finally {
    client.release();
  }
}

export async function upsertSlackUser({
  internalUserId,
  slackUserId,
  slackTeamId,
  slackUserToken,
  slackBotToken,
}) {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO slack_users (
        internal_user_id,
        slack_user_id,
        slack_team_id,
        slack_user_token,
        slack_bot_token,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (internal_user_id)
      DO UPDATE SET
        slack_user_id = EXCLUDED.slack_user_id,
        slack_team_id = EXCLUDED.slack_team_id,
        slack_user_token = EXCLUDED.slack_user_token,
        slack_bot_token = COALESCE(EXCLUDED.slack_bot_token, slack_users.slack_bot_token),
        updated_at = NOW()
      RETURNING *;
    `;
    const values = [
      internalUserId,
      slackUserId,
      slackTeamId,
      slackUserToken,
      slackBotToken,
    ];
    const res = await client.query(query, values);
    return res.rows[0];
  } finally {
    client.release();
  }
}

export async function getSlackConfigByInternalUserId(internalUserId) {
  const client = await pool.connect();
  try {
    const query = `
      SELECT slack_bot_token, slack_user_token, slack_default_channel
      FROM slack_users
      WHERE internal_user_id = $1;
    `;
    const res = await client.query(query, [internalUserId]);
    
    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    return {
      slackBotToken: row.slack_bot_token,
      slackUserToken: row.slack_user_token,
      slackDefaultChannel: row.slack_default_channel,
    };
  } finally {
    client.release();
  }
}

