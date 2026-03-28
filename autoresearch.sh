#!/bin/bash
set -euo pipefail

# Autoresearch benchmark for API performance
# Measures p95/p99 latency of key API endpoints

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# Configuration
WORKER_PORT=8787
WORKER_URL="http://localhost:$WORKER_PORT"
WARMUP_REQUESTS=5
BENCHMARK_REQUESTS=50

# Test user credentials
TEST_WORKOS_ID="user_01K9CFQ93YCA0D8AP85ASDQWKR"
JWT_SECRET="6aFm7arZrbZ6fKtW3bOfgMCiea/8/C5cI93tBrZWmZc="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Generate JWT token for test user
generate_jwt() {
    local workos_id="$1"
    local secret="$2"
    
    # Create JWT header
    local header=$(echo -n '{"alg":"HS256","typ":"JWT"}' | base64 -w0 | tr '+/' '-_' | tr -d '=')
    
    # Create JWT payload with 4 day expiry
    local now=$(date +%s)
    local exp=$((now + 345600))  # 4 days
    local payload=$(echo -n "{\"sub\":\"$workos_id\",\"email\":\"stevio.wonder@gmail.com\",\"exp\":$exp,\"iat\":$now,\"iss\":\"fit-workout-app\",\"aud\":\"fit-workout-app\"}" | base64 -w0 | tr '+/' '-_' | tr -d '=')
    
    # Create signature (simplified HMAC)
    local message="${header}.${payload}"
    local signature=$(echo -n "$message" | openssl dgst -sha256 -hmac "$secret" -binary | base64 -w0 | tr '+/' '-_' | tr -d '=')
    
    echo "${header}.${payload}.${signature}"
}

# Check if worker is running
check_worker() {
    curl -s -o /dev/null -w "%{http_code}" "$WORKER_URL/health" 2>/dev/null | grep -q "200"
}

# Start the worker in background
start_worker() {
    log_info "Building and starting wrangler dev server..."
    
    # Kill any existing worker on port
    lsof -ti :$WORKER_PORT | xargs -r kill -9 2>/dev/null || true
    sleep 1
    
    # Generate wrangler.toml with remote D1
    infisical run --env dev -- npx tsx scripts/generate-wrangler-config.ts --env dev > /dev/null 2>&1
    
    # Build and start worker (REMOTE=true for real D1)
    cd "$PROJECT_ROOT"
    REMOTE=true bun run build > /dev/null 2>&1
    
    # Start worker in background, redirect output
    REMOTE=true bun run wrangler dev --port $WORKER_PORT > /tmp/wrangler-dev.log 2>&1 &
    WRANGLER_PID=$!
    
    log_info "Waiting for worker to start (PID: $WRANGLER_PID)..."
    
    # Wait for worker to be ready
    local max_attempts=30
    local attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if check_worker; then
            log_info "Worker is ready!"
            return 0
        fi
        sleep 2
        attempt=$((attempt + 1))
    done
    
    log_error "Worker failed to start after $max_attempts attempts"
    cat /tmp/wrangler-dev.log | tail -20
    return 1
}

# Stop the worker
stop_worker() {
    log_info "Stopping worker..."
    lsof -ti :$WORKER_PORT | xargs -r kill -9 2>/dev/null || true
    pkill -f "wrangler dev" 2>/dev/null || true
    sleep 1
}

# Make a single request and return latency in ms
make_request() {
    local method="$1"
    local path="$2"
    local token="$3"
    
    local start=$(date +%s%3N)
    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Cookie: session=$token" \
        "$WORKER_URL$path" 2>/dev/null)
    local end=$(date +%s%3N)
    local latency=$((end - start))
    
    # Return latency, or -1 if request failed
    if [ "$response" = "200" ] || [ "$response" = "401" ]; then
        echo $latency
    else
        echo "-1"
    fi
}

# Calculate percentile from array of values
calculate_percentile() {
    local percent="$1"
    shift
    local values=("$@")
    local count=${#values[@]}
    
    if [ $count -eq 0 ]; then
        echo "0"
        return
    fi
    
    # Sort values
    local sorted=($(printf '%s\n' "${values[@]}" | sort -n))
    
    # Calculate index
    local index=$(echo "($percent * $count - 1) / 100" | bc)
    index=${index%.*}  # floor
    
    echo "${sorted[$index]}"
}

# Run benchmark on a single endpoint
benchmark_endpoint() {
    local name="$1"
    local path="$2"
    local token="$3"
    local warmup="$4"
    local requests="$5"
    
    log_info "Benchmarking: $name"
    
    # Warmup
    for i in $(seq 1 $warmup); do
        make_request "GET" "$path" "$token" > /dev/null
    done
    
    # Actual benchmark
    local latencies=()
    local errors=0
    local total=0
    
    for i in $(seq 1 $requests); do
        local lat=$(make_request "GET" "$path" "$token")
        if [ "$lat" = "-1" ]; then
            errors=$((errors + 1))
        else
            latencies+=($lat)
        fi
        total=$((total + 1))
    done
    
    # Calculate statistics
    if [ ${#latencies[@]} -eq 0 ]; then
        log_error "All requests failed for $name"
        return 1
    fi
    
    local avg=$(echo "scale=2; $(printf '+%s' "${latencies[@]}" | sed 's/^+//') / ${#latencies[@]}" | bc)
    local p50=$(calculate_percentile 50 "${latencies[@]}")
    local p95=$(calculate_percentile 95 "${latencies[@]}")
    local p99=$(calculate_percentile 99 "${latencies[@]}")
    local max=$(printf '%s\n' "${latencies[@]}" | sort -n | tail -1)
    local error_rate=$(echo "scale=4; $errors / $total" | bc)
    
    log_info "  p50: ${p50}ms, p95: ${p95}ms, p99: ${p99}ms, avg: ${avg}ms"
    
    # Output metrics
    local safe_name=$(echo "$name" | tr ' /?' '_')
    echo "METRIC ${safe_name}_p95=${p95}"
    echo "METRIC ${safe_name}_p99=${p99}"
    echo "METRIC ${safe_name}_avg=${avg}"
    echo "METRIC ${safe_name}_error_rate=${error_rate}"
}

# Main benchmark function
run_benchmark() {
    log_info "Starting API Performance Benchmark"
    log_info "===================================="
    
    # Generate test JWT
    local token=$(generate_jwt "$TEST_WORKOS_ID" "$JWT_SECRET")
    log_info "Generated test JWT for user: $TEST_WORKOS_ID"
    
    # Test endpoints
    echo ""
    log_info "Running benchmarks (WARMUP=$WARMUP_REQUESTS, BENCHMARK=$BENCHMARK_REQUESTS)"
    echo ""
    
    # Exercise endpoints
    benchmark_endpoint "exercises_list" "/api/exercises" "$token" $WARMUP_REQUESTS $BENCHMARK_REQUESTS
    benchmark_endpoint "exercises_search" "/api/exercises?search=bench&muscleGroup=chest" "$token" $WARMUP_REQUESTS $BENCHMARK_REQUESTS
    
    # Workout endpoints
    benchmark_endpoint "workouts_list" "/api/workouts?limit=20" "$token" $WARMUP_REQUESTS $BENCHMARK_REQUESTS
    
    # Progress endpoints
    benchmark_endpoint "progress_volume_3m" "/api/progress/volume?dateRange=3m" "$token" $WARMUP_REQUESTS $BENCHMARK_REQUESTS
    
    # Overall aggregate
    echo ""
    log_info "Calculating aggregate metrics..."
}

# Trap to cleanup on exit
cleanup() {
    stop_worker
}

trap cleanup EXIT

# Parse arguments
COMMAND="${1:-benchmark}"

if [ "$COMMAND" = "start" ]; then
    start_worker
    echo "Worker running. Press Ctrl+C to stop."
    tail -f /tmp/wrangler-dev.log
elif [ "$COMMAND" = "benchmark" ]; then
    # Run benchmark cycle
    if ! check_worker 2>/dev/null; then
        start_worker
    else
        log_info "Using existing worker"
    fi
    
    run_benchmark
elif [ "$COMMAND" = "baseline" ]; then
    # Establish baseline
    if ! check_worker 2>/dev/null; then
        start_worker
    fi
    run_benchmark
    log_info "Baseline established"
else
    echo "Usage: $0 [start|benchmark|baseline]"
    exit 1
fi
