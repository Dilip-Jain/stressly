// Format and display test results/summary

import { formatDuration, formatPercentage } from './utils.js';

/**
 * Format a number with commas for readability
 */
function formatNumber(num) {
  if (num === undefined || num === null) return 'N/A';
  
  const value = Number(num);
  if (isNaN(value) || !isFinite(value)) return 'N/A';
  
  return value.toFixed(2).replace(/\.00$/, '');
}

/**
 * Format percentage
 */
function formatPercent(value) {
  if (value === undefined || value === null) return 'N/A';
  
  const num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num) || !isFinite(num)) return 'N/A';
  
  return `${(num * 100).toFixed(2)}%`;
}

/**
 * Create a horizontal line for tables
 */
function createLine(char = '─', length = 64) {
  return char.repeat(length);
}

/**
 * Pad string to specific length
 */
function padString(str, length, align = 'left') {
  const s = String(str);
  if (s.length >= length) return s.substring(0, length);
  const padding = ' '.repeat(length - s.length);
  return align === 'right' ? padding + s : s + padding;
}

export class TestReporter {
  constructor(metricsTracker, testConfig) {
    this.metricsTracker = metricsTracker;
    this.testConfig = testConfig;
  }

  // Generate and print test summary
  printSummary() {
    const summary = this.metricsTracker.getSummary();

    console.log('\n' + '='.repeat(80));
    console.log('                    K6 PERFORMANCE TEST SUMMARY');
    console.log('='.repeat(80));

    // Print header info
    console.log(`\nTest Type: ${this.testConfig.testName}`);
    console.log(`Scenario: ${this.testConfig.scenarioName}`);
    console.log(`Base URL: ${this.testConfig.baseUrl}`);

    // Print per-endpoint metrics
    console.log('\n' + '-'.repeat(80));
    console.log('PER-ENDPOINT METRICS');
    console.log('-'.repeat(80));

    this.printEndpointTable(summary);

    // Print aggregate metrics
    console.log('\n' + '-'.repeat(80));
    console.log('AGGREGATE METRICS');
    console.log('-'.repeat(80));

    this.printAggregateMetrics(summary);

    // Print error analysis
    const errors = this.collectErrors(summary);
    if (errors.length > 0) {
      console.log('\n' + '-'.repeat(80));
      console.log('ERROR ANALYSIS');
      console.log('-'.repeat(80));
      this.printErrorAnalysis(errors);
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }

  // Print per-endpoint table
  printEndpointTable(summary) {
    const header = [
      'Endpoint'.padEnd(20),
      'Requests'.padEnd(10),
      'Success'.padEnd(10),
      'Errors'.padEnd(10),
      'Timeouts'.padEnd(10),
      'Avg (ms)'.padEnd(10),
      'P95 (ms)'.padEnd(10),
      'Max (ms)'.padEnd(10),
      'Success Rate'.padEnd(15),
    ].join('');

    console.log('\n┌─────────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬───────────────┐');
    console.log('│ ' + header + ' │');
    console.log('├─────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼───────────────┤');

    for (const [name, data] of Object.entries(summary)) {
      const p95 = data.p95Duration || data.maxDuration || 0;
      const errorDisplay = data.errors > 0 ? `${data.errors}` : '0';
      const row = [
        padString(name.substring(0, 19), 20),
        padString(String(data.requests), 10, 'right'),
        padString(String(data.success), 10, 'right'),
        padString(errorDisplay, 10, 'right'),
        padString(String(data.timeouts), 10, 'right'),
        padString(formatNumber(data.avgDuration), 10, 'right'),
        padString(formatNumber(p95), 10, 'right'),
        padString(formatNumber(data.maxDuration), 10, 'right'),
        padString(String(data.successRate), 15, 'right'),
      ].join('│ ');

      console.log('│ ' + row + ' │');
    }

    console.log('└─────────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴───────────────┘');
  }

  // Print aggregate metrics
  printAggregateMetrics(summary) {
    const totals = this.calculateTotals(summary);

    console.log(`\nTotal Requests:        ${totals.totalRequests}`);
    console.log(`Total Success:         ${totals.totalSuccess}`);
    console.log(`Total Errors:          ${totals.totalErrors}`);
    console.log(`Total Timeouts:        ${totals.totalTimeouts}`);
    console.log(`Overall Success Rate:  ${totals.overallSuccessRate}`);
    console.log(`Average Response Time: ${formatDuration(totals.avgDuration)}`);
    console.log(`Min Response Time:     ${formatDuration(totals.minDuration)}`);
    console.log(`Max Response Time:     ${formatDuration(totals.maxDuration)}`);
    console.log(`\nHTTP Status Codes:`);

    for (const [statusCode, count] of Object.entries(totals.statusCodes)) {
      const percentage = ((count / totals.totalRequests) * 100).toFixed(2);
      console.log(`  ${statusCode}: ${count} (${percentage}%)`);
    }
  }

  // Print error analysis
  printErrorAnalysis(errors) {
    const errorsByType = {};
    const errorsByEndpoint = {};

    for (const error of errors) {
      const type = error.type;
      const endpoint = error.endpoint;

      if (!errorsByType[type]) errorsByType[type] = [];
      if (!errorsByEndpoint[endpoint]) errorsByEndpoint[endpoint] = [];

      errorsByType[type].push(error);
      errorsByEndpoint[endpoint].push(error);
    }

    console.log('\nErrors by Type:');
    for (const [type, errors] of Object.entries(errorsByType)) {
      console.log(`  ${type}: ${errors.length} occurrences`);
    }

    console.log('\nErrors by Endpoint:');
    for (const [endpoint, errors] of Object.entries(errorsByEndpoint)) {
      console.log(`  ${endpoint}: ${errors.length} errors`);
    }

    // Show sample errors
    console.log('\nSample Errors (max 5):');
    const sampleErrors = errors.slice(0, 5);
    for (let i = 0; i < sampleErrors.length; i++) {
      const error = sampleErrors[i];
      console.log(`  ${i + 1}. [${error.endpoint}] ${error.type}: ${error.message}`);
    }
  }

  // Calculate totals from summary
  calculateTotals(summary) {
    let totalRequests = 0;
    let totalSuccess = 0;
    let totalErrors = 0;
    let totalTimeouts = 0;
    let totalDuration = 0;
    let minDuration = Infinity;
    let maxDuration = 0;
    const statusCodes = {};

    for (const data of Object.values(summary)) {
      totalRequests += data.requests;
      totalSuccess += data.success;
      totalErrors += data.errors;
      totalTimeouts += data.timeouts;
      totalDuration += data.avgDuration * data.requests;
      minDuration = Math.min(minDuration, data.minDuration);
      maxDuration = Math.max(maxDuration, data.maxDuration);

      for (const [code, count] of Object.entries(data.statusCodes)) {
        statusCodes[code] = (statusCodes[code] || 0) + count;
      }
    }

    const overallSuccessRate = totalRequests > 0
      ? ((totalSuccess / totalRequests) * 100).toFixed(2) + '%'
      : '0%';

    const avgDuration = totalRequests > 0 ? totalDuration / totalRequests : 0;

    return {
      totalRequests,
      totalSuccess,
      totalErrors,
      totalTimeouts,
      avgDuration: Math.round(avgDuration),
      minDuration: minDuration === Infinity ? 0 : minDuration,
      maxDuration,
      overallSuccessRate,
      statusCodes,
    };
  }

  // Collect all errors from metrics
  collectErrors(summary) {
    const errors = [];
    const metricsData = this.metricsTracker.getMetrics();

    for (const [name, data] of Object.entries(metricsData)) {
      for (const error of data.errors) {
        errors.push({
          endpoint: name,
          type: error.type,
          message: error.message,
          timestamp: error.timestamp,
        });
      }
    }

    return errors;
  }

  // Analyze performance degradation
  analyzePerformanceDegradation(summary) {
    const analysis = {
      degradationDetected: false,
      degradationPoint: null,
      recommendation: '',
    };

    let totalRequests = 0;
    let totalErrors = 0;
    let maxP95 = 0;

    for (const data of Object.values(summary)) {
      totalRequests += data.requests;
      totalErrors += data.errors;
      const p95 = data.p95Duration || data.maxDuration || 0;
      maxP95 = Math.max(maxP95, p95);
    }

    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) : 0;

    if (errorRate > 0.05) {
      analysis.degradationDetected = true;
      analysis.recommendation = `System showed degradation with ${(errorRate * 100).toFixed(2)}% error rate. Consider reviewing error logs and endpoint configurations.`;
    } else if (maxP95 > 15000) {
      analysis.degradationDetected = true;
      analysis.recommendation = `High response times detected (P95: ${maxP95.toFixed(0)}ms). API performance degrading under load. Consider optimization.`;
    }

    return analysis;
  }

  // Analyze failures with categorization
  analyzeFailures(summary, errors) {
    const analysis = {
      hasFailures: false,
      problematicEndpoints: [],
      mostFailedEndpoint: null,
      slowestEndpoint: null,
      recommendations: [],
    };

    if (errors.length === 0) {
      return analysis;
    }

    analysis.hasFailures = true;

    // Group errors by endpoint
    const endpointFailures = {};
    for (const error of errors) {
      if (!endpointFailures[error.endpoint]) {
        endpointFailures[error.endpoint] = {
          name: error.endpoint,
          errorCount: 0,
          errorRate: 0,
          timeoutCount: 0,
          types: {},
        };
      }
      endpointFailures[error.endpoint].errorCount++;
      endpointFailures[error.endpoint].types[error.type] = (endpointFailures[error.endpoint].types[error.type] || 0) + 1;
    }

    // Match with summary data to get error rates
    for (const [endpoint, failureData] of Object.entries(endpointFailures)) {
      const summaryData = summary[endpoint];
      if (summaryData) {
        failureData.errorRate = summaryData.requests > 0 ? (failureData.errorCount / summaryData.requests) * 100 : 0;
        failureData.timeoutCount = summaryData.timeouts || 0;
      }
      analysis.problematicEndpoints.push(failureData);
    }

    // Sort by error count
    analysis.problematicEndpoints.sort((a, b) => b.errorCount - a.errorCount);

    // Set most failed endpoint
    if (analysis.problematicEndpoints.length > 0) {
      analysis.mostFailedEndpoint = analysis.problematicEndpoints[0];
      const ep = analysis.mostFailedEndpoint;
      let failureType = 'errors';
      
      if (ep.types['timeout'] && ep.types['timeout'] > ep.errorCount * 0.5) {
        failureType = 'timeouts';
      } else if (ep.types['server_error']) {
        failureType = 'server_errors';
      } else if (ep.types['client_error']) {
        failureType = 'client_errors';
      }

      let recommendation = `❌ Endpoint '${ep.name}' had the most failures (${ep.errorCount} errors, ${ep.errorRate.toFixed(2)}% error rate).`;
      
      if (failureType === 'timeouts' && ep.timeoutCount > 0) {
        recommendation += ` Most failures were timeouts (${ep.timeoutCount}). Consider increasing timeout or optimizing performance.`;
      } else if (failureType === 'server_errors') {
        recommendation += ` Server errors detected. Check application and server logs.`;
      } else if (failureType === 'client_errors') {
        recommendation += ` Client errors detected. Verify request parameters and authentication.`;
      }

      analysis.recommendations.push(recommendation);
    }

    // Check for slow endpoints
    let maxP95 = 0;
    let slowestEndpoint = null;
    for (const [name, data] of Object.entries(summary)) {
      const p95 = data.p95Duration || data.maxDuration || 0;
      if (p95 > maxP95) {
        maxP95 = p95;
        slowestEndpoint = name;
      }
    }

    if (slowestEndpoint && maxP95 > 10000) {
      analysis.slowestEndpoint = { name: slowestEndpoint, p95: maxP95 };
      analysis.recommendations.push(`⚠️  Endpoint '${slowestEndpoint}' has high P95 response time (${maxP95.toFixed(0)}ms). Consider optimization.`);
    }

    return analysis;
  }

  // Generate detailed report as JSON
  generateJsonReport() {
    const summary = this.metricsTracker.getSummary();
    const totals = this.calculateTotals(summary);
    const errors = this.collectErrors(summary);
    const performanceAnalysis = this.analyzePerformanceDegradation(summary);
    const failureAnalysis = this.analyzeFailures(summary, errors);

    return {
      testInfo: {
        name: this.testConfig.testName,
        scenario: this.testConfig.scenarioName,
        baseUrl: this.testConfig.baseUrl,
        timestamp: new Date().toISOString(),
      },
      configuration: {
        authEnabled: !!this.testConfig.authToken || !!this.testConfig.username,
        authType: this.testConfig.authToken ? 'bearer' : (this.testConfig.username ? 'basic' : 'none'),
      },
      summary: {
        totalRequests: totals.totalRequests,
        totalSuccess: totals.totalSuccess,
        totalErrors: totals.totalErrors,
        totalTimeouts: totals.totalTimeouts,
        errorRate: ((totals.totalErrors / totals.totalRequests) * 100).toFixed(2) + '%' || '0%',
        successRate: totals.overallSuccessRate,
      },
      responseTime: {
        average: totals.avgDuration,
        min: totals.minDuration,
        max: totals.maxDuration,
      },
      endpoints: summary,
      performanceAnalysis,
      failureAnalysis,
      errors: errors.slice(0, 100), // Limit to 100 errors
      statusCodes: totals.statusCodes,
    };
  }

  // Export report to file
  exportReport(filePath, format = 'json') {
    if (format === 'json') {
      const report = this.generateJsonReport();
      const jsonContent = JSON.stringify(report, null, 2);
      return jsonContent;
    }
  }

  // Print comprehensive console summary
  printConsoleSummary() {
    const summary = this.metricsTracker.getSummary();
    const totals = this.calculateTotals(summary);
    const errors = this.collectErrors(summary);
    const performanceAnalysis = this.analyzePerformanceDegradation(summary);
    const failureAnalysis = this.analyzeFailures(summary, errors);

    console.log('\n' + '╔'.padEnd(82, '═') + '╗');
    console.log('║' + ' K6 API PERFORMANCE TEST RESULTS'.padEnd(81) + '║');
    console.log('╚'.padEnd(82, '═') + '╝\n');

    // Test overview
    console.log('TEST OVERVIEW');
    console.log(createLine('─', 80));
    console.log(`Test Type:           ${this.testConfig.testName}`);
    console.log(`Scenario:            ${this.testConfig.scenarioName}`);
    console.log(`Base URL:            ${this.testConfig.baseUrl}`);
    console.log(`Timestamp:           ${new Date().toISOString()}\n`);

    // Summary statistics
    console.log('SUMMARY STATISTICS');
    console.log(createLine('─', 80));
    console.log(`Total Requests:      ${formatNumber(totals.totalRequests)}`);
    console.log(`Successful:          ${formatNumber(totals.totalSuccess)}`);
    console.log(`Failed:              ${formatNumber(totals.totalErrors)}`);
    console.log(`Timeouts:            ${formatNumber(totals.totalTimeouts)}`);
    console.log(`Success Rate:        ${totals.overallSuccessRate}`);
    console.log(`Error Rate:          ${formatPercent(totals.totalErrors / totals.totalRequests)}\n`);

    // Response time statistics
    console.log('RESPONSE TIME STATISTICS');
    console.log(createLine('─', 80));
    console.log(`Average:             ${formatDuration(totals.avgDuration)}`);
    console.log(`Minimum:             ${formatDuration(totals.minDuration)}`);
    console.log(`Maximum:             ${formatDuration(totals.maxDuration)}\n`);

    // HTTP Status Codes
    console.log('HTTP STATUS CODES');
    console.log(createLine('─', 80));
    for (const [statusCode, count] of Object.entries(totals.statusCodes)) {
      const percentage = ((count / totals.totalRequests) * 100).toFixed(2);
      console.log(`  ${statusCode}: ${count} (${percentage}%)`);
    }
    console.log('');

    // Per-endpoint metrics
    console.log('PER-ENDPOINT PERFORMANCE');
    console.log(createLine('─', 80));
    this.printEndpointTable(summary);
    console.log('');

    // Failure analysis if errors exist
    if (failureAnalysis.hasFailures && failureAnalysis.problematicEndpoints.length > 0) {
      console.log('FAILURE ANALYSIS');
      console.log(createLine('─', 80));
      for (const ep of failureAnalysis.problematicEndpoints) {
        console.log(`  ${ep.name}: ${ep.errorCount} errors (${ep.errorRate.toFixed(2)}%)`);
      }
      console.log('');
    }

    // Recommendations
    if (failureAnalysis.recommendations.length > 0 || performanceAnalysis.degradationDetected) {
      console.log('RECOMMENDATIONS');
      console.log(createLine('─', 80));
      for (const rec of failureAnalysis.recommendations) {
        console.log(`  ${rec}`);
      }
      if (performanceAnalysis.degradationDetected) {
        console.log(`  ${performanceAnalysis.recommendation}`);
      }
      console.log('');
    }

    console.log(createLine('═', 80) + '\n');
  }
}

/**
 * Extract per-endpoint metrics from K6 metrics data
 */
function extractEndpointMetrics(data) {
  const endpointMetrics = {};
  const metricsData = data.metrics || {};

  // Process all metrics and group by endpoint
  for (const [metricName, metricObj] of Object.entries(metricsData)) {
    // Parse metric names like: ep_endpoint_name_response_time, ep_endpoint_name_errors, etc.
    const epMatch = metricName.match(/^ep_(.+?)_(response_time|errors|success|timeouts|status_\d{3})$/);
    
    if (epMatch) {
      const endpointNameNormalized = epMatch[1].replace(/_/g, ' ');
      const metricType = epMatch[2];
      
      // Initialize endpoint entry if not exists
      if (!endpointMetrics[endpointNameNormalized]) {
        endpointMetrics[endpointNameNormalized] = {
          name: endpointNameNormalized,
          requests: 0,
          success: 0,
          errors: 0,
          timeouts: 0,
          responseTimes: [],
          statusCodes: {},
          errorRate: '0%',
          successRate: '0%',
          avgResponseTime: 0,
          minResponseTime: 0,
          maxResponseTime: 0,
          p95ResponseTime: 0,
          p99ResponseTime: 0,
        };
      }

      const metric = endpointMetrics[endpointNameNormalized];

      // Extract data based on metric type
      if (metricType === 'response_time' && metricObj.values) {
        const values = Object.values(metricObj.values || {});
        metric.responseTimes = values;
        metric.requests = values.length;
        if (values.length > 0) {
          metric.avgResponseTime = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
          metric.minResponseTime = Math.round(Math.min(...values));
          metric.maxResponseTime = Math.round(Math.max(...values));
          
          // Calculate percentiles
          const sorted = values.sort((a, b) => a - b);
          const p95Index = Math.floor(sorted.length * 0.95);
          const p99Index = Math.floor(sorted.length * 0.99);
          metric.p95ResponseTime = Math.round(sorted[p95Index] || 0);
          metric.p99ResponseTime = Math.round(sorted[p99Index] || 0);
        }
      } else if (metricType === 'errors' && metricObj.value !== undefined) {
        metric.errors = Math.round(metricObj.value || 0);
      } else if (metricType === 'success' && metricObj.value !== undefined) {
        metric.success = Math.round(metricObj.value || 0);
      } else if (metricType === 'timeouts' && metricObj.value !== undefined) {
        metric.timeouts = Math.round(metricObj.value || 0);
      }
    }

    // Extract status codes (e.g., ep_endpoint_name_status_200)
    const statusMatch = metricName.match(/^ep_(.+?)_status_(\d{3})$/);
    if (statusMatch) {
      const endpointNameNormalized = statusMatch[1].replace(/_/g, ' ');
      const statusCode = statusMatch[2];
      
      if (!endpointMetrics[endpointNameNormalized]) {
        endpointMetrics[endpointNameNormalized] = {
          name: endpointNameNormalized,
          requests: 0,
          success: 0,
          errors: 0,
          timeouts: 0,
          responseTimes: [],
          statusCodes: {},
          errorRate: '0%',
          successRate: '0%',
          avgResponseTime: 0,
          minResponseTime: 0,
          maxResponseTime: 0,
          p95ResponseTime: 0,
          p99ResponseTime: 0,
        };
      }

      const metric = endpointMetrics[endpointNameNormalized];
      metric.statusCodes[statusCode] = Math.round(metricObj.value || 0);
    }
  }

  // Calculate derived metrics
  for (const [, metric] of Object.entries(endpointMetrics)) {
    if (metric.requests > 0) {
      metric.successRate = ((metric.success / metric.requests) * 100).toFixed(2) + '%';
      metric.errorRate = ((metric.errors / metric.requests) * 100).toFixed(2) + '%';
    }
  }

  return endpointMetrics;
}

/**
 * Format per-endpoint metrics as a table for console output
 */
function formatEndpointTable(endpointMetrics) {
  const header = [
    '┌─ ENDPOINT',
    '─ REQUESTS',
    '─ SUCCESS',
    '─ ERRORS',
    '─ TIMEOUTS',
    '─ AVG (ms)',
    '─ P95 (ms)',
    '─ P99 (ms)',
    '─ SUCCESS %',
  ].join('');
  
  let output = '\n' + header + ' ─┐\n';
  
  for (const [, metric] of Object.entries(endpointMetrics)) {
    const endpoint = padString(metric.name.substring(0, 25), 28);
    const requests = padString(String(metric.requests), 10, 'right');
    const success = padString(String(metric.success), 10, 'right');
    const errors = padString(String(metric.errors), 10, 'right');
    const timeouts = padString(String(metric.timeouts), 10, 'right');
    const avg = padString(formatNumber(metric.avgResponseTime), 10, 'right');
    const p95 = padString(formatNumber(metric.p95ResponseTime), 10, 'right');
    const p99 = padString(formatNumber(metric.p99ResponseTime), 10, 'right');
    const successRate = padString(metric.successRate, 11, 'right');
    
    output += `│ ${endpoint}│${requests}│${success}│${errors}│${timeouts}│${avg}│${p95}│${p99}│${successRate}│\n`;
  }
  
  output += '└────────────────────────────┴──────────┴─────────┴────────┴──────────┴──────────┴──────────┴──────────┴──────────────┘\n';
  return output;
}

/**
 * Main handleSummary function - k6 entry point for test results
 * This function is automatically called by k6 after test completion
 */
export function handleSummary(data) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + new Date().toISOString().split('T')[1].replace(/[:.]/g, '-').slice(0, -5);
    const fileName = `results/test-report-${timestamp}.json`;
    
    // Extract per-endpoint metrics
    const endpointMetrics = extractEndpointMetrics(data);
    
    // Calculate aggregate totals
    let totalRequests = 0;
    let totalSuccess = 0;
    let totalErrors = 0;
    let totalTimeouts = 0;
    let totalResponseTime = 0;
    const allResponseTimes = [];
    const statusCodeTotals = {};

    for (const metric of Object.values(endpointMetrics)) {
      totalRequests += metric.requests;
      totalSuccess += metric.success;
      totalErrors += metric.errors;
      totalTimeouts += metric.timeouts;
      totalResponseTime += metric.avgResponseTime * metric.requests;
      allResponseTimes.push(...metric.responseTimes);
      
      // Aggregate status codes
      for (const [code, count] of Object.entries(metric.statusCodes)) {
        statusCodeTotals[code] = (statusCodeTotals[code] || 0) + count;
      }
    }

    // Calculate aggregate percentiles
    let p95Aggregate = 0;
    let p99Aggregate = 0;
    if (allResponseTimes.length > 0) {
      const sorted = allResponseTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(sorted.length * 0.95);
      const p99Index = Math.floor(sorted.length * 0.99);
      p95Aggregate = Math.round(sorted[p95Index] || 0);
      p99Aggregate = Math.round(sorted[p99Index] || 0);
    }

    const aggregateMetrics = {
      totalRequests,
      totalSuccess,
      totalErrors,
      totalTimeouts,
      successRate: totalRequests > 0 ? ((totalSuccess / totalRequests) * 100).toFixed(2) + '%' : '0%',
      errorRate: totalRequests > 0 ? ((totalErrors / totalRequests) * 100).toFixed(2) + '%' : '0%',
      avgResponseTime: totalRequests > 0 ? Math.round(totalResponseTime / totalRequests) : 0,
      p95ResponseTime: p95Aggregate,
      p99ResponseTime: p99Aggregate,
      statusCodes: statusCodeTotals,
    };

    // Generate the comprehensive report JSON
    const report = {
      testInfo: {
        timestamp: new Date().toISOString(),
        executedAt: new Date().toLocaleString(),
      },
      aggregateMetrics,
      perEndpointMetrics: endpointMetrics,
      rawMetrics: data.metrics,
    };

    return {
      [fileName]: JSON.stringify(report, null, 2),
      'stdout': `\n✅ Test completed - Results saved to ${fileName}\n`,
    };
  } catch (error) {
    console.error('Error in handleSummary:', error.message);
    return {
      'stdout': `\n❌ Error in handleSummary: ${error.message}\n`,
    };
  }
}
