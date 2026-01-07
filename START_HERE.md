# 🚀 Stressly - K6 Performance Testing Framework

Welcome to **Stressly**, a comprehensive, enterprise-grade API performance testing framework built on k6.

## 📖 Documentation Index

Start here based on your needs:

### 🏃 I Want to Get Started Quickly
→ See [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for commands and common tasks

### 📚 I Want Full Documentation
→ See [GUIDE.md](GUIDE.md) for comprehensive guide with examples

### 🏗️ I Want to Understand the Architecture
→ See [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) for design and architecture

### 📋 I Want a Quick Summary
→ See [README_QUICK.md](README_QUICK.md) for overview and quick links

## ⚡ 5-Minute Setup

```bash
# 1. Install k6
brew install k6                    # macOS
choco install k6                   # Windows
# or visit https://k6.io/docs/getting-started/installation/

# 2. Setup configuration
cp config.env.example config.env

# 3. Edit config with your API
# BASE_URL=http://your-api.com
# AUTH_TYPE=bearer
# AUTH_BEARER=your_token

# 4. Run test
run-test.bat --scenario smoke      # Windows
./run-test.sh --scenario smoke     # Unix/Linux

# 5. Review results
# Check the console output for metrics
```

## 📁 Project Files

### Core Framework
- **test.js** - Main k6 test runner
- **config.js** - Scenarios, authentication, user profiles
- **endpoints.js** - API endpoints to test
- **utils.js** - HTTP requests, auth, metrics tracking
- **reporter.js** - Test result formatting

### Configuration
- **config.env.example** - Configuration template
- **config.env** - Your configuration (copy from .example)

### Executables
- **run-test.bat** - Windows test runner with CLI
- **run-test.sh** - Unix/Linux/macOS test runner with CLI
- **setup.js** - Interactive setup helper

### Documentation
- **QUICK_REFERENCE.md** - Quick reference card
- **GUIDE.md** - Comprehensive documentation
- **PROJECT_SUMMARY.md** - Architecture overview
- **README_QUICK.md** - Quick summary
- **START_HERE.md** - This file

## 🎯 Test Scenarios

| Scenario | Duration | Load | Purpose |
|----------|----------|------|---------|
| **smoke** | 2 min | 5 users | Quick validation |
| **load** | 16 min | 200 users | Normal testing |
| **stress** | 22 min | 1000 users | Find limits |
| **spike** | 8 min | 1000 spike | Surge testing |
| **soak** | 37 min | 50 sustained | Long-running |

## ⚙️ Quick Commands

### Windows
```batch
run-test.bat --scenario smoke           # Smoke test
run-test.bat --scenario load            # Load test
run-test.bat --scenario spike           # Spike test
run-test.bat --list-scenarios           # Show all
run-test.bat --scenario load --url http://api.com  # Custom URL
```

### Unix/Linux/macOS
```bash
./run-test.sh --scenario smoke
./run-test.sh --scenario load
./run-test.sh --scenario spike
./run-test.sh --help
```

### Direct k6
```bash
k6 run test.js
k6 run -e SCENARIO=smoke test.js
k6 run --out json=results.json test.js
```

## 🔐 Authentication

```bash
# Bearer Token
AUTH_TYPE=bearer
AUTH_BEARER=your_token_here

# Basic Auth
AUTH_TYPE=basic
AUTH_USERNAME=admin
AUTH_PASSWORD=password

# API Key
AUTH_TYPE=apikey
API_KEY=sk_12345
```

## 📊 Understanding Results

Test output shows:

```
Per-Endpoint Metrics:
├── Endpoint name
├── Request count
├── Success/Error/Timeout counts
├── Response times (avg, min, max)
└── Success rate percentage

Aggregate Metrics:
├── Overall success rate
├── Average response time
├── HTTP status distribution
└── Error analysis
```

**Good Performance**: >95% success, <200ms avg, <1000ms p(95)

## ✏️ Customize

### Add API Endpoints
Edit `endpoints.js`:
```javascript
{
  name: 'Your Endpoint',
  path: '/api/your-endpoint',
  method: 'GET',
  weight: 20,
  expectedStatus: 200,
}
```

### Create Custom Scenario
Edit `config.js`:
```javascript
scenarios: {
  custom: {
    name: 'Custom Test',
    stages: [
      { duration: '1m', target: 50 },
      { duration: '5m', target: 50 },
      { duration: '1m', target: 0 },
    ],
  }
}
```

### Adjust User Profiles
Edit `config.js` `userProfiles` to match your traffic patterns.

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| Connection refused | Check API is running, verify BASE_URL |
| Auth failed | Check credentials in config.env |
| High errors | Verify endpoints exist in endpoints.js |
| Timeouts | Increase API_TIMEOUT in config.env |
| k6 not found | Install k6 from https://k6.io/ |

## 📚 Documentation

Each file has specific purposes:

```
START_HERE.md          ← You are here
│
├─→ QUICK_REFERENCE.md       (Quick commands, troubleshooting)
├─→ GUIDE.md                 (Full documentation with examples)
├─→ PROJECT_SUMMARY.md       (Architecture, design, patterns)
└─→ README_QUICK.md          (Quick overview)
```

## 🚀 Next Steps

1. **Install k6** if not already installed
2. **Copy config.env.example to config.env**
3. **Edit config.env** with your API URL and auth
4. **Run smoke test**: `run-test.bat --scenario smoke`
5. **Review results** and check metrics
6. **Customize endpoints.js** for your API
7. **Run load test**: `run-test.bat --scenario load`
8. **Establish baselines** for performance tracking

## 💡 Pro Tips

```bash
# Run with custom URL (override config.env)
run-test.bat --scenario load --url http://staging.api.com

# Export results to JSON for analysis
k6 run --out json=results.json test.js

# Run multiple scenarios
for scenario in smoke load stress; do
  run-test.bat --scenario $scenario
done

# Monitor in real-time with k6 Cloud
k6 cloud test.js
```

## 🤝 Support & Resources

- **K6 Official Docs**: https://k6.io/docs/
- **JavaScript API**: https://k6.io/docs/javascript-api/
- **Best Practices**: https://k6.io/docs/test-types/load-testing/
- **Community**: https://community.k6.io/

## ✅ Checklist

- [ ] k6 installed
- [ ] config.env created and configured
- [ ] Tested smoke scenario
- [ ] Reviewed results
- [ ] Customized endpoints.js for your API
- [ ] Created additional endpoints if needed
- [ ] Ran load test
- [ ] Documented baseline performance
- [ ] Integrated into CI/CD (optional)

## 📝 License

MIT - Feel free to use and modify for your needs

---

**Ready to start?** → See [QUICK_REFERENCE.md](QUICK_REFERENCE.md)

**Want details?** → See [GUIDE.md](GUIDE.md)

**Need help?** → Check the troubleshooting section or k6 docs
