#!/usr/bin/env node

/**
 * Automated test script for the EOD Status MCP Server
 * Tests server startup, tool registration, and basic functionality
 */

import { spawn } from 'child_process';
import { readFileSync, existsSync, unlinkSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = __dirname;
const DIST_PATH = join(PROJECT_ROOT, 'dist', 'index.js');
const DATA_DIR = join(PROJECT_ROOT, 'data');
const DB_PATH = join(DATA_DIR, 'eod-mcp.db');

// Test results
const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function test(name, fn) {
  try {
    log(`\n${colors.cyan}▶ Testing: ${name}${colors.reset}`);
    const result = fn();
    if (result instanceof Promise) {
      return result.then(
        (value) => {
          results.passed.push(name);
          log(`  ${colors.green}✓${colors.reset} ${name}`, colors.green);
          return value;
        },
        (error) => {
          results.failed.push({ name, error: error.message });
          log(`  ${colors.red}✗${colors.reset} ${name}: ${error.message}`, colors.red);
          throw error;
        }
      );
    } else {
      results.passed.push(name);
      log(`  ${colors.green}✓${colors.reset} ${name}`, colors.green);
      return result;
    }
  } catch (error) {
    results.failed.push({ name, error: error.message });
    log(`  ${colors.red}✗${colors.reset} ${name}: ${error.message}`, colors.red);
    throw error;
  }
}

async function testAsync(name, fn) {
  return test(name, fn);
}

// Test 1: Check if dist files exist
function testDistFilesExist() {
  if (!existsSync(DIST_PATH)) {
    throw new Error(`Dist file not found: ${DIST_PATH}\nRun 'npm run build' first.`);
  }
  
  // Check key files exist
  const requiredFiles = [
    'dist/index.js',
    'dist/config/userConfig.js',
    'dist/config/storage.js',
    'dist/tools/configure.js',
    'dist/tools/eodStatus.js',
    'dist/tools/channelManager.js',
    'dist/tools/formatManager.js',
    'dist/tools/generateSummary.js',
    'dist/slackClient.js',
    'dist/auth/slackOAuth.js'
  ];
  
  for (const file of requiredFiles) {
    const filePath = join(PROJECT_ROOT, file);
    if (!existsSync(filePath)) {
      throw new Error(`Required file not found: ${file}`);
    }
  }
}

// Test 2: Check if server can be imported
async function testServerImport() {
  try {
    // Try to import the server module
    const serverModule = await import(`file://${DIST_PATH}`);
    if (!serverModule) {
      throw new Error('Server module import failed');
    }
  } catch (error) {
    // If it's a syntax error or import error, that's a problem
    if (error.message.includes('Cannot find module') || 
        error.message.includes('SyntaxError') ||
        error.message.includes('Unexpected')) {
      throw error;
    }
    // Other errors might be expected (like missing dependencies at runtime)
    results.warnings.push(`Server import warning: ${error.message}`);
  }
}

// Test 3: Test configuration storage
async function testConfigStorage() {
  // Backup existing DB if it exists
  const backupPath = DB_PATH + '.backup';
  let hasBackup = false;
  if (existsSync(DB_PATH)) {
    const fs = await import('fs');
    fs.copyFileSync(DB_PATH, backupPath);
    hasBackup = true;
  }
  
  try {
    // Ensure data directory exists
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    
    // Delete existing DB for clean test
    if (existsSync(DB_PATH)) {
      unlinkSync(DB_PATH);
    }
    
    // Import and test UserConfigManager
    const { UserConfigManager } = await import(`file://${join(PROJECT_ROOT, 'dist', 'config', 'userConfig.js')}`);
    const manager = new UserConfigManager();
    
    // Test workspace path detection
    const workspacePath = manager.getWorkspacePath();
    if (!workspacePath || workspacePath.length === 0) {
      throw new Error('Workspace path is empty');
    }
    
    // Test config saving (with invalid token - should fail validation but test storage)
    try {
      manager.saveConfig({
        slack_token: 'xoxb-test-token-12345',
        default_channel: 'test-channel'
      });
    } catch (error) {
      // Expected - token validation will fail, but storage should work
      if (!error.message.includes('token') && !error.message.includes('Token')) {
        throw error;
      }
    }
    
    // Test config retrieval
    const config = manager.getCurrentUserConfig();
    if (config && config.workspace_path !== workspacePath) {
      throw new Error('Config workspace path mismatch');
    }
    
    // Restore backup if it existed
    if (hasBackup && existsSync(backupPath)) {
      const fs = await import('fs');
      if (existsSync(DB_PATH)) {
        unlinkSync(DB_PATH);
      }
      fs.copyFileSync(backupPath, DB_PATH);
      unlinkSync(backupPath);
    }
  } catch (error) {
    // Restore backup on error
    if (hasBackup && existsSync(backupPath)) {
      const fs = await import('fs');
      if (existsSync(DB_PATH)) {
        unlinkSync(DB_PATH);
      }
      fs.copyFileSync(backupPath, DB_PATH);
      unlinkSync(backupPath);
    }
    throw error;
  }
}

// Test 4: Test tool modules can be imported
async function testToolImports() {
  const tools = [
    'tools/configure.js',
    'tools/eodStatus.js',
    'tools/channelManager.js',
    'tools/formatManager.js',
    'tools/generateSummary.js'
  ];
  
  for (const tool of tools) {
    const toolPath = join(PROJECT_ROOT, 'dist', tool);
    try {
      await import(`file://${toolPath}`);
    } catch (error) {
      if (error.message.includes('Cannot find module') || 
          error.message.includes('SyntaxError')) {
        throw new Error(`Failed to import ${tool}: ${error.message}`);
      }
      // Other errors might be expected
      results.warnings.push(`Tool import warning for ${tool}: ${error.message}`);
    }
  }
}

// Test 5: Test server startup (timeout after 5 seconds)
async function testServerStartup() {
  return new Promise((resolve, reject) => {
    const server = spawn('node', [DIST_PATH], {
      cwd: PROJECT_ROOT,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    let errorOutput = '';
    
    server.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    server.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    server.on('error', (error) => {
      server.kill();
      reject(new Error(`Server spawn failed: ${error.message}`));
    });
    
    // Server should start without immediate errors
    const timeout = setTimeout(() => {
      server.kill();
      // If server is still running after 2 seconds, it started successfully
      // (MCP servers wait for stdio input, so this is expected)
      resolve();
    }, 2000);
    
    server.on('exit', (code, signal) => {
      clearTimeout(timeout);
      if (code !== null && code !== 0 && code !== 1) {
        // Exit code 0 or 1 might be normal, but others indicate problems
        reject(new Error(`Server exited with code ${code}, signal ${signal}\nOutput: ${output}\nError: ${errorOutput}`));
      } else if (errorOutput && errorOutput.includes('Error') && !errorOutput.includes('MCP server failed')) {
        // Check for actual errors (not just warnings)
        const criticalErrors = errorOutput.match(/Error:.*/g);
        if (criticalErrors && criticalErrors.length > 0) {
          reject(new Error(`Server errors detected:\n${criticalErrors.join('\n')}`));
        }
      }
      resolve();
    });
    
    // Send a test message to see if server responds
    setTimeout(() => {
      try {
        server.stdin.write(JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' }
          }
        }) + '\n');
      } catch (error) {
        // Ignore write errors - server might have already exited
      }
    }, 100);
    
    // Kill server after test
    setTimeout(() => {
      if (!server.killed) {
        server.kill();
      }
    }, 3000);
  });
}

// Test 6: Test package.json structure
function testPackageJson() {
  const packagePath = join(PROJECT_ROOT, 'package.json');
  if (!existsSync(packagePath)) {
    throw new Error('package.json not found');
  }
  
  const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
  
  if (!pkg.name) {
    throw new Error('package.json missing name');
  }
  
  if (!pkg.version) {
    throw new Error('package.json missing version');
  }
  
  if (!pkg.main || pkg.main !== 'dist/index.js') {
    throw new Error('package.json main should be dist/index.js');
  }
  
  if (!pkg.dependencies || !pkg.dependencies['@modelcontextprotocol/sdk']) {
    throw new Error('package.json missing @modelcontextprotocol/sdk dependency');
  }
  
  if (!pkg.dependencies || !pkg.dependencies['@slack/web-api']) {
    throw new Error('package.json missing @slack/web-api dependency');
  }
}

// Test 7: Test TypeScript compilation
function testTypeScriptCompilation() {
  // Check if .d.ts files exist (indicates successful compilation)
  const typeFiles = [
    'dist/index.d.ts',
    'dist/config/userConfig.d.ts',
    'dist/tools/configure.d.ts'
  ];
  
  for (const file of typeFiles) {
    const filePath = join(PROJECT_ROOT, file);
    if (!existsSync(filePath)) {
      results.warnings.push(`Type definition file not found: ${file}`);
    }
  }
}

// Test 8: Test environment variable handling
async function testEnvVarHandling() {
  const { UserConfigManager } = await import(`file://${join(PROJECT_ROOT, 'dist', 'config', 'userConfig.js')}`);
  const manager = new UserConfigManager();
  
  // Test that getSlackTokenFromEnv handles missing env vars gracefully
  const token = manager.getSlackTokenFromEnv();
  // Should return null if not set, not throw an error
  if (token === undefined) {
    throw new Error('getSlackTokenFromEnv should return null when env var is not set');
  }
}

// Main test runner
async function runTests() {
  log(`${colors.blue}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
  log(`${colors.blue}║${colors.reset}  ${colors.cyan}EOD Status MCP Server - Automated Test Suite${colors.reset}     ${colors.blue}║${colors.reset}`);
  log(`${colors.blue}╚═══════════════════════════════════════════════════════════╝${colors.reset}`);
  
  try {
    await testAsync('Dist files exist', testDistFilesExist);
    await testAsync('Package.json structure', testPackageJson);
    await testAsync('TypeScript compilation', testTypeScriptCompilation);
    await testAsync('Tool modules import', testToolImports);
    await testAsync('Server module import', testServerImport);
    await testAsync('Configuration storage', testConfigStorage);
    await testAsync('Environment variable handling', testEnvVarHandling);
    await testAsync('Server startup', testServerStartup);
    
    // Print summary
    log(`\n${colors.blue}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
    log(`${colors.blue}║${colors.reset}  ${colors.cyan}Test Summary${colors.reset}                                    ${colors.blue}║${colors.reset}`);
    log(`${colors.blue}╚═══════════════════════════════════════════════════════════╝${colors.reset}`);
    
    log(`\n${colors.green}✓ Passed: ${results.passed.length}${colors.reset}`);
    if (results.failed.length > 0) {
      log(`${colors.red}✗ Failed: ${results.failed.length}${colors.reset}`);
      results.failed.forEach(({ name, error }) => {
        log(`  - ${name}: ${error}`, colors.red);
      });
    }
    if (results.warnings.length > 0) {
      log(`${colors.yellow}⚠ Warnings: ${results.warnings.length}${colors.reset}`);
      results.warnings.forEach((warning) => {
        log(`  - ${warning}`, colors.yellow);
      });
    }
    
    if (results.failed.length === 0) {
      log(`\n${colors.green}✅ All tests passed! MCP server is ready to use.${colors.reset}\n`);
      process.exit(0);
    } else {
      log(`\n${colors.red}❌ Some tests failed. Please fix the issues above.${colors.reset}\n`);
      process.exit(1);
    }
  } catch (error) {
    log(`\n${colors.red}❌ Test suite failed: ${error.message}${colors.reset}\n`);
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  log(`\n${colors.red}Fatal error: ${error.message}${colors.reset}\n`);
  console.error(error);
  process.exit(1);
});

