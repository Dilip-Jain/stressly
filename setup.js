#!/usr/bin/env node

/**
 * Stressly Setup Helper
 * 
 * This script helps set up the Stressly k6 performance testing framework
 * Usage: node setup.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

async function setup() {
  console.log('\n' + '='.repeat(60));
  console.log('  STRESSLY - K6 PERFORMANCE TESTING SETUP');
  console.log('='.repeat(60) + '\n');

  // Check if config.env exists
  const configPath = path.join(__dirname, 'config.env');
  if (!fs.existsSync(configPath)) {
    console.log('📝 Creating config.env from template...');
    const examplePath = path.join(__dirname, 'config.env.example');
    fs.copyFileSync(examplePath, configPath);
    console.log('✓ config.env created\n');
  } else {
    console.log('✓ config.env already exists\n');
  }

  // Ask for configuration
  console.log('📋 Configuration Setup\n');

  const baseUrl = await question('API Base URL (default: http://localhost:3000): ');
  const authType = await question('Auth Type [none/bearer/basic/apikey] (default: bearer): ');
  
  let authValue = '';
  if (authType.toLowerCase() === 'bearer' || authType === '') {
    authValue = await question('Bearer Token: ');
  } else if (authType.toLowerCase() === 'basic') {
    const username = await question('Username: ');
    const password = await question('Password: ');
    console.log('Note: Store credentials securely, not in config.env\n');
  } else if (authType.toLowerCase() === 'apikey') {
    authValue = await question('API Key: ');
  }

  const scenario = await question('Default Scenario [smoke/load/stress/spike/soak] (default: load): ');

  // Write config
  let configContent = fs.readFileSync(configPath, 'utf8');
  
  if (baseUrl) {
    configContent = configContent.replace(
      /BASE_URL=.*/,
      `BASE_URL=${baseUrl}`
    );
  }
  
  if (authType) {
    configContent = configContent.replace(
      /AUTH_TYPE=.*/,
      `AUTH_TYPE=${authType.toLowerCase() || 'bearer'}`
    );
  }
  
  if (authValue) {
    configContent = configContent.replace(
      /AUTH_BEARER=.*/,
      `AUTH_BEARER=${authValue}`
    );
  }
  
  if (scenario) {
    configContent = configContent.replace(
      /SCENARIO=.*/,
      `SCENARIO=${scenario.toLowerCase() || 'load'}`
    );
  }

  fs.writeFileSync(configPath, configContent);
  console.log('\n✓ Configuration saved to config.env\n');

  // Test runner scripts
  console.log('🔧 Test Runners\n');
  console.log('Windows: run-test.bat --scenario smoke');
  console.log('Unix:    ./run-test.sh --scenario load\n');

  // Verify k6
  const { execSync } = require('child_process');
  try {
    execSync('k6 version', { stdio: 'pipe' });
    const output = execSync('k6 version', { encoding: 'utf8' });
    console.log('✓ k6 is installed:', output.trim() + '\n');
  } catch (e) {
    console.log('⚠ k6 is not installed. Install from: https://k6.io/docs/getting-started/installation/\n');
  }

  // Print next steps
  console.log('📖 Next Steps\n');
  console.log('1. Review and customize endpoints.js');
  console.log('2. Adjust scenarios in config.js if needed');
  console.log('3. Run a smoke test: run-test.bat --scenario smoke');
  console.log('4. Review results and run load test\n');

  console.log('📚 Documentation\n');
  console.log('Quick reference: README_QUICK.md');
  console.log('Full guide:      GUIDE.md\n');

  console.log('='.repeat(60) + '\n');

  rl.close();
}

setup().catch(console.error);
