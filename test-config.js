// Quick test to verify config saving works
import { UserConfigManager } from './dist/config/userConfig.js';

const manager = new UserConfigManager();
console.log('Workspace path:', manager.getWorkspacePath());

try {
  const config = manager.saveConfig({
    slack_token: 'xoxb-test-token',
    default_channel: 'test-channel',
  });
  console.log('✅ Config saved:', config);
} catch (error) {
  console.error('❌ Error:', error);
}

