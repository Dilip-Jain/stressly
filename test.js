/**
 * K6 API Performance Testing - Main Test Script
 * 
 * This is a generic test runner that uses configuration from config.js
 * 
 * Usage:
 *   Load Test:   k6 run -e TEST_TYPE=load test.js
 *   Stress Test: k6 run -e TEST_TYPE=stress test.js
 *   Spike Test:  k6 run -e TEST_TYPE=spike test.js
 *   Smoke Test:  k6 run -e TEST_TYPE=smoke test.js
 *   Soak Test:   k6 run -e TEST_TYPE=soak test.js
 */

import { sleep } from 'k6';
import { config } from './config.js';
import {
  executeEndpoint,
  validateResponse,
  randomSleep,
  selectWeightedEndpoint,
  selectUserProfile,
  parseJsonResponse,
  verifyAuthentication,
  verifyServerHealth,
  endpointMetrics,
  endpointErrors,
  endpointSuccess,
  endpointTimeouts,
  endpointStatusCodes,
  filterInactiveEndpoints,
} from './utils.js';
import { Trend, Rate, Counter } from 'k6/metrics';
import { handleSummary } from './reporter.js';

// Get test type from environment variable (default to 'load')
const testType = __ENV.TEST_TYPE || 'load';

// Get scenario config
const scenario = config.scenarios[testType];

// Circuit breaker state tracking
const circuitBreaker = {
  isOpen: false,
  errorCount: 0,
  successCount: 0,
  threshold: config.circuitBreaker.threshold,
  minSampleSize: config.circuitBreaker.minSampleSize,
  resetAfter: config.circuitBreaker.resetAfterMs,
  lastTriggeredAt: 0,
};

// Request context tracking
let requestSequence = 0;
let sessionErrors = 0;
let sessionSuccesses = 0;

// Filter active endpoints (weight > 0) - creates object, not array
const activeEndpoints = filterInactiveEndpoints(config.endpoints);

// Initialize endpoint-specific metrics in init context
// Only create metrics for endpoints with weight > 0
Object.keys(activeEndpoints).forEach(endpointName => {
    const metricName = `${endpointName}_response_time`;
    endpointMetrics[endpointName] = new Trend(metricName);
    endpointErrors[endpointName] = new Rate(`${endpointName}_errors`);
    endpointSuccess[endpointName] = new Rate(`${endpointName}_success`);
    endpointTimeouts[endpointName] = new Rate(`${endpointName}_timeouts`);
    
    // Initialize status code counters for each category
    endpointStatusCodes[endpointName] = {
        status_2xx: new Counter(`${endpointName}_status_2xx`),
        status_3xx: new Counter(`${endpointName}_status_3xx`),
        status_4xx: new Counter(`${endpointName}_status_4xx`),
        status_5xx: new Counter(`${endpointName}_status_5xx`),
    };
});

// Validate test type exists in config
if (!config.scenarios[testType]) {
  throw new Error(`Invalid TEST_TYPE: ${testType}. Available types: ${Object.keys(config.scenarios).join(', ')}`);
}

// Validation function - comprehensive config check
function validateConfiguration() {
  const errors = [];
  
  // Validate base config
  if (!config.api?.baseUrl) errors.push('config.api.baseUrl is missing');
  if (!config.endpoints || Object.keys(config.endpoints).length === 0) errors.push('config.endpoints is empty');
  if (!config.scenarios[testType]) errors.push(`Scenario "${testType}" not found in config.scenarios`);
  
  // Validate endpoints
  let hasActiveEndpoint = false;
  Object.entries(config.endpoints).forEach(([name, endpoint]) => {
    if (!endpoint.path) errors.push(`Endpoint "${name}" missing path`);
    if (!endpoint.method) errors.push(`Endpoint "${name}" missing method`);
    if ((endpoint.weight || 0) > 0) hasActiveEndpoint = true;
  });
  
  if (!hasActiveEndpoint) errors.push('No endpoints with weight > 0 found');
  
  // Validate auth if enabled
  if (config.auth?.enabled) {
    if (config.auth.type === 'bearer' && !config.auth.token) {
      errors.push('Auth type is bearer but token is missing');
    }
    if (config.auth.type === 'basic' && (!config.auth.username || !config.auth.password)) {
      errors.push('Auth type is basic but username or password is missing');
    }
  }
  
  // Validate thresholds
  if (config.thresholds) {
    Object.entries(config.thresholds).forEach(([metric, rules]) => {
      if (!Array.isArray(rules) || rules.length === 0) {
        errors.push(`Threshold "${metric}" has no rules defined`);
      }
    });
  }
  
  return errors;
}

// Circuit breaker check
function checkCircuitBreaker() {
  if (circuitBreaker.isOpen) {
    const timeSinceTriggered = Date.now() - circuitBreaker.lastTriggeredAt;
    if (timeSinceTriggered >= circuitBreaker.resetAfter) {
      circuitBreaker.isOpen = false;
      circuitBreaker.errorCount = 0;
      circuitBreaker.successCount = 0;
      return false;
    }
    return true;
  }
  return false;
}

// Update circuit breaker state
function updateCircuitBreaker(isSuccess) {
  if (isSuccess) {
    circuitBreaker.successCount++;
  } else {
    circuitBreaker.errorCount++;
  }
  
  const total = circuitBreaker.errorCount + circuitBreaker.successCount;
  const errorRate = circuitBreaker.errorCount / total;
  
  if (errorRate >= circuitBreaker.threshold && total >= circuitBreaker.minSampleSize) {
    circuitBreaker.isOpen = true;
    circuitBreaker.lastTriggeredAt = Date.now();
    console.error(`🚨 CIRCUIT BREAKER TRIGGERED: ${(errorRate * 100).toFixed(1)}% error rate (${circuitBreaker.errorCount}/${total} requests)`);
  }
}

// Retry with exponential backoff
function executeWithRetry(executeFunc, endpointName, retryCount = 0) {
  try {
    return executeFunc();
  } catch (error) {
    if (retryCount < scenario.retry.maxRetries) {
      const backoffMs = scenario.retry.backoffMs * Math.pow(2, retryCount);
      console.warn(`Retry ${retryCount + 1}/${scenario.retry.maxRetries} for ${endpointName} after ${backoffMs}ms`);
      sleep(backoffMs / 1000);
      return executeWithRetry(executeFunc, endpointName, retryCount + 1);
    }
    throw error;
  }
}

// Export options for k6
export const options = {
  scenarios: {
    [testType]: config.scenarios[testType],
  },
  thresholds: config.thresholds,
  noConnectionReuse: config.options?.noConnectionReuse || false,
  insecureSkipTLSVerify: config.options?.insecureSkipTLSVerify || false,
  userAgent: config.options?.userAgent || 'k6/performance-test',
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

// Execution function - execute a single endpoint
function execute(userProfile, endpointName, endpointConfig) {
  // Check circuit breaker before executing
  if (checkCircuitBreaker()) {
    console.warn(`⚠️  Circuit breaker is OPEN - skipping request to ${endpointName}`);
    return;
  }

  requestSequence++;
  
  // Add test tags with request context
  const tags = {
    ...config.tags,
    testType: testType,
    endpointName: endpointName,
    userProfile: userProfile ? userProfile.name : 'default',
    requestSeq: requestSequence.toString(),
    scenarioType: testType,
  };

  let isSuccess = false;

  // Execute with retry logic
  try {
    const result = executeWithRetry(
      () => executeEndpoint(
        endpointConfig,
        config.baseUrl,
        config.auth,
        tags,
        endpointName,
        config.globalHeaders,
        config.options
      ),
      endpointName
    );

    // Validate response using endpoint-specific expected status
    if (result && result.response) {
      const expectedStatus = endpointConfig.expectedStatus || 200;
      const timeout = result.timeout || endpointConfig.timeout || 5000;

      validateResponse(
        result.response, 
        expectedStatus, 
        {
          'response has body': (r) => r.body && r.body.length > 0,
        },
        result.endpointName,
        result.url,
        timeout
      );

      // Optional: Parse and use response data
      const jsonData = parseJsonResponse(result.response);
      if (jsonData) {
        // Add Custom Logic
      }

      isSuccess = true;
      sessionSuccesses++;
    }
  } catch (error) {
    console.error(`❌ Request failed for ${endpointName}: ${error.message}`);
    sessionErrors++;
    isSuccess = false;
  }

  // Update circuit breaker state
  updateCircuitBreaker(isSuccess);
}

/**
 * Setup function - runs once before the test starts
 */
export function setup() {
  // STEP 1: Validate configuration
  console.log(`========================================`);
  console.log(`🔧 Validating Configuration...`);
  console.log(`========================================`);
  
  const validationErrors = validateConfiguration();
  if (validationErrors.length > 0) {
    console.error('\n❌ Configuration Validation Failed:\n');
    validationErrors.forEach(err => console.error(`   • ${err}`));
    console.error('\n❌ Cannot proceed - please fix configuration errors\n');
    throw new Error('Configuration validation failed');
  }
  console.log('✅ Configuration validation passed\n');

  // STEP 2: Show test configuration
  console.log(`========================================`);
  console.log(`🚀 Starting K6 ${testType.toUpperCase()} Test`);
  console.log(`📍 Base URL: ${config.api.baseUrl}`);
  console.log(`🎯 Active Endpoints: ${Object.keys(activeEndpoints).length}`);
  console.log(`🔐 Auth: ${config.auth?.enabled ? config.auth.type : 'disabled'}`);
  
  // Show scenario-specific retry config
  const retries = scenario.retry;
  console.log(`🔄 Retry Policy: ${retries.maxRetries} retries, ${retries.backoffMs}ms backoff`);
  console.log(`   (${retries.description})`);
  console.log(`⚡ Circuit Breaker: ${(circuitBreaker.threshold * 100).toFixed(0)}% error threshold (min ${circuitBreaker.minSampleSize} samples)`);
  
  // Show timeout mode
  if (__ENV.NO_TIMEOUT === '1') {
    const extendedTimeout = config.options?.extendedTimeout || 300000;
    const seconds = extendedTimeout / 1000;
    console.log(`⏱️  Timeouts: Extended (${seconds}s) - --no-timeout flag enabled`);
  }
  
  // Show threshold mode
  if (__ENV.NO_THRESHOLDS === '1') {
    console.log(`📊 Thresholds: Disabled - --no-thresholds flag enabled`);
  }
  
  console.log(`========================================`);
  
  // Pre-test verification
  if (config.verification && config.verification.enabled) {
    console.log('\n🔍 Running pre-test verification...\n');
    
    // Verify authentication
    const authResult = verifyAuthentication(
      config.api.baseUrl, 
      config.auth, 
      config.verification,
      config.api.globalHeaders
    );
    
    // Verify server health
    const healthResult = verifyServerHealth(
      config.api.baseUrl, 
      config.verification
    );
    
    console.log('');
    
    // Check for critical failures
    if (!authResult.success && !authResult.skipped) {
      console.error('❌ CRITICAL ERROR: Authentication verification failed');
      console.error(`   ${authResult.message}`);
      if (authResult.suggestion) {
        console.error(`   💡 Suggestion: ${authResult.suggestion}`);
      }
      console.error('\n   Cannot proceed with test - authentication is required for API access');
      console.error('   Please check your credentials in config.env or config.js\n');
      console.error(`========================================`);
      throw new Error('Pre-test verification failed: Authentication error');
    }
    
    // Warnings don't stop the test, but we log them
    if (healthResult.warning) {
      console.warn('⚠️  WARNING: Health check had warnings (test will continue)');
      console.warn(`    ${healthResult.message}\n`);
    }
    
    if (authResult.success && !authResult.skipped && healthResult.success) {
      console.log('✅ All pre-test verifications passed\n');
    }
    
    console.log(`========================================`);
  }
  
  // Log initialized metrics count
  console.log(`📈 Endpoint metrics initialized: ${Object.keys(endpointMetrics).length}`);
  console.log(`========================================\n`);

  return {
    testType: testType,
    startTime: new Date().toISOString(),
  };
}

/**
 * Main test function - runs for each virtual user iteration
 */
export default function (data) {
  // Check if ENDPOINT is specified (for targeted endpoint testing)
  if (__ENV.ENDPOINT) {
    // Test single specific endpoint
    const endpointName = __ENV.ENDPOINT;
    const endpointConfig = activeEndpoints[endpointName];
    
    if (!endpointConfig) {
      throw new Error(`Endpoint '${endpointName}' not found in endpoints.js or has weight=0`);
    }

    // Select user profile if enabled
    const userProfile = selectUserProfile(config.userProfiles);
    
    // Execute the single endpoint
    execute(userProfile, endpointName, endpointConfig);

  } else {
    // REGULAR TEST MODE: Normal load/stress/spike/smoke/soak tests
    // Select user profile if enabled
    const userProfile = selectUserProfile(config.userProfiles);
    
    // Determine how many requests to make this session
    let requestsToMake;
    let thinkTime;
    
    if (userProfile) {
      // User profile mode: make specific number of requests with profile-specific think time
      requestsToMake = userProfile.requests_per_session;
      thinkTime = userProfile.think_time;
    } else {
      // Default mode: execute all active endpoints once
      requestsToMake = Object.keys(activeEndpoints).length;
      thinkTime = [config.sleep?.min || 1, config.sleep?.max || 3];
    }
    
    // Execute requests
    for (let i = 0; i < requestsToMake; i++) {
      // Always use weighted random selection to respect endpoint weights
      const selected = selectWeightedEndpoint(activeEndpoints);
      const endpointName = selected.name;
      const endpointConfig = selected.config;
  
      execute(userProfile, endpointName, endpointConfig);
      
      // Think time between requests
      if (i < requestsToMake - 1) {
        randomSleep(thinkTime[0], thinkTime[1]);
      }
    }
  }
}

/**
 * Teardown function - runs once after the test completes
 */
export function teardown(data) {
  console.log(`========================================`);
  console.log(`✅ Test Completed: ${testType.toUpperCase()}`);
  console.log(`Start Time: ${data.startTime}`);
  console.log(`End Time: ${new Date().toISOString()}`);
  
  // Show circuit breaker final state
  if (circuitBreaker.isOpen) {
    console.log(`\n⚠️  Circuit Breaker Status: OPEN`);
    console.log(`   Error Count: ${circuitBreaker.errorCount}`);
    console.log(`   Success Count: ${circuitBreaker.successCount}`);
  } else {
    console.log(`\n✅ Circuit Breaker Status: CLOSED (healthy)`);
  }
  
  // Show session stats
  const totalRequests = sessionSuccesses + sessionErrors;
  const errorRate = totalRequests > 0 ? ((sessionErrors / totalRequests) * 100).toFixed(2) : 0;
  console.log(`\n📊 Session Statistics:`);
  console.log(`   Total Requests: ${totalRequests}`);
  console.log(`   Successful: ${sessionSuccesses}`);
  console.log(`   Failed: ${sessionErrors}`);
  console.log(`   Error Rate: ${errorRate}%`);
  
  console.log(`========================================`);
}

/**
 * Export handleSummary for formatted test reports
 * This is called by k6 after the test completes
 */
export { handleSummary };
