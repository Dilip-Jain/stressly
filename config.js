// Central configuration for k6 performance testing

import { endpoints } from './endpoints.js';

export const config = {
  // Base API configuration
  api: {
    baseUrl: __ENV.BASE_URL || 'http://localhost:3000',
    timeout: parseInt(__ENV.API_TIMEOUT) || 30000, // ms
    globalHeaders: { // Global headers added to all requests
      'User-Agent': __ENV.USER_AGENT || 'k6-performance-test/1.0',
    },
  },

  // Authentication configuration
  auth: {
    enabled: __ENV.USERNAME || __ENV.PASSWORD || __ENV.AUTH_TOKEN ? true : false,
    type: __ENV.AUTH_TYPE || 'bearer', // 'bearer', 'basic', 'apikey', or 'none'
    bearer: __ENV.AUTH_BEARER || '',
    basic: {
      username: __ENV.AUTH_USERNAME || '',
      password: __ENV.AUTH_PASSWORD || '',
    },
    apiKey: {
      headerName: __ENV.API_KEY_HEADER || 'X-API-Key',
      value: __ENV.API_KEY || '',
    },
  },

  // Pre-test verification settings
  // Test authentication and server health before running the full load test
  verification: {
    enabled: true,  // Set to false to skip pre-test checks
    
    // Authentication verification
    authenticator: {
      enabled: true,  // Test authentication
      endpoint: '/api/login',  // Auth endpoint (e.g., /api/token, /api/user/me, etc.)
      method: 'POST',  // HTTP method for auth test
      expectedStatus: 200,
      timeout: 10000,  // Timeout for auth test (ms)
    },
    
    // Health check verification
    healthCheck: {
      enabled: false,  // Test server health
      endpoint: '/api/ping',  // Health check endpoint (null to skip) (e.g., /api/health, /api/status, etc.)
      method: 'GET',
      expectedStatus: 200,
      timeout: 10000,  // Timeout for health check (ms)
    },
  },


  // Configurations for API endpoints to test (imported from endpoints.js)
  endpoints: endpoints,


  // Test scenarios with different VU ramps
  scenarios: {
    smoke: {
      name: 'Smoke Test',
      description: 'Quick sanity check with minimal load',
      stages: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 5 },
        { duration: '30s', target: 0 },
      ],
      thinkTime: { min: 1, max: 3 },
    },
    load: {
      name: 'Load Test',
      description: 'Normal to moderately high load',
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 0 },
      ],
      thinkTime: { min: 1, max: 5 },
    },
    stress: {
      name: 'Stress Test',
      description: 'Push system to its limits',
      stages: [
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 500 },
        { duration: '5m', target: 500 },
        { duration: '2m', target: 1000 },
        { duration: '5m', target: 1000 },
        { duration: '2m', target: 0 },
      ],
      thinkTime: { min: 0.5, max: 2 },
    },
    spike: {
      name: 'Spike Test',
      description: 'Sudden traffic spike',
      stages: [
        { duration: '2m', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '10s', target: 1000 },
        { duration: '3m', target: 1000 },
        { duration: '10s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '1m', target: 0 },
      ],
      thinkTime: { min: 0.5, max: 2 },
    },
    soak: {
      name: 'Soak Test',
      description: 'Extended load to detect leaks',
      stages: [
        { duration: '2m', target: 50 },
        { duration: '30m', target: 50 },
        { duration: '5m', target: 0 },
      ],
      thinkTime: { min: 2, max: 8 },
    },
  },

  // User profiles to simulate with different usage patterns
  // Distribution weights must sum to 1.0
  userProfiles: {
    enabled: true,
    profiles: {
      normal: {
        name: 'Normal User',
        description: 'Regular user behavior',
        weight: 0.7, // 70% of users
        thinkTime: { min: 1, max: 5 },
        requestsPerSession: { min: 5, max: 15 },
      },
      power: {
        name: 'Power User',
        description: 'Active user with frequent requests',
        weight: 0.2, // 20% of users
        thinkTime: { min: 0.5, max: 2 },
        requestsPerSession: { min: 15, max: 40 },
      },
      heavy: {
        name: 'Heavy User',
        description: 'Very active user with continuous requests',
        weight: 0.1, // 10% of users
        thinkTime: { min: 0, max: 1 },
        requestsPerSession: { min: 40, max: 100 },
      },
    },
  },

  // Performance thresholds
  thresholds: {
    'http_req_duration': ['p(95)<3000', 'p(99)<10000'],  // 95% under 3s, 99% under 10s
    'http_req_failed': ['rate<0.05'],                    // error rate below 5%
    'http_req_duration{staticAsset:no}': ['p(99)<2500'], // non-static requests
  },

  // Reporting options
  reporting: {
    verbose: true,
    includeHeaders: false,
    includeBodies: false,
    groupMetricsByEndpoint: true,
  },

  // CLI options
  cli: {
    scenarioName: __ENV.SCENARIO || 'load', // Override scenario
    verbose: __ENV.VERBOSE === 'true',
  },

  // k6 runtime options
  options: {
    noConnectionReuse: false,
    insecureSkipTLSVerify: false,  // Set to true if testing with self-signed certs
    userAgent: 'K6-Performance-Test/1.0',
    extendedTimeout: 300000,  // Timeout in ms when --no-timeout flag is used (default: 5 minutes)
  },

  // Tags for organizing test results
  tags: {
    testType: 'stressly',
    environment: 'staging',
  },
};

export default config;
