@echo off
REM K6 API Performance Testing Batch Script
REM Usage: run-test.bat [SCENARIO] [BASE_URL] [-e ENDPOINT] [--no-thresholds]
REM        run-test.bat help

setlocal enabledelayedexpansion

REM Show help if requested
if "%1"=="help" goto help
if "%1"=="--help" goto help
if "%1"=="/?" goto help

REM Parse arguments
set SCENARIO=
set ENDPOINT=
set OVERRIDE_BASE_URL=
set NO_THRESHOLDS=

REM Loop through all arguments
:parse_args
if "%~1"=="" goto args_done
if /i "%~1"=="--no-thresholds" (
    set NO_THRESHOLDS=1
    shift
    goto parse_args
) else if /i "%~1"=="-e" (
    set ENDPOINT=%~2
    shift
    shift
    goto parse_args
) else if "%SCENARIO%"=="" (
    set SCENARIO=%~1
) else if "%OVERRIDE_BASE_URL%"=="" (
    set OVERRIDE_BASE_URL=%~1
)
shift
goto parse_args

:args_done

REM Set default scenario if not provided
if "%SCENARIO%"=="" set SCENARIO=load

echo.
echo ================================================================
echo          K6 API Performance Testing Suite
echo ================================================================
echo.

REM ============================================================
REM Check Prerequisites
REM ============================================================

REM Check if K6 is installed
k6 version >nul 2>&1
if errorlevel 1 (
    echo ERROR: K6 is not installed or not in PATH
    echo.
    echo Please install K6 from: https://k6.io/docs/get-started/installation/
    echo   - Windows: choco install k6  OR  scoop install k6
    echo   - Or download from: https://github.com/grafana/k6/releases
    echo.
    pause
    exit /b 1
)

REM Check if test script exists
if not exist "test.js" (
    echo ERROR: Test script not found: test.js
    echo Please ensure test.js is in the current directory.
    echo.
    pause
    exit /b 1
)

REM Validate scenario type
set VALID_SCENARIO=0
if /i "%SCENARIO%"=="load" set VALID_SCENARIO=1
if /i "%SCENARIO%"=="stress" set VALID_SCENARIO=1
if /i "%SCENARIO%"=="spike" set VALID_SCENARIO=1
if /i "%SCENARIO%"=="smoke" set VALID_SCENARIO=1
if /i "%SCENARIO%"=="soak" set VALID_SCENARIO=1

if %VALID_SCENARIO%==0 (
    echo ERROR: Invalid scenario: %SCENARIO%
    echo Valid scenarios: load, stress, spike, smoke, soak
    echo.
    echo Run "run-test.bat help" for usage information.
    echo.
    pause
    exit /b 1
)

REM ============================================================
REM Load Configuration
REM ============================================================

echo [1/4] Loading configuration...

REM Set defaults
set "BASE_URL=http://localhost:3000"
set "AUTH_TYPE=none"
set "AUTH_BEARER="
set "API_TIMEOUT=30000"

REM Load from config.env if it exists
if exist "config.env" (
    echo       Loading from config.env...
    for /f "usebackq tokens=1,* delims==" %%a in ("config.env") do (
        set "line=%%a"
        REM Skip comments and empty lines
        if not "!line:~0,1!"=="#" if not "!line!"=="" (
            if "%%a"=="BASE_URL" set "BASE_URL=%%b"
            if "%%a"=="AUTH_TYPE" set "AUTH_TYPE=%%b"
            if "%%a"=="AUTH_BEARER" set "AUTH_BEARER=%%b"
            if "%%a"=="API_TIMEOUT" set "API_TIMEOUT=%%b"
        )
    )
) else (
    echo       WARNING: config.env not found, using defaults
)

REM Override with command line arguments if provided
if not "%OVERRIDE_BASE_URL%"=="" set "BASE_URL=%OVERRIDE_BASE_URL%"

echo       Configuration loaded successfully
echo.

REM ============================================================
REM Create Results Directory
REM ============================================================

echo [2/4] Preparing test environment...

if not exist "results" (
    mkdir results
    echo       Created results directory
) else (
    echo       Results directory exists
)

REM Generate timestamp for results
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do set "DATESTAMP=%%c-%%a-%%b"
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set "TIMESTAMP=%%a-%%b"
set "TIMESTAMP=%DATESTAMP%_%TIMESTAMP%"
set "TIMESTAMP=%TIMESTAMP: =0%"

echo       Test timestamp: %TIMESTAMP%
echo.

REM ============================================================
REM Display Test Configuration
REM ============================================================

echo [3/4] Test Configuration:
echo       Scenario: %SCENARIO%
echo       Base URL: %BASE_URL%
echo       Auth Type: %AUTH_TYPE%
if not "%AUTH_BEARER%"=="" (
    echo       Auth Bearer: ********
)
if not "%ENDPOINT%"=="" (
    echo       Endpoint: %ENDPOINT%
)
if "%NO_THRESHOLDS%"=="1" (
    echo       Thresholds: Disabled (--no-thresholds flag)
) else (
    echo       Thresholds: Enabled
)
echo.

REM ============================================================
REM Run K6 Test
REM ============================================================

echo [4/4] Running K6 %SCENARIO% test...
echo.
echo ================================================================
echo.

REM Build K6 command with environment variables
set "K6_CMD=k6 run"
set "K6_CMD=%K6_CMD% -e SCENARIO=%SCENARIO%"
if not "%ENDPOINT%"=="" set "K6_CMD=%K6_CMD% -e ENDPOINT=%ENDPOINT%"
if not "%BASE_URL%"=="" set "K6_CMD=%K6_CMD% -e BASE_URL=%BASE_URL%"
if not "%AUTH_TYPE%"=="" set "K6_CMD=%K6_CMD% -e AUTH_TYPE=%AUTH_TYPE%"
if not "%AUTH_BEARER%"=="" set "K6_CMD=%K6_CMD% -e AUTH_BEARER=%AUTH_BEARER%"
if not "%API_TIMEOUT%"=="" set "K6_CMD=%K6_CMD% -e API_TIMEOUT=%API_TIMEOUT%"
if "%NO_THRESHOLDS%"=="1" set "K6_CMD=%K6_CMD% --no-thresholds"
set "K6_CMD=%K6_CMD% test.js"

REM Execute K6
%K6_CMD%

set TEST_EXIT_CODE=%errorlevel%

echo.
echo ================================================================
echo.

REM ============================================================
REM Display Results
REM ============================================================

if %TEST_EXIT_CODE% equ 0 (
    echo SUCCESS: %SCENARIO% test completed successfully!
    echo All thresholds passed and no errors encountered.
) else (
    if %TEST_EXIT_CODE% equ 99 (
        if "%NO_THRESHOLDS%"=="1" (
            echo.
            echo WARNING: Test completed but thresholds were crossed (exit code 99)
            echo Status: TEST PASSED (with threshold warnings, ignored due to --no-thresholds flag)
        ) else (
            echo.
            echo ERROR: Performance thresholds were not met (exit code 99)
            echo.
            echo This means the test ran successfully but performance metrics
            echo did not meet the configured thresholds in config.js
            echo.
            echo You can:
            echo   1. Review results for detailed metrics
            echo   2. Adjust thresholds in config.js to match your API performance
            echo   3. Optimize your API to meet the current thresholds
            echo   4. Use --no-thresholds flag to disable threshold validation
            echo.
            echo Status: TEST FAILED - Performance requirements not met
        )
    ) else (
        if %TEST_EXIT_CODE% equ 1 (
            echo.
            echo ERROR: Test execution failed (exit code 1)
            echo.
            echo Common causes:
            echo   - Script syntax errors or runtime exceptions
            echo   - Invalid configuration in test.js or config.js
            echo   - Network connectivity issues preventing test execution
            echo.
            echo Check the error output above for specific details.
            echo Status: TEST FAILED
        ) else (
            if %TEST_EXIT_CODE% equ 107 (
                echo.
                echo ERROR: Script execution error (exit code 107)
                echo.
                echo This indicates a critical error in the test script:
                echo   - JavaScript runtime error
                echo   - Invalid function calls or undefined variables
                echo   - Module import/export issues
                echo.
                echo Review the error stack trace above for details.
                echo Status: TEST FAILED
            ) else (
                echo.
                echo ERROR: Test failed with unexpected exit code %TEST_EXIT_CODE%
                echo.
                echo Common k6 exit codes:
                echo   0   = Success
                echo   1   = Generic error
                echo   99  = Thresholds crossed
                echo   107 = Script execution error
                echo.
                echo Status: TEST FAILED
            )
        )
    )
)

echo.
echo Test completed at: %date% %time%
echo ================================================================
echo.
pause
exit /b %TEST_EXIT_CODE%

REM ============================================================
REM Help Section
REM ============================================================

:help
echo.
echo K6 API Performance Testing Suite - Stressly
echo ============================================
echo.
echo USAGE:
echo   run-test.bat [SCENARIO] [BASE_URL] [-e ENDPOINT] [FLAGS]
echo   run-test.bat help
echo.
echo SCENARIOS:
echo   smoke      - Quick sanity check with minimal load (5 VUs, ~2 min)
echo   load       - Normal to moderately high load (200 VUs, ~16 min)
echo   stress     - Push system to its limits (1000 VUs, ~22 min)
echo   spike      - Sudden traffic spike (1000 VUs spike, ~8 min)
echo   soak       - Extended load to detect leaks (50 VUs, ~37 min)
echo.
echo OPTIONS:
echo   BASE_URL              Override API base URL (from config.env by default)
echo   -e ENDPOINT           Test single endpoint (uses weighted distribution by default)
echo   --no-thresholds       Disable threshold validation (metrics still collected)
echo   help, --help, /?      Show this help message
echo.
echo EXAMPLES:
echo   run-test.bat smoke
echo   run-test.bat load https://api.example.com
echo   run-test.bat stress -e product
echo   run-test.bat load https://api.example.com -e user --no-thresholds
echo.
echo CONFIGURATION:
echo   Create a config.env file in this directory with:
echo     BASE_URL=https://jsonplaceholder.typicode.com
echo     AUTH_TYPE=none
echo     AUTH_BEARER=
echo     API_TIMEOUT=30000
echo.
echo   Command line arguments override config.env settings.
echo.
echo EXIT CODES:
echo   0   = Test passed, all thresholds met
echo   1   = Generic error or test execution failed
echo   99  = Test ran but performance thresholds not met
echo   107 = Script execution error (JS/module issues)
echo.
pause
exit /b 0

