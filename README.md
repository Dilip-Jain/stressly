# Stressly - K6 API Performance Testing Framework

A comprehensive, production-ready API performance testing framework using k6 with support for multiple test types, configurable endpoints, user profiles, authentication, and detailed reporting.

## 🎯 Features

✅ **Multiple Test Types** - Smoke, Load, Stress, Spike, and Soak tests with pre-configured scenarios
✅ **Configurable Endpoints** - Define endpoints with path parameters, methods, weights, and timeouts
✅ **Weighted Endpoint Selection** - Higher weight endpoints selected more frequently
✅ **User Profiles** - Simulate Normal, Power, and Heavy user behaviors
✅ **Authentication Support** - Bearer tokens, Basic auth, API keys
✅ **Pre-test Verification** - Health checks and auth validation before tests run
✅ **Per-Endpoint Metrics** - Detailed tracking of response times, success/error rates, timeouts
✅ **Comprehensive Error Logging** - Distinguish timeouts, auth failures, server errors
✅ **Performance Thresholds** - Built-in checks for response times and error rates
✅ **CLI Flexibility** - Override configuration via command line
✅ **Detailed Reporting** - Formatted test summaries with per-endpoint analysis

## 📁 Project Structure

```
stressly/
├── config.js              # Central configuration (base URL, auth, scenarios)
├── test.js                # Main k6 test runner
├── utils.js               # Helper functions (HTTP, auth, metrics)
├── endpoints.js           # API endpoint definitions
├── reporter.js            # Test result formatting and reporting
├── config.env.example     # Environment variables template
├── run-test.bat           # Windows test runner script
├── run-test.sh            # Unix/Linux/macOS test runner script
├── GUIDE.md               # This detailed guide
└── README.md              # Quick reference
```

## 🚀 Quick Start

### 1. Install k6

```bash
# macOS
brew install k6

# Windows (Chocolatey)
choco install k6

# Linux (Ubuntu/Debian)
sudo apt-get install k6

# Or download from: https://k6.io/docs/getting-started/installation/
```

### 2. Setup Configuration

```bash
# Copy example configuration
cp config.env.example config.env

# Edit with your settings
# - Update BASE_URL
# - Configure AUTH_TYPE and credentials
# - Choose test SCENARIO
```

### 3. Run a Test

**Windows:**
```bash
run-test.bat --scenario smoke
```

**Unix/Linux/macOS:**
```bash
chmod +x run-test.sh
./run-test.sh --scenario smoke
```

**Direct k6:**
```bash
k6 run -e SCENARIO=smoke test.js
```

## 📊 Test Scenarios

### Smoke Test
```bash
run-test.bat --scenario smoke
```
- **Duration**: ~2 minutes
- **Users**: 5 peak
- **Purpose**: Quick sanity check after deployment
- **Use when**: Before longer tests, post-deployment validation

### Load Test
```bash
run-test.bat --scenario load
```
- **Duration**: ~16 minutes
- **Users**: 200 peak (gradual increase)
- **Purpose**: Normal operating conditions
- **Use when**: Regular performance testing, baseline establishment

### Stress Test
```bash
run-test.bat --scenario stress
```
- **Duration**: ~22 minutes
- **Users**: 1000 peak (progressive)
- **Purpose**: Find system breaking point
- **Use when**: Identify capacity limits, stress testing

### Spike Test
```bash
run-test.bat --scenario spike
```
- **Duration**: ~8 minutes
- **Users**: 1000 sudden spike
- **Purpose**: Test recovery from traffic surges
- **Use when**: Load balancer validation, surge handling

### Soak Test
```bash
run-test.bat --scenario soak
```
- **Duration**: ~37 minutes
- **Users**: 50 sustained
- **Purpose**: Detect memory leaks, long-running issues
- **Use when**: Stability validation, resource leak detection

## ⚙️ Configuration Guide

### Environment Variables (config.env)

```bash
# API Configuration
BASE_URL=http://localhost:3000
API_TIMEOUT=30000

# Authentication (choose one type)
AUTH_TYPE=bearer              # Options: none, bearer, basic, apikey
AUTH_BEARER=your_token_here

# Basic Auth (if AUTH_TYPE=basic)
AUTH_USERNAME=admin
AUTH_PASSWORD=password

# API Key Auth (if AUTH_TYPE=apikey)
API_KEY_HEADER=X-API-Key
API_KEY=sk_1234567890

# Test Options
SCENARIO=load                 # Options: smoke, load, stress, spike, soak
VERBOSE=true
```

### Add Custom Endpoints

Edit `endpoints.js`:

```javascript
{
  name: 'Create Order',
  path: '/api/orders',
  method: 'POST',
  weight: 10,                 // Frequency: 10 out of total weight
  expectedStatus: 201,        // Expected HTTP status
  timeout: 8000,              // Request timeout in ms
  params: {},                 // Query parameters
  body: {                      // Request body for POST/PUT
    userId: 1,
    items: [{ productId: 1, quantity: 1 }],
  },
  tags: {                      // k6 tags for metrics
    endpoint: 'orders',
    operation: 'create',
  },
}
```

**Weight calculation**:
- Total weight = sum of all endpoint weights
- Selection = endpoint.weight / totalWeight
- Example: weight 20 out of total 100 = 20% selection rate

## Understanding Results

```
✓ Good Performance:
  - Success Rate > 95%
  - Avg Duration < 200ms
  - p(95) < 1000ms
  - No timeouts

⚠ Acceptable:
  - Success Rate 90-95%
  - Avg Duration 200-500ms
  - p(95) 1000-2000ms
  - Few timeouts

✗ Poor Performance:
  - Success Rate < 90%
  - Avg Duration > 500ms
  - p(95) > 2000ms
  - Regular timeouts
```


### Customize User Profiles

In `config.js`:

```javascript
userProfiles: {
  normal: {
    name: 'Normal User',
    weight: 0.7,              // 70% of users
    thinkTime: { min: 1, max: 5 },
    requestsPerSession: { min: 5, max: 15 },
  },
  power: {
    name: 'Power User',
    weight: 0.2,              // 20% of users
    thinkTime: { min: 0.5, max: 2 },
    requestsPerSession: { min: 15, max: 40 },
  },
  heavy: {
    name: 'Heavy User',
    weight: 0.1,              // 10% of users
    thinkTime: { min: 0, max: 1 },
    requestsPerSession: { min: 40, max: 100 },
  },
}
```

### Create Custom Scenarios

In `config.js`:

```javascript
scenarios: {
  myCustom: {
    name: 'My Custom Test',
    description: 'Testing specific behavior',
    stages: [
      { duration: '1m', target: 50 },      // Ramp to 50 users
      { duration: '10m', target: 50 },     // Stay for 10 minutes
      { duration: '1m', target: 0 },       // Ramp down
    ],
    thinkTime: { min: 2, max: 5 },
  }
}
```

Run it:
```bash
run-test.bat --scenario myCustom
```

### Adjust Performance Thresholds

In `config.js`:

```javascript
thresholds: {
  // Response time percentiles
  'http_req_duration': ['p(95)<1000', 'p(99)<2000'],
  
  // Error rate threshold
  'http_req_failed': ['rate<0.05'],
  
  // Non-static assets only
  'http_req_duration{staticAsset:no}': ['p(99)<2500'],
}
```

If threshold is exceeded, k6 will exit with error status.

## 🔐 Authentication

### Bearer Token (JWT, OAuth)
```bash
AUTH_TYPE=bearer
AUTH_BEARER=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Basic Authentication
```bash
AUTH_TYPE=basic
AUTH_USERNAME=admin
AUTH_PASSWORD=secretpassword
```

### API Key
```bash
AUTH_TYPE=apikey
API_KEY_HEADER=X-API-Key
API_KEY=sk_prod_1234567890abcdef
```

### No Authentication
```bash
AUTH_TYPE=none
```

## 🎮 CLI Usage

### Windows Script
```bash
run-test.bat [options]

Options:
  --scenario SCENARIO    Test scenario name (smoke, load, stress, spike, soak)
  --url URL              API base URL override
  --vus VUS              Virtual users override
  --help                 Show help message
  --list-scenarios       List all scenarios
```

Examples:
```bash
# Run against staging with custom URL
run-test.bat --scenario load --url http://staging.api.com

# Override number of users
run-test.bat --scenario spike --vus 500

# Help
run-test.bat --help
```

### Unix/Linux/macOS Script
```bash
./run-test.sh [options]

# Make executable first
chmod +x run-test.sh
```

Same options as Windows script.

### Direct k6 Command
```bash
# Using environment variables
k6 run -e BASE_URL=http://api.test.com \
       -e SCENARIO=load \
       -e AUTH_TYPE=bearer \
       -e AUTH_BEARER=token123 \
       test.js

# With JSON output
k6 run -e SCENARIO=smoke --out json=results.json test.js

# With metrics filter
k6 run -e SCENARIO=load --summary-trend-stats=avg,p(95),p(99),max test.js

# With InfluxDB export
k6 run -o influxdb=http://localhost:8086/mydb test.js
```

## 📈 Understanding Results

### Test Output

```
================================================================================
                    K6 PERFORMANCE TEST SUMMARY
================================================================================

Test Type: Load Test
Scenario: load
Base URL: http://localhost:3000

--------------------------------------------------------------------------------
PER-ENDPOINT METRICS
--------------------------------------------------------------------------------

Endpoint              Requests  Success  Errors  Timeouts  Avg (ms)  Min (ms)  Max (ms)  Success Rate
List Users            250       245      5       0         185       45        892       98.00%
Get User              200       198      2       0         210       50        945       99.00%
Create User           100       95       5       0         450       120       1520      95.00%
List Products         150       150      0       0         95        20        450       100.00%

--------------------------------------------------------------------------------
AGGREGATE METRICS
--------------------------------------------------------------------------------

Total Requests:        700
Total Success:         688
Total Errors:          12
Total Timeouts:        0
Overall Success Rate:  98.29%
Average Response Time: 205ms
Min Response Time:     20ms
Max Response Time:     1520ms

HTTP Status Codes:
  200: 595 (85.00%)
  201: 80 (11.43%)
  400: 10 (1.43%)
  500: 15 (2.14%)

================================================================================
```

### Key Metrics

| Metric | Meaning | Good Value |
|--------|---------|-----------|
| Success Rate | % of requests that succeeded | > 95% |
| Avg Duration | Average response time | < 200ms |
| p(95) Duration | 95th percentile response time | < 1000ms |
| p(99) Duration | 99th percentile response time | < 2000ms |
| Error Rate | % of failed requests | < 5% |
| Timeout Count | Requests that timed out | 0 |
| Max Duration | Slowest request | varies by endpoint |

### Interpreting Results

**Great Performance:**
- Success Rate > 98%
- Avg Duration < 200ms
- p(95) < 1000ms
- No timeouts

**Acceptable Performance:**
- Success Rate 95-98%
- Avg Duration 200-500ms
- p(95) 1000-2000ms
- Few timeouts

**Poor Performance:**
- Success Rate < 95%
- Avg Duration > 500ms
- p(95) > 2000ms
- Regular timeouts

## 🐛 Troubleshooting

### Connection Refused
```
error: Post "http://localhost:3000/api/...": dial tcp 127.0.0.1:3000: connect: connection refused
```
**Fix**: Ensure API server is running. Check BASE_URL in config.env

### Authentication Failed
```
Error: Authentication failed: HTTP 401
```
**Fix**: Verify AUTH_TYPE and credentials. Test with curl first:
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/health
```

### High Error Rate
```
http_req_failed rate above 5%
```
**Fix**:
- Check if endpoints exist: `curl http://localhost:3000/api/users`
- Verify API method (GET vs POST)
- Check API logs for errors
- For expected errors, increase threshold

### Timeouts
```
warning: Timeout: Request timeout
```
**Fix**:
- Increase `API_TIMEOUT` in config.env
- Increase per-endpoint timeout in endpoints.js
- Check server resource usage
- Reduce virtual users (fewer concurrent requests)

### k6 Not Found
```
'k6' is not recognized as an internal or external command
```
**Fix**: Install k6 or add to PATH
```bash
# Install via Chocolatey (Windows)
choco install k6

# Or download: https://k6.io/docs/getting-started/installation/
```

### Out of Memory
```
fatal error: runtime: out of memory
```
**Fix**:
- Reduce virtual users
- Reduce test duration
- Run on machine with more RAM
- Check for memory leaks in API

## 🎯 Performance Tuning

### Establish Baseline
```bash
# 1. Run smoke test first
run-test.bat --scenario smoke

# 2. If OK, run load test
run-test.bat --scenario load

# 3. Record results for comparison
```

### Progressive Load Testing
```bash
# Start with 10 VUs
run-test.bat --scenario load --vus 10

# Then 50
run-test.bat --scenario load --vus 50

# Then 100
run-test.bat --scenario load --vus 100

# Find breaking point
```

### Optimize Endpoints
1. Review "Per-Endpoint Metrics" section
2. Find slowest endpoints
3. Either:
   - Reduce their weight (less frequent)
   - Optimize them on the backend
   - Increase timeout if acceptable

### User Profile Tuning
Match simulated profiles to real traffic:
```bash
# Analyze real traffic patterns
# Adjust weight distribution in config.js

# For mostly passive users:
normal: { weight: 0.9, ... }
power: { weight: 0.08, ... }
heavy: { weight: 0.02, ... }

# For active platform:
normal: { weight: 0.5, ... }
power: { weight: 0.3, ... }
heavy: { weight: 0.2, ... }
```

## 🔗 Integration Examples

### GitHub Actions CI/CD
```yaml
name: Performance Tests
on: [push]

jobs:
  perf-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Smoke Test
        run: |
          curl https://github.com/grafana/k6/releases/download/v0.45.0/k6-v0.45.0-linux-amd64.tar.gz | tar xz
          ./k6 run -e SCENARIO=smoke test.js
```

### Pre-Deployment Verification
```bash
#!/bin/bash
# pre-deploy.sh - Verify API performance before deployment

API_URL="http://staging.api.com"

echo "Running pre-deployment smoke test..."
k6 run -e BASE_URL=$API_URL -e SCENARIO=smoke test.js

if [ $? -eq 0 ]; then
    echo "✓ Test passed, proceeding with deployment"
    exit 0
else
    echo "✗ Test failed, halting deployment"
    exit 1
fi
```

### Data Export & Analysis
```bash
# Export to JSON for analysis
k6 run -e SCENARIO=load --out json=results.json test.js

# Convert to CSV for Excel
jq -r '.[] | @csv' results.json > results.csv

# Process with Python
python3 analyze_results.py results.json
```

## 📚 Resources

- [K6 Official Docs](https://k6.io/docs/)
- [K6 JavaScript API](https://k6.io/docs/javascript-api/)
- [Load Testing Best Practices](https://k6.io/docs/test-types/load-testing/)
- [HTTP Requests](https://k6.io/docs/javascript-api/k6-http/)
- [Thresholds Guide](https://k6.io/docs/using-k6/thresholds/)
- [Cloud Integration](https://k6.io/docs/cloud/)

## 💡 Tips & Tricks

### Export Results with Timestamp
```bash
k6 run --out json=results_$(date +%Y%m%d_%H%M%S).json test.js
```

### Run Multiple Scenarios in Sequence
```bash
#!/bin/bash
for scenario in smoke load stress; do
    echo "Running $scenario test..."
    k6 run -e SCENARIO=$scenario test.js
done
```

### Compare Two Test Runs
```bash
# Run test 1
k6 run --out json=baseline.json test.js

# Make changes

# Run test 2
k6 run --out json=after-changes.json test.js

# Compare with diff tools
```

### Monitor Real-Time Metrics
```bash
# Use k6 Cloud for real-time dashboard
k6 cloud test.js

# Or export to InfluxDB + Grafana for monitoring
k6 run -o influxdb=http://localhost:8086/mydb test.js
```

## ✅ Best Practices

1. **Test Regularly**: Include in CI/CD pipeline
2. **Progressive Testing**: Smoke → Load → Stress
3. **Document Baselines**: Record expected performance
4. **Match Real Traffic**: Adjust user profiles to reality
5. **Monitor Variables**: Test one change at a time
6. **Review Logs**: Analyze errors and failures
7. **Archive Results**: Keep historical data
8. **Threshold Tuning**: Set realistic SLAs

## 📝 License

MIT

---

**Questions or issues?** Check the Troubleshooting section or review k6 documentation.
