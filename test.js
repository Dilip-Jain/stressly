// Main k6 test runner with scenario support

import { sleep } from 'k6';
import { config } from './config.js';
import { endpoints } from './endpoints.js';
import {
  MetricsTracker,
  makeRequest,
  selectEndpoint,
  selectUserProfile,
  getThinkTime,
  verifyAuth,
  verifyHealth,
} from './utils.js';
import TestReporter from './reporter.js';

// Determine which scenario to run
const scenarioName = config.cli.scenarioName || 'load';
const scenario = config.scenarios[scenarioName];

if (!scenario) {
  throw new Error(`Unknown scenario: ${scenarioName}. Available: ${Object.keys(config.scenarios).join(', ')}`);
}

// Set k6 options with selected scenario
export const options = {
  stages: scenario.stages,
  thresholds: config.thresholds,
  ext: {
    loadimpact: {
      projectID: parseInt(__ENV.LOADIMPACT_PROJECT_ID) || 0,
      name: scenario.name,
    },
  },
};

// Global metrics tracker
const metricsTracker = new MetricsTracker();

// Setup: Run before test starts
export function setup() {
  console.log('\n' + '='.repeat(80));
  console.log('                    K6 PERFORMANCE TEST SETUP');
  console.log('='.repeat(80));

  console.log(`\nTest Configuration:`);
  console.log(`  Scenario: ${scenario.name}`);
  console.log(`  Description: ${scenario.description}`);
  console.log(`  Base URL: ${config.api.baseUrl}`);
  console.log(`  Auth Type: ${config.auth.type}`);
  console.log(`  Virtual Users (peak): ${scenario.stages[scenario.stages.length - 2]?.target || 'N/A'}`);
  console.log(`  Total Duration: ${calculateTotalDuration(scenario.stages)}`);

  // Pre-test verification
  console.log('\nRunning pre-test checks...');
  try {
    verifyHealth(config.api.baseUrl);
    if (config.auth.type !== 'none') {
      verifyAuth(config.api.baseUrl, config.auth);
    }
  } catch (error) {
    console.error(`✗ Pre-test check failed: ${error.message}`);
    throw error;
  }

  console.log('\n✓ Setup complete, starting test...\n');

  return {
    metricsTracker,
    startTime: new Date().toISOString(),
  };
}

// Main test function
export default function (data) {
  const userProfile = selectUserProfile(config.userProfiles);
  const requestsPerSession = 
    userProfile.requestsPerSession.min +
    Math.floor(Math.random() * (userProfile.requestsPerSession.max - userProfile.requestsPerSession.min));

  // Execute requests for this user session
  for (let i = 0; i < requestsPerSession; i++) {
    const endpoint = selectEndpoint(endpoints);
    
    const result = makeRequest(
      endpoint,
      config.api.baseUrl,
      config.auth
    );

    if (result) {
      metricsTracker.recordRequest(endpoint, result.response, result.duration, endpoint.tags);
    }

    // Think time between requests
    const thinkTime = getThinkTime(userProfile);
    sleep(thinkTime);
  }
}

// Teardown: Run after test completes
export function teardown(data) {
  console.log('\n' + '='.repeat(80));
  console.log('                    GENERATING TEST REPORT');
  console.log('='.repeat(80));

  const reporter = new TestReporter(metricsTracker, {
    testName: scenario.name,
    scenarioName: scenarioName,
    baseUrl: config.api.baseUrl,
  });

  reporter.printSummary();

  // Generate JSON report (in real scenario, this would be saved to file)
  if (config.reporting.verbose) {
    const report = reporter.generateJsonReport();
    console.log('\n[Report JSON available for export]');
  }
}

// Helper function to calculate total test duration
function calculateTotalDuration(stages) {
  const totalSeconds = stages.reduce((sum, stage) => {
    const durationParts = stage.duration.match(/(\d+)([smh])/);
    if (!durationParts) return sum;

    const value = parseInt(durationParts[1]);
    const unit = durationParts[2];

    switch (unit) {
      case 's': return sum + value;
      case 'm': return sum + (value * 60);
      case 'h': return sum + (value * 3600);
      default: return sum;
    }
  }, 0);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
