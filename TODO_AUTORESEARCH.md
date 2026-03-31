# Autoresearch Integration Ideas

> Based on [karpathy/autoresearch](https://github.com/karpathy/autoresearch) — an autonomous AI experiment loop that modifies code, runs against a fixed metric, keeps improvements, discards regressions, and loops forever.

## What is Autoresearch?

A self-directed AI research framework where an LLM agent autonomously runs experiments by:
1. Reading a `program.md` (the "research org code" — human-written instructions)
2. Modifying `train.py` (the experiment target)
3. Running the experiment with a fixed time budget (5 min)
4. Measuring a single metric (`val_bpb`)
5. Keeping improvements (advance git branch), discarding regressions (`git reset`)
6. Logging results to `results.tsv` (commit, metric, memory, status, description)
7. **Looping forever without human intervention**

The core pattern — *modify → measure → keep/discard → repeat* — is general-purpose and not limited to ML.

---

## Ideas for Fit Workout App

### 1. 🏋️ Auto-Optimize Program Progression Algorithms

- **What**: Iterate on weight progression logic (deload timing, percentage jumps, accessory volume)
- **Target code**: Program generators (e.g., 5/3/1 progression in template generation)
- **Metric**: User completion rate + estimated 1RM growth over simulated training blocks
- **Data source**: `userProgramCycles` (1RM tracking), `workoutSets` (completion data)
- **Impact**: Better progression = faster strength gains, fewer stalls/injuries

### 2. 📊 Auto-Tune Whoop-Informed Training Readiness

- **What**: Experiment with readiness scoring formulas — different weightings of HRV, sleep efficiency, recovery score, yesterday's strain
- **Target code**: Readiness scoring algorithm (new or existing)
- **Metric**: Predicted vs actual workout performance (total volume, RPE accuracy)
- **Data source**: `whoopRecoveries` (HRV, recovery score), `whoopSleeps` (sleep quality/duration), `whoopCycles` (strain), `workoutSets` (actual performance)
- **Impact**: Smarter auto-regulation — tell users when to push hard vs deload based on biometrics

### 3. 🎯 Auto-Optimize Volume & Intensity Recommendations

- **What**: Iterate on the algorithm that suggests sets/reps/weight per exercise
- **Target code**: Recommendation engine for next-workout suggestions
- **Metric**: Predicted vs actual completed reps, rate of progressive overload achieved
- **Data source**: `workoutSets` (weight × reps × RPE history), `workoutExercises`, `exercises`
- **Impact**: More accurate suggestions = less guesswork for users, better adherence

### 4. 🔔 Notification & Scheduling Optimization

- **What**: A/B test notification timing and messaging strategies
- **Target code**: Notification/scheduling logic
- **Metric**: Workout adherence (completion rate of `programCycleWorkouts`)
- **Data source**: `programCycleWorkouts` (scheduled vs completed), `userProgramCycles` (preferred gym days/time)
- **Impact**: Higher consistency = better results for users

### 5. 🧪 API Performance / Query Optimization Loop

- **What**: Point autoresearch at API route handlers and DB queries
- **Target code**: API routes, Drizzle queries, caching strategies
- **Metric**: p95/p99 response latency on a fixed benchmark suite
- **Impact**: Faster app, better UX, lower Cloudflare Worker CPU time

#### Why Remote D1 via `dev:wrangler` (not local)

Local D1 (Miniflare) uses SQLite in-memory/file — performance characteristics don't match real Cloudflare D1. Remote D1 gives:
- Production-realistic network latency
- Real D1 query planner behavior
- Actual query cost patterns (reads/writes, batch vs individual)

#### How the Loop Works

1. Agent modifies a query in an API route (e.g., adding `.where()` filters, batching queries, changing join strategies)
2. `bun run build && bun run wrangler dev` spins up the worker with **remote D1** (`REMOTE=true`)
3. A benchmark script hits the local worker endpoints (which talk to remote D1) and records p95/p99 latency
4. Keep commit if faster, discard if slower — log to `results.tsv`
5. Repeat

#### Fixed Budget

Each iteration = rebuild (~seconds) + warm-up + benchmark requests against remote D1. The 5-minute fixed budget maps well here.

#### Prerequisites

- Seed the remote dev D1 (`workout-dev-db`) with realistic test data so measurements are meaningful
- Write a benchmark script that exercises key API routes (workout list, exercise history, program cycle queries)
- Ensure `bun run dev:wrangler` is used (not `bun run dev`) so queries hit real D1

---

## Priority

| Idea | Value | Feasibility | Priority |
|------|-------|-------------|----------|
| 1. Progression Algorithms | High | Medium | ⭐⭐⭐ |
| 2. Whoop Readiness Scoring | High | Medium | ⭐⭐⭐ |
| 3. Volume/Intensity Recs | High | Medium | ⭐⭐ |
| 4. Notification Optimization | Medium | Easy | ⭐⭐ |
| 5. Query Performance | Medium | Easy | ⭐ |

Ideas 1–3 are highest value since we already have the data (Whoop integration + workout history) and the domain (progression algorithms) to make them work.

## Next Steps

- [ ] Pick one idea to prototype first (recommend #2 — Whoop readiness scoring)
- [ ] Define the concrete metric and evaluation harness
- [ ] Write a `program.md` tailored to the chosen domain
- [ ] Create the "train.py equivalent" — an isolated, runnable scoring algorithm
- [ ] Set up `results.tsv` logging and git branch tracking
- [ ] Run the loop overnight and review results
