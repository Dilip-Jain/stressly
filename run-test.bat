@echo off
REM K6 Performance Test Runner - Windows Batch Script

setlocal enabledelayedexpansion

REM Load environment variables from config.env if it exists
if exist "config.env" (
    echo Loading configuration from config.env...
    for /f "delims=" %%i in (config.env) do (
        if not "%%i"=="" if not "%%i:~0,1%%"=="#" (
            set "%%i"
        )
    )
) else (
    echo Note: config.env not found, using environment defaults
    echo Copy config.env.example to config.env and configure if needed
)

REM Parse command line arguments
set "SCENARIO=load"
set "BASE_URL=http://localhost:3000"
set "VUS=10"
set "DURATION=1m"
set "TEST_TYPE=test.js"

:parse_args
if "%1"=="" goto args_done

if "%1"=="--scenario" (
    set "SCENARIO=%2"
    shift
    shift
    goto parse_args
)

if "%1"=="--url" (
    set "BASE_URL=%2"
    shift
    shift
    goto parse_args
)

if "%1"=="--vus" (
    set "VUS=%2"
    shift
    shift
    goto parse_args
)

if "%1"=="--help" (
    call :show_help
    exit /b 0
)

if "%1"=="--list-scenarios" (
    call :list_scenarios
    exit /b 0
)

shift
goto parse_args

:args_done

echo.
echo ======================================
echo K6 Performance Test Runner
echo ======================================
echo.
echo Configuration:
echo   Scenario: %SCENARIO%
echo   Base URL: %BASE_URL%
echo   VUs: %VUS%
echo.

REM Verify k6 is installed
where k6 >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: k6 is not installed or not in PATH
    echo Please install k6 from https://k6.io/docs/getting-started/installation/
    exit /b 1
)

REM Run the test
echo Running %SCENARIO% test...
echo.

setlocal
set "BASE_URL=%BASE_URL%"
set "SCENARIO=%SCENARIO%"
set "VERBOSE=true"

k6 run --vus %VUS% test.js

endlocal
exit /b %ERRORLEVEL%

:show_help
echo.
echo Usage: run-test.bat [options]
echo.
echo Options:
echo   --scenario SCENARIO       Test scenario (smoke, load, stress, spike, soak)
echo   --url URL                 API base URL (default: http://localhost:3000)
echo   --vus VUS                 Virtual users override (default: from config)
echo   --help                    Show this help message
echo   --list-scenarios          List available scenarios
echo.
echo Examples:
echo   run-test.bat --scenario smoke
echo   run-test.bat --scenario load --url http://api.example.com
echo   run-test.bat --scenario spike --vus 100
echo.
exit /b 0

:list_scenarios
echo.
echo Available Scenarios:
echo.
echo   smoke  - Quick sanity check with minimal load (5 VUs, 2 min)
echo   load   - Normal to moderately high load (200 VUs, 16 min)
echo   stress - Push system to its limits (1000 VUs, 22 min)
echo   spike  - Sudden traffic spike (1000 VUs spike, 8 min)
echo   soak   - Extended load to detect leaks (50 VUs, 37 min)
echo.
exit /b 0
