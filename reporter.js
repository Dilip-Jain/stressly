// Format and display test results/summary

import { formatDuration, formatPercentage } from './utils.js';

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
      'Endpoint'.padEnd(25),
      'Requests'.padEnd(10),
      'Success'.padEnd(10),
      'Errors'.padEnd(8),
      'Timeouts'.padEnd(10),
      'Avg (ms)'.padEnd(10),
      'Min (ms)'.padEnd(10),
      'Max (ms)'.padEnd(10),
      'Success Rate'.padEnd(15),
    ].join('');

    console.log(header);
    console.log('-'.repeat(header.length));

    for (const [name, data] of Object.entries(summary)) {
      const row = [
        name.substring(0, 24).padEnd(25),
        String(data.requests).padEnd(10),
        String(data.success).padEnd(10),
        String(data.errors).padEnd(8),
        String(data.timeouts).padEnd(10),
        String(data.avgDuration).padEnd(10),
        String(data.minDuration).padEnd(10),
        String(data.maxDuration).padEnd(10),
        String(data.successRate).padEnd(15),
      ].join('');

      console.log(row);
    }
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

  // Generate detailed report as JSON
  generateJsonReport() {
    const summary = this.metricsTracker.getSummary();
    const totals = this.calculateTotals(summary);
    const errors = this.collectErrors(summary);

    return {
      testInfo: {
        name: this.testConfig.testName,
        scenario: this.testConfig.scenarioName,
        baseUrl: this.testConfig.baseUrl,
        timestamp: new Date().toISOString(),
      },
      summary,
      totals,
      errors: errors.slice(0, 100), // Limit to 100 errors
    };
  }

  // Export report to file
  exportReport(filePath, format = 'json') {
    if (format === 'json') {
      const report = this.generateJsonReport();
      const jsonContent = JSON.stringify(report, null, 2);
      // Note: k6 doesn't have native file write capabilities
      // This is a placeholder for integration with external tools
      console.log(`Report would be saved to: ${filePath}`);
      return report;
    }
  }
}

export default TestReporter;
