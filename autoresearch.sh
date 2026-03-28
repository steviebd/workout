#!/bin/bash
set -euo pipefail

# Autoresearch benchmark for API Performance / Query Optimization
# Measures D1 query execution times directly via wrangler
# Uses more runs and median for stable measurements despite network noise

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

# Configuration - fewer runs for faster feedback
BENCHMARK_RUNS=20

# Test user credentials  
TEST_WORKOS_ID="user_01K9CFQ93YCA0D8AP85ASDQWKR"

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

# Run a D1 query and return execution time in ms
run_d1_query() {
    local query="$1"
    
    # Run the query and capture output
    local result=$(infisical run --env dev -- sh -c "
        CLOUDFLARE_API_TOKEN=\$CLOUDFLARE_API_TOKEN \
        CLOUDFLARE_ACCOUNT_ID=\$CLOUDFLARE_ACCOUNT_ID \
        wrangler d1 execute workout-dev-db --remote --command \"$query\" --config wrangler.toml 2>&1
    " 2>/dev/null)
    
    # Extract timing from result (sql_duration_ms)
    local timing=$(echo "$result" | grep -A1000 "^\[" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0].get('meta',{}).get('timings',{}).get('sql_duration_ms',0))" 2>/dev/null)
    
    if [ -z "$timing" ] || [ "$timing" = "None" ]; then
        echo ""
    else
        echo "$timing"
    fi
}

# Ensure wrangler.toml has correct remote database ID
ensure_wrangler_config() {
    if ! grep -q "database_id = \"7169db0c-21ed-4500-86a9-248110d7af2a\"" wrangler.toml 2>/dev/null; then
        log_info "Updating wrangler.toml with correct remote database ID..."
        infisical run --env dev -- sh -c 'REMOTE=true npx tsx scripts/generate-wrangler-config.ts --env dev' > /dev/null 2>&1
    fi
}

# Run benchmark on a query
benchmark_query() {
    local name="$1"
    local query="$2"
    
    log_info "Benchmarking: $name"
    
    # Warmup
    for i in 1 2 3; do
        run_d1_query "$query" > /dev/null
    done
    
    # Actual benchmark
    local timings=()
    local errors=0
    
    for i in $(seq 1 $BENCHMARK_RUNS); do
        local timing=$(run_d1_query "$query")
        if [ -n "$timing" ]; then
            timings+=($(echo "$timing * 1000" | bc))  # Convert to ms
        else
            errors=$((errors + 1))
        fi
    done
    
    if [ ${#timings[@]} -eq 0 ]; then
        log_error "All queries failed for $name"
        return 1
    fi
    
    # Calculate statistics
    local avg=$(echo "scale=2; $(printf '+%s' "${timings[@]}" | sed 's/^+//') / ${#timings[@]}" | bc)
    local sorted=($(printf '%s\n' "${timings[@]}" | sort -n))
    local count=${#timings[@]}
    
    # Calculate percentiles manually
    local p50_idx=$((count * 50 / 100))
    local p95_idx=$((count * 95 / 100))
    local p99_idx=$((count * 99 / 100))
    [ $p50_idx -ge $count ] && p50_idx=$((count - 1))
    [ $p95_idx -ge $count ] && p95_idx=$((count - 1))
    [ $p99_idx -ge $count ] && p99_idx=$((count - 1))
    
    local median=${sorted[$p50_idx]}
    local p95=${sorted[$p95_idx]}
    local p99=${sorted[$p99_idx]}
    local error_rate=$(echo "scale=4; $errors / ($BENCHMARK_RUNS)" | bc)
    
    log_info "  median: ${median}ms, p95: ${p95}ms, p99: ${p99}ms, avg: ${avg}ms"
    
    # Output metrics
    local safe_name=$(echo "$name" | tr ' /?' '_')
    echo "METRIC ${safe_name}_median=${median}"
    echo "METRIC ${safe_name}_p95=${p95}"
    echo "METRIC ${safe_name}_p99=${p99}"
    echo "METRIC ${safe_name}_avg=${avg}"
    echo "METRIC ${safe_name}_error_rate=${error_rate}"
}

# Main benchmark function
run_benchmark() {
    log_info "Starting D1 Query Performance Benchmark"
    log_info "========================================"
    log_info "Benchmark runs: $BENCHMARK_RUNS per query"
    
    # Ensure wrangler config is correct
    ensure_wrangler_config
    
    echo ""
    log_info "Running benchmarks..."
    echo ""
    
    # 1. List exercises (no search)
    benchmark_query "exercises_list" "SELECT * FROM exercises WHERE workos_id = '$TEST_WORKOS_ID' AND is_deleted = 0 ORDER BY created_at DESC LIMIT 50"
    
    # 2. Search exercises
    benchmark_query "exercises_search" "SELECT * FROM exercises WHERE workos_id = '$TEST_WORKOS_ID' AND is_deleted = 0 AND name LIKE '%bench%' LIMIT 50"
    
    # 3. List workouts
    benchmark_query "workouts_list" "SELECT * FROM workouts WHERE workos_id = '$TEST_WORKOS_ID' AND is_deleted = 0 ORDER BY started_at DESC LIMIT 20"
    
    # 4. Volume calculation query (complex join)
    benchmark_query "volume_3m" "
        SELECT 
            date(started_at, 'weekday 0', '-6 days') as week_start,
            COALESCE(SUM(ws.weight * ws.reps), 0) as volume
        FROM workout_sets ws
        INNER JOIN workout_exercises we ON ws.workout_exercise_id = we.id
        INNER JOIN workouts w ON we.workout_id = w.id
        WHERE w.workos_id = '$TEST_WORKOS_ID'
            AND ws.is_complete = 1
            AND ws.weight > 0
            AND ws.reps > 0
            AND w.started_at >= datetime('now', '-3 months')
        GROUP BY date(w.started_at, 'weekday 0', '-6 days')
        ORDER BY week_start
    "
    
    echo ""
    log_info "Benchmark complete"
}

# Parse arguments
COMMAND="${1:-benchmark}"

if [ "$COMMAND" = "benchmark" ]; then
    run_benchmark
elif [ "$command" = "baseline" ]; then
    run_benchmark
    log_info "Baseline established"
else
    echo "Usage: $0 [benchmark|baseline]"
    exit 1
fi
