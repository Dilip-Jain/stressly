// Helper functions for HTTP requests, auth, metrics tracking, and error logging

import http from 'k6/http';
import { check, group } from 'k6';
import encoding from 'k6/encoding';

// Track metrics per endpoint
export class MetricsTracker {
  constructor() {
    this.metrics = {};
  }

  recordRequest(endpoint, response, duration, tags = {}) {
    const name = endpoint.name;
    
    if (!this.metrics[name]) {
      this.metrics[name] = {
        totalRequests: 0,
        successCount: 0,
        errorCount: 0,
        timeoutCount: 0,
        statusCodes: {},
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        errors: [],
      };
    }

    const metric = this.metrics[name];
    metric.totalRequests++;
    metric.totalDuration += duration;
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);

    if (response.status === 0) {
      metric.timeoutCount++;
      metric.errorCount++;
      this.recordError(name, 'TIMEOUT', 'Request timeout');
    } else if (response.status >= 400) {
      metric.errorCount++;
      this.recordError(
        name,
        `HTTP_${response.status}`,
        `HTTP ${response.status} error`
      );
    } else {
      metric.successCount++;
    }

    metric.statusCodes[response.status] = (metric.statusCodes[response.status] || 0) + 1;
  }

  recordError(endpoint, errorType, message) {
    if (!this.metrics[endpoint]) return;
    this.metrics[endpoint].errors.push({
      type: errorType,
      message: message,
      timestamp: new Date().toISOString(),
    });
  }

  getMetrics() {
    return this.metrics;
  }

  getSummary() {
    const summary = {};
    for (const [name, data] of Object.entries(this.metrics)) {
      summary[name] = {
        requests: data.totalRequests,
        success: data.successCount,
        errors: data.errorCount,
        timeouts: data.timeoutCount,
        avgDuration: data.totalRequests > 0 ? Math.round(data.totalDuration / data.totalRequests) : 0,
        minDuration: data.minDuration === Infinity ? 0 : data.minDuration,
        maxDuration: data.maxDuration,
        successRate: data.totalRequests > 0 ? ((data.successCount / data.totalRequests) * 100).toFixed(2) + '%' : '0%',
        statusCodes: data.statusCodes,
        errorCount: data.errors.length,
      };
    }
    return summary;
  }
}

// Build authentication headers based on config
export function getAuthHeaders(authConfig) {
  const headers = {};

  if (!authConfig || authConfig.type === 'none') {
    return headers;
  }

  switch (authConfig.type) {
    case 'bearer':
      if (authConfig.bearer) {
        headers['Authorization'] = `Bearer ${authConfig.bearer}`;
      }
      break;

    case 'basic':
      if (authConfig.basic.username && authConfig.basic.password) {
        const credentials = `${authConfig.basic.username}:${authConfig.basic.password}`;
        const encoded = encoding.b64encode(credentials);
        headers['Authorization'] = `Basic ${encoded}`;
      }
      break;

    case 'apikey':
      if (authConfig.apiKey.value) {
        headers[authConfig.apiKey.headerName] = authConfig.apiKey.value;
      }
      break;
  }

  return headers;
}

// Make HTTP request with error handling
export function makeRequest(endpoint, baseUrl, authConfig, options = {}) {
  const url = baseUrl + endpoint.path;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(authConfig),
    ...options.headers,
  };

  const params = {
    headers,
    tags: {
      endpoint: endpoint.name,
      ...endpoint.tags,
    },
    timeout: `${endpoint.timeout}ms`,
  };

  let response;
  const startTime = Date.now();

  try {
    switch (endpoint.method) {
      case 'GET':
        response = http.get(url, params);
        break;

      case 'POST':
        response = http.post(
          url,
          endpoint.body ? JSON.stringify(endpoint.body) : null,
          params
        );
        break;

      case 'PUT':
        response = http.put(
          url,
          endpoint.body ? JSON.stringify(endpoint.body) : null,
          params
        );
        break;

      case 'DELETE':
        response = http.delete(url, params);
        break;

      default:
        throw new Error(`Unsupported HTTP method: ${endpoint.method}`);
    }
  } catch (error) {
    console.error(`Request failed for ${endpoint.name}: ${error.message}`);
    return null;
  }

  const duration = Date.now() - startTime;

  // Validate response
  const isSuccess = response.status === endpoint.expectedStatus ||
    (endpoint.expectedStatus >= 200 && endpoint.expectedStatus < 300 && 
     response.status >= 200 && response.status < 300);

  check(response, {
    [`${endpoint.name}: status is ${endpoint.expectedStatus}`]: (r) => r.status === endpoint.expectedStatus,
    [`${endpoint.name}: response time < ${endpoint.timeout}ms`]: (r) => r.timings.duration < endpoint.timeout,
  }, endpoint.tags);

  return {
    response,
    duration,
    isSuccess,
    statusCode: response.status,
  };
}

// Select endpoint based on weight distribution
export function selectEndpoint(endpoints) {
  const totalWeight = endpoints.reduce((sum, ep) => sum + ep.weight, 0);
  let random = Math.random() * totalWeight;

  for (const endpoint of endpoints) {
    random -= endpoint.weight;
    if (random <= 0) {
      return endpoint;
    }
  }

  return endpoints[0];
}

// Select user profile based on weight distribution
export function selectUserProfile(profiles) {
  const profileArray = Object.values(profiles);
  const totalWeight = profileArray.reduce((sum, p) => sum + p.weight, 0);
  let random = Math.random() * totalWeight;

  for (const profile of profileArray) {
    random -= profile.weight;
    if (random <= 0) {
      return profile;
    }
  }

  return profileArray[0];
}

// Get random think time within range
export function getThinkTime(profile) {
  const { min, max } = profile.thinkTime;
  return min + Math.random() * (max - min);
}

// Verify authentication before test starts
export function verifyAuth(baseUrl, authConfig) {
  console.log('Verifying authentication...');
  const headers = getAuthHeaders(authConfig);
  
  const response = http.get(`${baseUrl}/api/health`, { headers });
  
  if (response.status === 401 || response.status === 403) {
    throw new Error(`Authentication failed: HTTP ${response.status}`);
  }

  console.log('✓ Authentication verified');
  return true;
}

// Verify server health before test starts
export function verifyHealth(baseUrl) {
  console.log('Verifying server health...');
  const response = http.get(`${baseUrl}/api/health`);

  if (response.status !== 200) {
    throw new Error(`Server health check failed: HTTP ${response.status}`);
  }

  console.log('✓ Server is healthy');
  return true;
}

// Format duration in human-readable format
export function formatDuration(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Format percentage
export function formatPercentage(value) {
  return `${(value * 100).toFixed(2)}%`;
}

export default {
  MetricsTracker,
  getAuthHeaders,
  makeRequest,
  selectEndpoint,
  selectUserProfile,
  getThinkTime,
  verifyAuth,
  verifyHealth,
  formatDuration,
  formatPercentage,
};
