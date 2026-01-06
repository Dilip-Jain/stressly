# K6 API Performance Testing Suite

A modular and configurable k6 testing framework for API performance testing including load, stress, spike, smoke, and soak tests.

## 📁 Project Structure

```
API profiler/
├── config.js       # Configuration file for endpoints, scenarios, and thresholds
├── test.js         # Main generic test runner
├── utils.js        # Utility functions for requests, validation, and metrics
└── README.md       # This file
```

## 🚀 Quick Start

### Prerequisites

Install k6 from [k6.io](https://k6.io/docs/getting-started/installation/)

### Running Tests

Run different test types using environment variables:

```bash
# Load Test (default)
k6 run test.js
k6 run -e TEST_TYPE=load test.js

# Stress Test
k6 run -e TEST_TYPE=stress test.js

# Spike Test
k6 run -e TEST_TYPE=spike test.js

# Smoke Test
k6 run -e TEST_TYPE=smoke test.js

# Soak Test (long duration)
k6 run -e TEST_TYPE=soak test.js
```

### Viewing Results

Generate HTML report:
```bash
k6 run --out json=results.json test.js
```

Stream results to cloud (requires k6 cloud account):
```bash
k6 run --out cloud test.js
```

## ⚙️ Configuration

### 1. Edit `config.js` to customize your tests:

#### Base URL
```javascript
baseUrl: 'https://your-api.com',
```

