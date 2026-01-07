#!/bin/bash
# K6 Performance Test Runner - Unix/Linux/macOS Script

set -e

# Load environment variables from config.env if it exists
if [ -f "config.env" ]; then
    echo "Loading configuration from config.env..."
    set -a
    source ./config.env
    set +a
else
    echo "Note: config.env not found, using environment defaults"
    echo "Copy config.env.example to config.env and configure if needed"
fi

# Default values
SCENARIO="${SCENARIO:-load}"
BASE_URL="${BASE_URL:-http://localhost:3000}"
VERBOSE="${VERBOSE:-true}"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --scenario)
            SCENARIO="$2"
            shift 2
            ;;
        --url)
            BASE_URL="$2"
            shift 2
            ;;
        --vus)
            VUS_OVERRIDE="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        --list-scenarios)
            list_scenarios
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Show header
echo ""
echo "======================================"
echo "K6 Performance Test Runner"
echo "======================================"
echo ""
echo "Configuration:"
echo "  Scenario: $SCENARIO"
echo "  Base URL: $BASE_URL"
echo ""

# Verify k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "Error: k6 is not installed or not in PATH"
    echo "Please install k6 from https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Run the test
echo "Running $SCENARIO test..."
echo ""

export BASE_URL
export SCENARIO
export VERBOSE

if [ -n "$VUS_OVERRIDE" ]; then
    k6 run --vus "$VUS_OVERRIDE" test.js
else
    k6 run test.js
fi

# Capture exit code
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✓ Test completed successfully"
else
    echo ""
    echo "✗ Test failed with exit code $EXIT_CODE"
fi

exit $EXIT_CODE

show_help() {
    echo ""
    echo "Usage: ./run-test.sh [options]"
    echo ""
    echo "Options:"
    echo "  --scenario SCENARIO    Test scenario (smoke, load, stress, spike, soak)"
    echo "  --url URL              API base URL (default: http://localhost:3000)"
    echo "  --vus VUS              Virtual users override (default: from config)"
    echo "  --help                 Show this help message"
    echo "  --list-scenarios       List available scenarios"
    echo ""
    echo "Examples:"
    echo "  ./run-test.sh --scenario smoke"
    echo "  ./run-test.sh --scenario load --url http://api.example.com"
    echo "  ./run-test.sh --scenario spike --vus 100"
    echo ""
}

list_scenarios() {
    echo ""
    echo "Available Scenarios:"
    echo ""
    echo "  smoke  - Quick sanity check with minimal load (5 VUs, 2 min)"
    echo "  load   - Normal to moderately high load (200 VUs, 16 min)"
    echo "  stress - Push system to its limits (1000 VUs, 22 min)"
    echo "  spike  - Sudden traffic spike (1000 VUs spike, 8 min)"
    echo "  soak   - Extended load to detect leaks (50 VUs, 37 min)"
    echo ""
}
