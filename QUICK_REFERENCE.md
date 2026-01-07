# Stressly Quick Reference Card

## Installation

```bash
# Install k6
brew install k6                    # macOS
choco install k6                   # Windows (Chocolatey)
sudo apt-get install k6            # Linux
# Or download: https://k6.io/docs/getting-started/installation/

# Setup Stressly
cp config.env.example config.env
# Edit config.env with your settings
```

## Configuration

```bash
# config.env
BASE_URL=http://localhost:3000          # Your API
AUTH_TYPE=bearer                        # bearer, basic, apikey, or none
AUTH_BEARER=your_token_here             # If using bearer
SCENARIO=load                           # smoke, load, stress, spike, soak
```

## Run Tests

### Windows
```batch
run-test.bat --scenario smoke           # Quick test
run-test.bat --scenario load            # Normal test
run-test.bat --scenario spike           # Spike test
run-test.bat --scenario soak            # Long test
run-test.bat --scenario load --url http://api.com  # Custom URL
run-test.bat --list-scenarios           # Show all
run-test.bat --help                     # Help
```

### Unix/Linux/macOS
```bash
./run-test.sh --scenario smoke          # Make executable first
chmod +x run-test.sh
./run-test.sh --scenario load
./run-test.sh --help
```

### Direct k6
```bash
k6 run test.js                          # Uses config.env
k6 run -e SCENARIO=smoke test.js        # Override scenario
k6 run -e BASE_URL=http://api.com -e SCENARIO=load test.js
k6 run --out json=results.json test.js  # Export to JSON
```

## Test Scenarios

| Name | Duration | Load | Purpose |
|------|----------|------|---------|
| smoke | ~2 min | 5 VUs | Quick check |
| load | ~16 min | 200 VUs | Normal testing |
| stress | ~22 min | 1000 VUs | Find limit |
| spike | ~8 min | 1000 spike | Surge handling |
| soak | ~37 min | 50 sustained | Long stability |

## File Overview

```
config.js          → Scenarios, auth, user profiles, thresholds
test.js            → Main test runner (don't edit usually)
endpoints.js       → Add/modify API endpoints to test
utils.js           → Helper functions (don't edit usually)
reporter.js        → Result formatting (don't edit usually)
config.env         → Your configuration (EDIT THIS)
run-test.bat       → Windows test runner
run-test.sh        → Unix/Linux/macOS test runner
setup.js           → Interactive setup helper
```

## Customize Endpoints

Edit `endpoints.js`:

```javascript
{
  name: 'My API Call',
  path: '/api/endpoint',
  method: 'POST',              // GET, POST, PUT, DELETE
  weight: 20,                  // Relative frequency (higher = more often)
  expectedStatus: 201,         // Expected HTTP status
  timeout: 5000,               // Request timeout in ms
  body: { key: 'value' },      // For POST/PUT
  tags: { endpoint: 'name' },  // For metrics grouping
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

## Authentication

### Bearer Token
```bash
AUTH_TYPE=bearer
AUTH_BEARER=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Basic Auth
```bash
AUTH_TYPE=basic
AUTH_USERNAME=admin
AUTH_PASSWORD=password
```

### API Key
```bash
AUTH_TYPE=apikey
API_KEY=sk_prod_1234567890
```

## Troubleshooting

### "Connection refused"
```bash
# Check API is running
curl http://localhost:3000/api/health
# Update BASE_URL in config.env
```

### "Authentication failed" (HTTP 401)
```bash
# Verify token/credentials
# Test with curl:
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/health
```

### High error rate (>5%)
```bash
# Check endpoints exist
curl http://localhost:3000/api/users
# Verify methods (GET vs POST)
# Check API logs
# Increase threshold if expected
```

### Timeouts
```bash
# Increase API_TIMEOUT in config.env
API_TIMEOUT=60000
# Or increase per-endpoint timeout in endpoints.js
timeout: 10000,
# Reduce virtual users
k6 run --vus 10 test.js
```

### k6: command not found
```bash
# Install k6: https://k6.io/docs/getting-started/installation/
# Or add to PATH
```

## Advanced Usage

### Export Results
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

### Filter Metrics
```bash
k6 run --summary-trend-stats=avg,p(95),p(99),max test.js
```

### Multiple Scenarios
```bash
#!/bin/bash
for scenario in smoke load stress; do
  k6 run -e SCENARIO=$scenario test.js
done
```

## Performance Tuning

1. **Baseline**: Run smoke test first
2. **Progressive**: smoke → load → stress
3. **Identify**: Find slow endpoints in results
4. **Optimize**: Reduce weight or fix backend
5. **Validate**: Re-run tests
6. **Compare**: Check improvement

## CLI Options

### Windows/Unix
```
--scenario SCENARIO    Test scenario
--url URL              API base URL override
--vus VUS              Virtual users override
--help                 Show help
--list-scenarios       List available scenarios
```

### k6 Native
```
-e VARIABLE=value      Set environment variable
--out json=FILE        Export to JSON
-o output              Set output (influxdb, cloud, etc)
--vus N                Number of virtual users
--duration TIME        Test duration (e.g., 10m, 1h)
```

## Resources

- **K6 Docs**: https://k6.io/docs/
- **API Reference**: https://k6.io/docs/javascript-api/
- **HTTP Module**: https://k6.io/docs/javascript-api/k6-http/
- **Best Practices**: https://k6.io/docs/test-types/load-testing/
- **Community**: https://community.k6.io/

## Documentation Files

- **README_QUICK.md** - Quick reference (this format)
- **GUIDE.md** - Comprehensive guide
- **PROJECT_SUMMARY.md** - Architecture and design

## Tips & Tricks

```bash
# Run with timestamp
k6 run --out json=results_$(date +%Y%m%d_%H%M%S).json test.js

# Monitor real-time
k6 run -o cloud test.js

# Quiet mode
k6 run --quiet test.js

# Profile mode (slower but detailed)
k6 run --profile test.js

# Setup/teardown only (validate config)
k6 run --stage setup test.js
```

## Performance Thresholds (Default)

```javascript
'http_req_duration': ['p(95)<1000', 'p(99)<2000']
'http_req_failed': ['rate<0.05']
```

These are configurable in `config.js`.

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Connection refused | API not running | Start API server |
| Auth failed | Wrong credentials | Check config.env |
| High errors | Bad endpoints | Verify endpoints.js |
| Slow responses | Overloaded | Reduce VUs |
| Out of memory | Too many VUs | Reduce concurrent users |

## Getting Help

1. Check troubleshooting above
2. Review GUIDE.md for detailed info
3. Check k6 docs at https://k6.io/docs/
4. Try: `run-test.bat --help`
5. Check API health: `curl http://localhost:3000/api/health`

---

**Quick Start**: Copy config.env.example → config.env → Edit → run-test.bat --scenario smoke

**Version**: 1.0.0 | **License**: MIT | **Requires**: k6 v0.40+
