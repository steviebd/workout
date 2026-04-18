# TODO: Nutrition Agent Input Builder

## Purpose

This document defines the implementation plan for refactoring the nutrition chat flow so the AI agent receives a canonical structured input object instead of relying on route-local context assembly and prose-only prompt coupling.

The end state is:

- one dedicated server-side builder that gathers nutrition agent context
- one stable behavior/system prompt for assistant instructions
- one structured context message rendered from typed application data
- a route that orchestrates request validation, message construction, streaming, and persistence, but does not own business logic for nutrition context assembly

This is intended to be detailed enough for another agent or engineer to implement directly.

## Goals

- Create a dedicated nutrition agent input builder for `/api/nutrition/chat`.
- Use existing stored preferences and nutrition data as the source of truth.
- Send preferences and key user data to the AI agent in a structured form.
- Keep the current two-system-message pattern:
  - message 1 = behavior/instructions
  - message 2 = structured app context
- Make the structured context reusable for future model tool/function calling.
- Include compact historical summaries in the first iteration.
- Preserve the existing request/response API shape for `/api/nutrition/chat`.

## Non-Goals

- Do not add new persisted nutrition-specific preference fields in this phase.
- Do not implement actual model tool/function calling in this phase.
- Do not redesign the frontend chat UX.
- Do not introduce a generic app-wide agent framework outside nutrition unless required for code organization.
- Do not send raw historical logs to the model if compact summaries are sufficient.

## Current State

The current nutrition chat flow is centered in:

- `src/routes/api/nutrition/chat.ts`
- `src/lib/ai/prompts.ts`
- `src/lib/db/nutrition.ts`
- `src/lib/db/preferences.ts`

The route currently:

- parses request body
- fetches preferences, body stats, training context, intake, Whoop data, active program state
- calculates macro targets
- assembles a prose system prompt
- renders a second system message with structured JSON-like nutrition context
- sends all messages to `streamText(...)`

Problems with the current shape:

- the route owns too much context composition logic
- the structured context is still implicitly prompt-driven
- there is no canonical typed contract for “nutrition agent input”
- future tool/function calling would need to reconstruct or duplicate this context shape

## Scope Decisions

These decisions are locked for this implementation:

- Build a nutrition-specific agent input builder now.
- Design it so future tools/functions can consume the same object later.
- Use existing stored data only for phase 1.
- Include current state plus short history summaries.
- Keep the second system message as the transport layer for structured context in this phase.

## High-Level Architecture

Implement three separate responsibilities:

### 1. Behavior Prompt

This is the stable instruction prompt.

Responsibilities:

- define assistant role
- define tone/behavior constraints
- define response expectations
- define image-analysis expectations
- define unit-handling expectations
- define how to reason when some data is missing

This should remain text-based and should not own current user data.

### 2. Nutrition Agent Input Builder

This is the canonical server-side data assembly layer.

Responsibilities:

- fetch all nutrition agent context from DB/helpers
- compute derived summaries
- shape that data into a typed object
- return structured data only, not prompt text

This should become the source of truth for nutrition agent context.

### 3. Context Renderer

This converts the typed nutrition agent input object into the second system message.

Responsibilities:

- serialize typed input into a stable JSON block
- add a predictable prefix marker
- avoid embedding behavior instructions here

The renderer should be the only place that turns structured context into prompt text.

## Required File Changes

### New file

Add:

- `src/lib/ai/nutrition-agent-input.ts`

This file should own:

- the main builder function
- nutrition agent input types if they are not kept in `src/lib/db/nutrition.ts`
- helper functions for compact history summaries
- explicit constants for adherence thresholds / lookback windows

### Existing files to modify

- `src/routes/api/nutrition/chat.ts`
- `src/lib/ai/prompts.ts`
- `src/lib/db/nutrition.ts`

Possible additional helper extraction:

- `src/lib/db/nutrition.ts`
- or a new adjacent file if DB read helpers become too large

## Canonical Data Contract

Define one canonical type for the nutrition assistant input.

Recommended shape:

```ts
export interface NutritionAgentInput {
  date: string;
  user: {
    preferences: {
      energyUnit: 'kcal' | 'kj';
      weightUnit: 'kg' | 'lbs';
      weeklyWorkoutTarget: number | null;
    };
    bodyStats: {
      bodyweightKg: number | null;
      targetCalories: number | null;
      targetProteinG: number | null;
      targetCarbsG: number | null;
      targetFatG: number | null;
    };
    hasActiveProgram: boolean;
  };
  today: {
    intake: DailyIntake;
    macroTargets: MacroTargets;
    macroTargetsSource: 'custom' | 'bodyweight-derived' | 'fallback-default';
    trainingContext: TrainingContext | null;
    whoopData: WhoopData;
  };
  history: {
    bodyweight7d: {
      latestKg: number | null;
      averageKg: number | null;
      deltaKg: number | null;
      sampleCount: number;
    };
    intake7d: {
      averageCalories: number | null;
      averageProteinG: number | null;
      averageCarbsG: number | null;
      averageFatG: number | null;
      daysLogged: number;
    };
    macroAdherence7d: {
      daysWithinCalorieTarget: number | null;
      daysWithinProteinTarget: number | null;
      evaluableDays: number;
    };
  };
}
```

## Design Rules For The Contract

- The contract must represent application data, not prompt semantics.
- Prefer `null` for missing values instead of invented numbers.
- Keep the shape stable and explicit.
- Avoid leaking route-specific or transport-specific concerns into the type.
- If internal-only fields are useful, either:
  - keep them out of the rendered JSON, or
  - split internal vs rendered contract types

## Builder API

Implement a builder with an explicit API like:

```ts
export interface BuildNutritionAgentInputArgs {
  db: DbOrTx;
  workosId: string;
  date: string;
}

export async function buildNutritionAgentInput(
  args: BuildNutritionAgentInputArgs
): Promise<NutritionAgentInput>;
```

This function must:

1. fetch all required source data
2. compute derived metrics and compact history summaries
3. return one fully shaped typed object

It must not:

- return prompt text
- return partially shaped data that the route has to finish composing

## Source Data To Include In Phase 1

### Preferences

Use existing stored preferences only:

- `energyUnit`
- `weightUnit`
- `weeklyWorkoutTarget`

Source:

- `src/lib/db/preferences.ts`

Defaults:

- `energyUnit = 'kcal'` when missing
- `weightUnit = 'kg'` when missing
- `weeklyWorkoutTarget = 3` only if following app default semantics

Implementation note:

- if you want internal absence to be preserved exactly, use `null` internally and let the renderer apply app defaults
- otherwise use the app defaults directly in the builder

Choose one approach and keep it consistent. Recommended: use app-consistent defaults in the builder for simplicity.

### Body Stats

Use existing body stats:

- `bodyweightKg`
- `targetCalories`
- `targetProteinG`
- `targetCarbsG`
- `targetFatG`

Source:

- existing `getUserBodyStats(...)`

### Current-Day Context

Use existing nutrition context:

- `today.intake`
- `today.trainingContext`
- `today.whoopData`
- `today.macroTargets`
- `user.hasActiveProgram`

Sources:

- existing helpers already used in `src/routes/api/nutrition/chat.ts`

### Macro Target Source Metadata

Add a derived `macroTargetsSource` field with values:

- `'custom'`
- `'bodyweight-derived'`
- `'fallback-default'`

Rules:

- `custom` when explicit targets are present in body stats and used directly
- `bodyweight-derived` when current bodyweight is present and targets are derived from it
- `fallback-default` when bodyweight is missing and targets use the current fallback path

This metadata is required so the agent and future tools know whether values are user-defined or inferred.

## Historical Summaries

Phase 1 includes compact short-history summaries only.

### Lookback Window

Use a 7-day window for the first implementation.

Define a named constant in the builder module, e.g.:

```ts
const HISTORY_LOOKBACK_DAYS = 7;
```

Do not hardcode the number `7` in multiple places.

### Bodyweight Summary

Target output:

- `latestKg`
- `averageKg`
- `deltaKg`
- `sampleCount`

Rules:

- If true historical bodyweight rows exist, compute from the last 7 days of data up to the requested `date`.
- If only a single current bodyweight value exists:
  - `latestKg = current bodyweight`
  - `averageKg = current bodyweight`
  - `deltaKg = null`
  - `sampleCount = 1`
- If no bodyweight exists:
  - all numeric fields `null`
  - `sampleCount = 0`

### Intake Summary

Target output:

- `averageCalories`
- `averageProteinG`
- `averageCarbsG`
- `averageFatG`
- `daysLogged`

Rules:

- Compute daily totals over the 7-day window.
- Average over logged days, not all days in the window.
- If no logged days exist:
  - averages = `null`
  - `daysLogged = 0`

### Macro Adherence Summary

Target output:

- `daysWithinCalorieTarget`
- `daysWithinProteinTarget`
- `evaluableDays`

Rules:

- Evaluate only days where enough data exists to compare intake against targets.
- `evaluableDays` = number of days that had enough information for adherence evaluation.
- If no days are evaluable:
  - `daysWithinCalorieTarget = null`
  - `daysWithinProteinTarget = null`
  - `evaluableDays = 0`

### Adherence Thresholds

Define named constants in the builder module:

```ts
const CALORIE_TARGET_TOLERANCE = 0.10;
const PROTEIN_TARGET_MIN_RATIO = 0.90;
```

Rules:

- calorie adherence = intake within +/-10% of target calories
- protein adherence = intake at or above 90% of target protein

Do not hide these thresholds inline inside calculations.

## Data Fetching Strategy

The route must stop individually composing all context pieces.

Instead:

1. parse request
2. validate request
3. create DB
4. call `buildNutritionAgentInput({ db, workosId, date })`
5. generate behavior prompt
6. render structured context message
7. build AI messages
8. stream response
9. persist user and assistant messages

## Prompt Layer Changes

### Behavior Prompt

Keep a dedicated behavior prompt function, conceptually renamed to:

```ts
assembleNutritionBehaviorPrompt(...)
```

Responsibilities:

- assistant role
- response behavior
- guidance when context is incomplete
- image analysis expectations
- unit expectations

Do not put dynamic user preference/history data logic here beyond what is necessary to explain behavior.

### Structured Context Renderer

Add a separate render function, for example:

```ts
renderNutritionAgentInputSystemMessage(input: NutritionAgentInput): string
```

Expected output shape:

```txt
NUTRITION_AGENT_INPUT_JSON:
{ ... pretty printed JSON ... }
```

Optional trailing line:

- one short line stating that this JSON is authoritative app context for the current request

Do not place behavioral instructions in this renderer.

## Route Refactor Requirements

Refactor `src/routes/api/nutrition/chat.ts` so it becomes orchestration-only.

The route should continue to own:

- request parsing
- request validation
- image rate limiting
- persistence of chat messages
- stream creation and SSE formatting

The route should no longer own:

- preference/body/training/history composition
- macro target source deduction
- history summary logic
- context-object shaping

## Existing Streaming Behavior

Preserve the current streaming contract:

- server sends `text/event-stream`
- delta payloads are serialized as SSE `data:` lines
- stream ends with `[DONE]`
- assistant response is persisted after the stream finishes

Do not regress this behavior during the refactor.

## DB Helper Requirements

You may need additional read helpers.

Prefer adding focused helper functions for summary reads rather than stuffing all SQL/Drizzle queries into the route.

Potential helpers:

- `getRecentNutritionDailyTotals(...)`
- `getRecentBodyweightSummary(...)`
- `getRecentMacroAdherenceSummary(...)`

If these fit better in a separate file, create one rather than overloading `src/lib/db/nutrition.ts`.

Recommended rule:

- keep low-level DB access in DB helper modules
- keep cross-source assembly in `nutrition-agent-input.ts`

## Missing Data Behavior

### Missing preferences

Use app defaults:

- `weightUnit = 'kg'`
- `energyUnit = 'kcal'`
- `weeklyWorkoutTarget = 3`

### Missing bodyweight

Allow:

- `bodyweightKg = null`

And still derive macro targets using current fallback behavior.

But:

- `macroTargetsSource` must be `'fallback-default'`

### Missing custom nutrition targets

If bodyweight exists and explicit targets do not:

- compute targets from bodyweight and training/program context
- mark `macroTargetsSource = 'bodyweight-derived'`

### Missing Whoop data

Structured object must contain nulls where appropriate.

Do not fabricate:

- recovery labels
- strain assumptions

Any heuristic behavior belongs in the behavior prompt, not the structured object.

### Sparse logging

If few days are logged:

- preserve correct counts
- avoid implying strong trend confidence
- set averages to `null` when there is no data

## Function / Tool Calling Compatibility

This phase does not implement actual model tool/function calling, but the design must support it later.

That means:

- the builder returns plain typed app data
- the route uses that same object for prompt rendering
- future tool/function handlers should be able to accept the same object or a lightly derived subset

Avoid:

- prompt-specific field names
- prose-only fields
- rendering decisions mixed into the builder contract

## Testing Requirements

Implementation is not complete without tests.

### Unit tests for the builder

Add tests for:

1. Full data case
   - preferences present
   - body stats present
   - explicit custom targets present
   - training context present
   - Whoop data present
   - intake present
   - history present
   - result shape is correct

2. Missing bodyweight case
   - no bodyweight recorded
   - targets still produced via fallback logic
   - `macroTargetsSource = 'fallback-default'`

3. Derived target case
   - bodyweight present
   - explicit targets absent
   - macro targets derived from bodyweight and context
   - `macroTargetsSource = 'bodyweight-derived'`

4. Missing preferences case
   - preferences absent
   - defaults applied correctly

5. Sparse history case
   - 1-2 days of nutrition logs
   - averages and counts remain correct
   - adherence does not overstate data quality

6. No Whoop case
   - Whoop fields remain null-safe

7. No history at all
   - history object preserves shape
   - counts = 0
   - summary metrics are null where expected

### Unit tests for the renderer

Add tests for:

- prefix marker exists
- JSON rendering is stable
- expected fields are included
- fields intentionally excluded from rendered context do not leak

### Route-level tests

Add tests for `/api/nutrition/chat` verifying:

- behavior prompt system message is included
- structured context system message is included
- prior messages are included
- current user message is included
- SSE formatting remains valid
- assistant response still persists after streaming completes

## Acceptance Criteria

The task is done when all of the following are true:

- `/api/nutrition/chat` no longer manually assembles nutrition agent context from multiple raw sources
- a dedicated builder returns one canonical `NutritionAgentInput` object
- the second system message is rendered from that typed object
- current chat behavior is preserved
- existing data sources are used without requiring new persistence fields
- compact 7-day summaries are included
- `macroTargetsSource` is present and correct
- missing-data cases are handled explicitly and null-safely
- tests cover builder, renderer, and route composition

## Suggested Implementation Sequence

1. Define `NutritionAgentInput` and related builder types.
2. Add `nutrition-agent-input.ts`.
3. Move current non-history context assembly from the route into the builder.
4. Add history summary helper functions.
5. Add `macroTargetsSource`.
6. Add structured renderer function.
7. Rename or clarify the behavior prompt function.
8. Refactor the route to consume the builder and renderer.
9. Add tests.
10. Run typecheck and relevant tests.

## Implementation Notes For The Reviewing/Building Agent

- Keep changes incremental and easy to diff.
- Do not change the request body shape for `/api/nutrition/chat`.
- Preserve SSE formatting exactly.
- Prefer adding narrow helper functions over large generic abstractions.
- If bodyweight history is not actually available as a time series, keep the fallback summary behavior and document it in code comments.
- If `src/lib/db/nutrition.ts` becomes too crowded, extract history helpers into a neighboring nutrition-specific analytics/helper file.
- Use existing app defaults where the repo already has clear default semantics.
- Keep behavior prompt logic and context rendering logic separate.

## Deliverables

The implementation should produce:

- a new nutrition agent input builder module
- a canonical typed nutrition agent input contract
- a structured context renderer
- a simplified nutrition chat route
- tests covering builder, renderer, and route composition

## Final Outcome

After this refactor, nutrition chat should have a clean data flow:

1. request enters `/api/nutrition/chat`
2. route validates and loads request basics
3. route calls the nutrition agent input builder
4. behavior prompt is built separately
5. structured context message is rendered from the builder output
6. AI gateway receives:
   - stable behavior instructions
   - canonical structured app context
   - prior conversation
   - current user message
7. response streams back unchanged
8. chat persistence remains intact

This gives the app a stable foundation for sending preferences and key user data to the AI agent now, while also preparing the system for future tool/function calling without rebuilding the context contract later.
