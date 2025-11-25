#!/usr/bin/env node

/**
 * Test MCP Protocol Communication
 * Tests that the server can handle JSON-RPC requests properly
 */

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = __dirname;
const DIST_PATH = join(PROJECT_ROOT, 'dist', 'index.js');

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

async function sendMCPRequest(server, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 10000);
    const request = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };
    
    let responseData = '';
    let errorData = '';
    
    const timeout = setTimeout(() => {
      reject(new Error(`Request timeout for ${method}`));
    }, 5000);
    
    const responseHandler = (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      for (const line of lines) {
        try {
          const response = JSON.parse(line);
          if (response.id === id) {
            clearTimeout(timeout);
            server.stdout.removeListener('data', responseHandler);
            server.stderr.removeListener('data', errorHandler);
            if (response.error) {
              reject(new Error(`MCP Error: ${response.error.message || JSON.stringify(response.error)}`));
            } else {
              resolve(response.result);
            }
          }
        } catch (e) {
          // Not JSON, continue
        }
      }
    };
    
    const errorHandler = (data) => {
      errorData += data.toString();
    };
    
    server.stdout.on('data', responseHandler);
    server.stderr.on('data', errorHandler);
    
    try {
      server.stdin.write(JSON.stringify(request) + '\n');
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

async function testMCPProtocol() {
  log(`\n${colors.blue}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
  log(`${colors.blue}║${colors.reset}  ${colors.cyan}MCP Protocol Communication Test${colors.reset}              ${colors.blue}║${colors.reset}`);
  log(`${colors.blue}╚═══════════════════════════════════════════════════════════╝${colors.reset}\n`);
  
  const server = spawn('node', [DIST_PATH], {
    cwd: PROJECT_ROOT,
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let testsPassed = 0;
  let testsFailed = 0;
  
  try {
    // Wait a bit for server to initialize
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Test 1: Initialize
    log(`${colors.cyan}▶ Testing: Initialize${colors.reset}`);
    try {
      const initResult = await sendMCPRequest(server, 'initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' }
      });
      
      if (initResult && initResult.capabilities) {
        log(`  ${colors.green}✓${colors.reset} Initialize successful`, colors.green);
        testsPassed++;
      } else {
        throw new Error('Invalid initialize response');
      }
    } catch (error) {
      log(`  ${colors.red}✗${colors.reset} Initialize failed: ${error.message}`, colors.red);
      testsFailed++;
    }
    
    // Send initialized notification
    try {
      server.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        method: 'notifications/initialized'
      }) + '\n');
    } catch (error) {
      // Ignore
    }
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Test 2: List Tools
    log(`${colors.cyan}▶ Testing: List Tools${colors.reset}`);
    try {
      const toolsResult = await sendMCPRequest(server, 'tools/list', {});
      
      if (toolsResult && Array.isArray(toolsResult.tools)) {
        const toolNames = toolsResult.tools.map(t => t.name);
        const expectedTools = [
          'configure',
          'eod_status',
          'list_channels',
          'set_default_channel',
          'update_format_template',
          'preview_format',
          'generate_eod_summary'
        ];
        
        const missingTools = expectedTools.filter(name => !toolNames.includes(name));
        if (missingTools.length > 0) {
          throw new Error(`Missing tools: ${missingTools.join(', ')}`);
        }
        
        log(`  ${colors.green}✓${colors.reset} List tools successful (found ${toolNames.length} tools)`, colors.green);
        log(`    Tools: ${toolNames.join(', ')}`, colors.cyan);
        testsPassed++;
      } else {
        throw new Error('Invalid tools/list response');
      }
    } catch (error) {
      log(`  ${colors.red}✗${colors.reset} List tools failed: ${error.message}`, colors.red);
      testsFailed++;
    }
    
    // Test 3: Get Tool Schema
    log(`${colors.cyan}▶ Testing: Get Tool Schema${colors.reset}`);
    try {
      const schemaResult = await sendMCPRequest(server, 'tools/list', {});
      
      if (schemaResult && schemaResult.tools && schemaResult.tools.length > 0) {
        const configureTool = schemaResult.tools.find(t => t.name === 'configure');
        if (configureTool && configureTool.inputSchema) {
          log(`  ${colors.green}✓${colors.reset} Tool schema retrieved`, colors.green);
          log(`    Configure tool has input schema: ${configureTool.inputSchema ? 'Yes' : 'No'}`, colors.cyan);
          testsPassed++;
        } else {
          throw new Error('Configure tool schema not found');
        }
      } else {
        throw new Error('No tools in response');
      }
    } catch (error) {
      log(`  ${colors.red}✗${colors.reset} Get tool schema failed: ${error.message}`, colors.red);
      testsFailed++;
    }
    
  } catch (error) {
    log(`\n${colors.red}Fatal error: ${error.message}${colors.reset}`, colors.red);
    testsFailed++;
  } finally {
    // Clean up
    try {
      server.kill();
    } catch (error) {
      // Ignore
    }
  }
  
  // Summary
  log(`\n${colors.blue}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
  log(`${colors.blue}║${colors.reset}  ${colors.cyan}Protocol Test Summary${colors.reset}                        ${colors.blue}║${colors.reset}`);
  log(`${colors.blue}╚═══════════════════════════════════════════════════════════╝${colors.reset}`);
  log(`\n${colors.green}✓ Passed: ${testsPassed}${colors.reset}`);
  if (testsFailed > 0) {
    log(`${colors.red}✗ Failed: ${testsFailed}${colors.reset}`);
  }
  
  if (testsFailed === 0) {
    log(`\n${colors.green}✅ MCP Protocol tests passed!${colors.reset}\n`);
    process.exit(0);
  } else {
    log(`\n${colors.yellow}⚠ Some protocol tests failed.${colors.reset}\n`);
    process.exit(1);
  }
}

// Run protocol tests
testMCPProtocol().catch((error) => {
  log(`\n${colors.red}Fatal error: ${error.message}${colors.reset}\n`, colors.red);
  console.error(error);
  process.exit(1);
});

