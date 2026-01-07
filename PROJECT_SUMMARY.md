# Stressly K6 Framework - Project Summary

## Overview

Stressly is a **production-ready, enterprise-grade API performance testing framework** built on k6. It provides a complete solution for load, stress, spike, smoke, and soak testing with advanced features like configurable endpoints, user profiles, authentication support, and detailed reporting.

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────┐
│                    TEST.JS (Main Runner)                 │
│  - Setup/Teardown lifecycle                              │
│  - Scenario orchestration                                │
│  - Report generation                                     │
└─────────────────────────────────────────────────────────┘
           ↓         ↓          ↓         ↓
    ┌──────────┐ ┌────────┐ ┌────────┐ ┌──────────┐
    │ CONFIG.JS│ │UTILS.JS│ │REPORTER│ │ENDPOINTS │
    │          │ │        │ │.JS     │ │.JS       │
    │Scenarios,│ │HTTP,   │ │Report  │ │API Spec  │
    │Auth,     │ │Auth,   │ │Format  │ │ Weights  │
    │Profiles  │ │Metrics │ │        │ │          │
    └──────────┘ └────────┘ └────────┘ └──────────┘
```

### File Descriptions

| File | Purpose |
|------|---------|
| **test.js** | Main k6 script - orchestrates scenarios, runs VUs, generates reports |
| **config.js** | Central configuration - scenarios, auth, user profiles, thresholds |
| **endpoints.js** | API endpoint definitions with methods, weights, timeouts |
| **utils.js** | Utility functions - HTTP requests, auth, metrics tracking, error logging |
| **reporter.js** | Test result formatting - tables, aggregates, error analysis |
| **config.env** | Runtime configuration - API URL, auth credentials, test options |
| **run-test.bat** | Windows CLI script with argument parsing and help |
| **run-test.sh** | Unix/Linux/macOS CLI script with argument parsing and help |
| **setup.js** | Interactive setup helper for initial configuration |

## Key Features

### 1. Multiple Test Types

- **Smoke**: Quick validation (2 min, 5 VUs)
- **Load**: Normal to high load (16 min, 200 VUs)
- **Stress**: Push to breaking point (22 min, 1000 VUs)
- **Spike**: Sudden traffic surge (8 min, 1000 spike)
- **Soak**: Extended stability test (37 min, 50 VUs sustained)

### 2. Configurable Endpoints

Each endpoint has:
- HTTP method (GET, POST, PUT, DELETE)
- Path and query parameters
- Weight distribution (probability)
- Expected HTTP status
- Request timeout
- Request body template
- Custom tags for metrics

### 3. User Profiles

Simulate realistic user behaviors:
- **Normal** (70%): Regular users, 5-15 requests/session
- **Power** (20%): Active users, 15-40 requests/session
- **Heavy** (10%): Very active users, 40-100 requests/session

Each profile has configurable think times and request patterns.

### 4. Authentication Support

- **Bearer Token**: JWT, OAuth tokens
- **Basic Auth**: Username + password
- **API Key**: Custom header with key
- **None**: No authentication

### 5. Pre-Test Verification

Before main test execution:
- Health check endpoint validation
- Authentication verification
- Configuration summary
- Error handling and clear error messages

### 6. Metrics Tracking

Per-endpoint tracking:
- Request count
- Success count
- Error count
- Timeout count
- Response time (min, max, average)
- HTTP status distribution
- Detailed error logs

### 7. Comprehensive Reporting

- Per-endpoint metrics table
- Aggregate statistics
- HTTP status code distribution
- Error analysis and categorization
- Sample errors with types and messages
- Success rate calculations

### 8. Performance Thresholds

Built-in checks:
- 95th percentile response time < 1000ms
- 99th percentile response time < 2000ms
- Error rate < 5%

Configurable per test requirements.

## Workflow

### 1. Initial Setup

```bash
# Copy example config
cp config.env.example config.env

# Edit with your settings
# BASE_URL, AUTH_TYPE, AUTH credentials, SCENARIO

# Or use interactive setup
node setup.js
```

### 2. Run Test

```bash
# Via CLI script
run-test.bat --scenario smoke

# Or direct k6
k6 run -e SCENARIO=smoke test.js
```

### 3. Test Execution Flow

```
START
  ├── Setup Phase
  │   ├── Load config.env
  │   ├── Display configuration
  │   ├── Verify health
  │   └── Verify authentication
  │
  ├── Main Test Phase (by scenario ramp)
  │   ├── VU 1-5 created (smoke test)
  │   ├── Each VU:
  │   │   ├── Select user profile
  │   │   ├── Generate session requests
  │   │   └── For each request:
  │   │       ├── Select endpoint (by weight)
  │   │       ├── Build request with auth
  │   │       ├── Execute HTTP request
  │   │       ├── Validate response
  │   │       ├── Record metrics
  │   │       └── Think time sleep
  │   │
  │   └── Repeat per scenario stages
  │
  ├── Teardown Phase
  │   ├── Aggregate metrics
  │   ├── Format report
  │   ├── Display summary
  │   └── Export results (if configured)
  │
END
```

### 4. Interpret Results

Compare metrics against thresholds and SLAs:
- Success rate: target >95%
- Avg response: target <200ms
- p(95) response: target <1000ms
- Error rate: target <5%

## Configuration Examples

### Example 1: Test Against Staging

```bash
# config.env
BASE_URL=http://staging.api.mycompany.com
AUTH_TYPE=bearer
AUTH_BEARER=sk_staging_abc123xyz789
SCENARIO=load
```

Run:
```bash
run-test.bat --scenario load
```

### Example 2: Local Development

```bash
# config.env
BASE_URL=http://localhost:3000
AUTH_TYPE=none
SCENARIO=smoke
```

### Example 3: API Key Authentication

```bash
# config.env
BASE_URL=http://api.example.com
AUTH_TYPE=apikey
API_KEY_HEADER=Authorization
API_KEY=Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Example 4: Custom Scenario

In `config.js`:

```javascript
scenarios: {
  quickStress: {
    name: 'Quick Stress Test',
    stages: [
      { duration: '30s', target: 100 },
      { duration: '2m', target: 100 },
      { duration: '30s', target: 0 },
    ],
    thinkTime: { min: 0.5, max: 1.5 },
  }
}
```

Run:
```bash
run-test.bat --scenario quickStress
```

## Advanced Usage

### Export to JSON

```bash
k6 run --out json=results_$(date +%s).json test.js
```

### InfluxDB Integration

```bash
k6 run -o influxdb=http://localhost:8086/mydb test.js
```

### Cloud Testing

```bash
k6 cloud test.js
```

### Continuous Integration

```yaml
# GitHub Actions
- name: Performance Tests
  run: |
    k6 run -e SCENARIO=smoke test.js
```

### Shell Script Integration

```bash
#!/bin/bash
# Run all scenarios in sequence
for scenario in smoke load stress spike; do
    echo "Running $scenario..."
    k6 run -e SCENARIO=$scenario test.js
done
```

## Performance Tuning Guide

### Find Bottleneck
1. Run smoke test (baseline)
2. Run load test and review "Per-Endpoint Metrics"
3. Identify slowest endpoints

### Optimize
- Reduce weight of slow endpoints
- Increase timeout if expected
- Optimize backend endpoint
- Scale infrastructure

### Validate
- Re-run tests
- Compare before/after metrics
- Repeat for other slow endpoints

## Integration Patterns

### Pre-Deployment

```bash
#!/bin/bash
set -e

echo "Running pre-deployment smoke test..."
k6 run -e BASE_URL=http://staging.api.com -e SCENARIO=smoke test.js

echo "✓ Performance validation passed"
```

### Post-Deployment Monitoring

```bash
#!/bin/bash
# Run tests hourly to detect degradation
while true; do
    k6 run -e SCENARIO=smoke test.js >> perf.log
    sleep 3600
done
```

### Performance Regression Detection

```bash
#!/bin/bash
# Compare current performance vs baseline
k6 run --out json=current.json test.js

# Analyze and alert if threshold exceeded
python3 check_regression.py baseline.json current.json
```

## Extensibility

### Add New Endpoints

Edit `endpoints.js`:

```javascript
{
  name: 'My New Endpoint',
  path: '/api/new-endpoint',
  method: 'POST',
  weight: 15,
  expectedStatus: 201,
  timeout: 8000,
  body: { /* your payload */ },
  tags: { endpoint: 'custom', operation: 'create' },
}
```

### Create Custom Scenario

Edit `config.js`:

```javascript
scenarios: {
  myScenario: {
    name: 'My Custom Scenario',
    stages: [ /* your stages */ ],
    thinkTime: { min: 1, max: 3 },
  }
}
```

### Modify User Profiles

Edit `config.js` `userProfiles` to match your traffic patterns.

### Extend Reporter

Modify `reporter.js` to export custom formats (CSV, XML, custom HTML).

## Limitations & Constraints

- **Max VUs per run**: Limited by machine resources (~10,000)
- **Max test duration**: Practical limit is hours (RAM)
- **Distributed testing**: Use k6 Cloud for multi-region
- **Complex workflows**: Custom JavaScript in test.js
- **File uploads**: Limited k6 file API support

## Best Practices

1. **Test regularly** - Include in CI/CD
2. **Progressive testing** - Smoke → Load → Stress
3. **Document baseline** - Save reference performance
4. **Version config** - Track changes in git
5. **Isolate variables** - Test one change at a time
6. **Monitor trends** - Track performance over time
7. **Alert on regressions** - Set up automated checks
8. **Archive results** - Keep historical data

## Getting Started Checklist

- [ ] Install k6
- [ ] Clone/download Stressly
- [ ] Copy config.env.example to config.env
- [ ] Edit config.env with your API details
- [ ] Review endpoints.js for your API
- [ ] Run smoke test: `run-test.bat --scenario smoke`
- [ ] Review results
- [ ] Run load test: `run-test.bat --scenario load`
- [ ] Compare against baselines
- [ ] Integrate into CI/CD

## Troubleshooting Quick Links

| Problem | Solution |
|---------|----------|
| Connection refused | Check BASE_URL, ensure API running |
| Auth failed | Verify AUTH_TYPE and credentials |
| High errors | Check endpoints exist, review API logs |
| Timeouts | Increase API_TIMEOUT, reduce load |
| k6 not found | Install k6 from k6.io |

## Project Statistics

- **Lines of Code**: ~1000 (core framework)
- **Files**: 11
- **Supported Test Types**: 5
- **Auth Methods**: 4
- **Default Endpoints**: 10+
- **User Profiles**: 3
- **Configurability**: High (all scenarios/endpoints/profiles customizable)

## Future Enhancements

- GraphQL support
- gRPC support
- WebSocket support
- Custom metrics dashboard
- Multi-region testing
- Chaos engineering integrations
- Database performance testing
- Mobile app testing support

## Support & Resources

- **K6 Documentation**: https://k6.io/docs/
- **GitHub**: https://github.com/grafana/k6
- **Community**: https://community.k6.io/
- **Quick Ref**: See README_QUICK.md
- **Full Guide**: See GUIDE.md

---

**Stressly Version**: 1.0.0  
**K6 Required**: v0.40+  
**License**: MIT
