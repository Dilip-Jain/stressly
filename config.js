// Central configuration for k6 performance testing

export const config = {
  // Base API configuration
  api: {
    baseUrl: __ENV.BASE_URL || 'http://localhost:3000',
    timeout: parseInt(__ENV.API_TIMEOUT) || 30000, // ms
  },

  // Authentication configuration
  auth: {
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

  // User profiles with different behaviors
  userProfiles: {
    normal: {
      name: 'Normal User',
      description: 'Regular user behavior',
      weight: 0.7,
      thinkTime: { min: 1, max: 5 },
      requestsPerSession: { min: 5, max: 15 },
    },
    power: {
      name: 'Power User',
      description: 'Active user with frequent requests',
      weight: 0.2,
      thinkTime: { min: 0.5, max: 2 },
      requestsPerSession: { min: 15, max: 40 },
    },
    heavy: {
      name: 'Heavy User',
      description: 'Very active user with continuous requests',
      weight: 0.1,
      thinkTime: { min: 0, max: 1 },
      requestsPerSession: { min: 40, max: 100 },
    },
  },

  // Performance thresholds
  thresholds: {
    'http_req_duration': ['p(95)<1000', 'p(99)<2000'], // 95% under 1s, 99% under 2s
    'http_req_failed': ['rate<0.05'],                  // error rate below 5%
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
};

export default config;
