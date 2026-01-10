#!/bin/bash
# K6 API Performance Testing Script
# Usage: ./run-test.sh [SCENARIO] [BASE_URL] [-e ENDPOINT] [--no-thresholds]
#        ./run-test.sh help

set -e

# Show help if requested
if [[ "$1" == "help" || "$1" == "--help" || "$1" == "-?" ]]; then
    show_help
    exit 0
fi

# Parse arguments
SCENARIO=""
ENDPOINT=""
OVERRIDE_BASE_URL=""
NO_THRESHOLDS=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --no-thresholds)
            NO_THRESHOLDS=1
            shift
            ;;
        -e)
            ENDPOINT="$2"
            shift 2
            ;;
        help|--help|-\?)
            show_help
            exit 0
            ;;
        *)
            if [[ -z "$SCENARIO" ]]; then
                SCENARIO="$1"
            elif [[ -z "$OVERRIDE_BASE_URL" ]]; then
                OVERRIDE_BASE_URL="$1"
            fi
            shift
            ;;
    esac
done

# Set default scenario if not provided
SCENARIO="${SCENARIO:-load}"

echo ""
echo "================================================================"
echo "          K6 API Performance Testing Suite"
echo "================================================================"
echo ""

# ============================================================
# Check Prerequisites
# ============================================================

# Check if K6 is installed
if ! command -v k6 &> /dev/null; then
    echo "ERROR: K6 is not installed or not in PATH"
    echo ""
    echo "Please install K6 from: https://k6.io/docs/get-started/installation/"
    echo "  - macOS: brew install k6"
    echo "  - Linux: sudo apt-get install k6 (or your package manager)"
    echo "  - Or download from: https://github.com/grafana/k6/releases"
    echo ""
    exit 1
fi

# Check if test script exists
if [[ ! -f "test.js" ]]; then
    echo "ERROR: Test script not found: test.js"
    echo "Please ensure test.js is in the current directory."
    echo ""
    exit 1
fi

# Validate scenario type
case "$SCENARIO" in
    load|stress|spike|smoke|soak)
        ;;
    *)
        echo "ERROR: Invalid scenario: $SCENARIO"
        echo "Valid scenarios: load, stress, spike, smoke, soak"
        echo ""
        echo "Run \"$0 help\" for usage information."
        echo ""
        exit 1
        ;;
esac

# ============================================================
# Load Configuration
# ============================================================

echo "[1/4] Loading configuration..."

# Set defaults
BASE_URL="http://localhost:3000"
AUTH_TYPE="none"
AUTH_BEARER=""
API_TIMEOUT="30000"

# Load from config.env if it exists
if [[ -f "config.env" ]]; then
    echo "       Loading from config.env..."
    set -a
    source ./config.env
    set +a
else
    echo "       WARNING: config.env not found, using defaults"
fi

# Override with command line arguments if provided
if [[ -n "$OVERRIDE_BASE_URL" ]]; then
    BASE_URL="$OVERRIDE_BASE_URL"
fi

echo "       Configuration loaded successfully"
echo ""

# ============================================================
# Create Results Directory
# ============================================================

echo "[2/4] Preparing test environment..."

if [[ ! -d "results" ]]; then
    mkdir -p results
    echo "       Created results directory"
else
    echo "       Results directory exists"
fi

# Generate timestamp for results
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
echo "       Test timestamp: $TIMESTAMP"
echo ""

# ============================================================
# Display Test Configuration
# ============================================================

echo "[3/4] Test Configuration:"
echo "       Scenario: $SCENARIO"
echo "       Base URL: $BASE_URL"
echo "       Auth Type: $AUTH_TYPE"
if [[ -n "$AUTH_BEARER" ]]; then
    echo "       Auth Bearer: ********"
fi
if [[ -n "$ENDPOINT" ]]; then
    echo "       Endpoint: $ENDPOINT"
fi
if [[ "$NO_THRESHOLDS" == "1" ]]; then
    echo "       Thresholds: Disabled (--no-thresholds flag)"
else
    echo "       Thresholds: Enabled"
fi
echo ""

# ============================================================
# Run K6 Test
# ============================================================

echo "[4/4] Running K6 $SCENARIO test..."
echo ""
echo "================================================================"
echo ""

# Build K6 command with environment variables
K6_CMD="k6 run"
K6_CMD="$K6_CMD -e SCENARIO=$SCENARIO"
if [[ -n "$ENDPOINT" ]]; then
    K6_CMD="$K6_CMD -e ENDPOINT=$ENDPOINT"
fi
if [[ -n "$BASE_URL" ]]; then
    K6_CMD="$K6_CMD -e BASE_URL=$BASE_URL"
fi
if [[ -n "$AUTH_TYPE" ]]; then
    K6_CMD="$K6_CMD -e AUTH_TYPE=$AUTH_TYPE"
fi
if [[ -n "$AUTH_BEARER" ]]; then
    K6_CMD="$K6_CMD -e AUTH_BEARER=$AUTH_BEARER"
fi
if [[ -n "$API_TIMEOUT" ]]; then
    K6_CMD="$K6_CMD -e API_TIMEOUT=$API_TIMEOUT"
fi
if [[ "$NO_THRESHOLDS" == "1" ]]; then
    K6_CMD="$K6_CMD --no-thresholds"
fi
K6_CMD="$K6_CMD test.js"

# Execute K6
eval "$K6_CMD"
TEST_EXIT_CODE=$?

echo ""
echo "================================================================"
echo ""

# ============================================================
# Display Results
# ============================================================

if [[ $TEST_EXIT_CODE -eq 0 ]]; then
    echo "SUCCESS: $SCENARIO test completed successfully!"
    echo "All thresholds passed and no errors encountered."
else
    if [[ $TEST_EXIT_CODE -eq 99 ]]; then
        if [[ "$NO_THRESHOLDS" == "1" ]]; then
            echo ""
            echo "WARNING: Test completed but thresholds were crossed (exit code 99)"
            echo "Status: TEST PASSED (with threshold warnings, ignored due to --no-thresholds flag)"
        else
            echo ""
            echo "ERROR: Performance thresholds were not met (exit code 99)"
            echo ""
            echo "This means the test ran successfully but performance metrics"
            echo "did not meet the configured thresholds in config.js"
            echo ""
            echo "You can:"
            echo "  1. Review results for detailed metrics"
            echo "  2. Adjust thresholds in config.js to match your API performance"
            echo "  3. Optimize your API to meet the current thresholds"
            echo "  4. Use --no-thresholds flag to disable threshold validation"
            echo ""
            echo "Status: TEST FAILED - Performance requirements not met"
        fi
    elif [[ $TEST_EXIT_CODE -eq 1 ]]; then
        echo ""
        echo "ERROR: Test execution failed (exit code 1)"
        echo ""
        echo "Common causes:"
        echo "  - Script syntax errors or runtime exceptions"
        echo "  - Invalid configuration in test.js or config.js"
        echo "  - Network connectivity issues preventing test execution"
        echo ""
        echo "Check the error output above for specific details."
        echo "Status: TEST FAILED"
    elif [[ $TEST_EXIT_CODE -eq 107 ]]; then
        echo ""
        echo "ERROR: Script execution error (exit code 107)"
        echo ""
        echo "This indicates a critical error in the test script:"
        echo "  - JavaScript runtime error"
        echo "  - Invalid function calls or undefined variables"
        echo "  - Module import/export issues"
        echo ""
        echo "Review the error stack trace above for details."
        echo "Status: TEST FAILED"
    else
        echo ""
        echo "ERROR: Test failed with unexpected exit code $TEST_EXIT_CODE"
        echo ""
        echo "Common k6 exit codes:"
        echo "  0   = Success"
        echo "  1   = Generic error"
        echo "  99  = Thresholds crossed"
        echo "  107 = Script execution error"
        echo ""
        echo "Status: TEST FAILED"
    fi
fi

echo ""
echo "Test completed at: $(date)"
echo "================================================================"
echo ""

exit $TEST_EXIT_CODE

# ============================================================
# Help Section
# ============================================================

show_help() {
    cat << 'EOF'

K6 API Performance Testing Suite - Stressly
============================================

USAGE:
  ./run-test.sh [SCENARIO] [BASE_URL] [-e ENDPOINT] [FLAGS]
  ./run-test.sh help

SCENARIOS:
  smoke      - Quick sanity check with minimal load (5 VUs, ~2 min)
  load       - Normal to moderately high load (200 VUs, ~16 min)
  stress     - Push system to its limits (1000 VUs, ~22 min)
  spike      - Sudden traffic spike (1000 VUs spike, ~8 min)
  soak       - Extended load to detect leaks (50 VUs, ~37 min)

OPTIONS:
  BASE_URL              Override API base URL (from config.env by default)
  -e ENDPOINT           Test single endpoint (uses weighted distribution by default)
  --no-thresholds       Disable threshold validation (metrics still collected)
  help, --help, -?      Show this help message

EXAMPLES:
  ./run-test.sh smoke
  ./run-test.sh load https://api.example.com
  ./run-test.sh stress -e product
  ./run-test.sh load https://api.example.com -e user --no-thresholds

CONFIGURATION:
  Create a config.env file in this directory with:
    BASE_URL=https://jsonplaceholder.typicode.com
    AUTH_TYPE=none
    AUTH_BEARER=
    API_TIMEOUT=30000

  Command line arguments override config.env settings.

EXIT CODES:
  0   = Test passed, all thresholds met
  1   = Generic error or test execution failed
  99  = Test ran but performance thresholds not met
  107 = Script execution error (JS/module issues)

EOF
}
