# Product Design Review (PDR) — AI Nutrition Tracker

## Overview

**Feature Name:** AI-Powered Nutrition / Calorie Tracker

**Purpose:** A dedicated page within the Fit Workout App that lets users photograph their meals and use AI to estimate caloric and macronutrient content. The AI assistant is conversational — users can ask follow-up questions, get suggestions, and interact naturally. It integrates with Whoop recovery/strain data and the user's active program schedule (or manual training context) to provide personalised macro recommendations aligned with powerlifting goals.

**Target Users:** Existing Fit app users who are following strength programs and want nutrition guidance tailored to their training day, bodyweight, and recovery status.

---

## Core Concepts

### Energy Unit Preference
The existing `userPreferences` table will be extended with an `energyUnit` field (`kcal` | `kj`). This is switchable from the existing Settings dropdown in the Header. All nutrition data is stored in kcal internally and converted at display time (1 kcal = 4.184 kJ).

### AI Provider
- **Vercel AI SDK (`ai` package)** — provides `useChat` hook for streaming conversational UI and server-side `streamText` for responses.
- **Provider:** `@ai-sdk/openai` — direct OpenAI-compatible provider (works on Cloudflare Workers without Vercel infrastructure).
- **Model selection:** `AI_MODEL_NAME` env var (e.g., `gpt-4o`).
- **API key:** Stored in Infisical as `AI_API_KEY`, injected as a Cloudflare Worker secret.
- **Note:** `@ai-sdk/vercel` requires Vercel AI Gateway which is not available from Cloudflare Workers. Use `@ai-sdk/openai` (or `@ai-sdk/xai` etc.) directly instead.

### Powerlifting-Focused Recommendations
The AI system prompt is enriched with:
1. **User bodyweight** (from `user_body_stats`).
2. **Today's training context** — either the scheduled program session from `programCycleWorkouts`, or the user's manual training context (rest day / cardio / powerlifting / custom template).
3. **Whoop recovery score, strain, and calories burned** from `whoopCycles` / `whoopRecoveries` for today. Fallback to "moderate recovery" if no Whoop data.
4. **Daily intake so far** — sum of all logged meals for the day.
5. **Target macros** — calculated from bodyweight using powerlifting-standard ratios (configurable via `user_body_stats` overrides).

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Online-only | No offline/local-first support | AI analysis requires network; no Dexie sync for nutrition tables |
| Chat session = per day | One conversation per date | Users review and continue their nutrition chat throughout the day |
| Meal editing | Both AI chat re-open and manual UI edit | User can tap a saved meal to edit numbers directly, or return to the day's chat to ask the AI for adjustments |
| Image storage | Not persisted | Images are sent to the AI in-request only; `has_image` flag preserved for audit. Avoids D1 row size limits (2MB) |
| Body stats | Single active row per user (upsert) | `user_body_stats` uses upsert on `workos_id`; `recorded_at` tracks when last updated, not historical |

---

## User Flow

```
1. User taps "Nutrition" in bottom nav → Nutrition page
2. Sees today's dashboard: calories consumed vs target, macro breakdown (P/C/F), Whoop data, training context
3. Taps "Log Meal" → opens AI chat interface
4. Takes a photo or uploads an image of their meal
5. AI analyses the image and returns estimated calories + macros (protein, carbs, fat)
6. User can ask follow-up questions:
   - "What if I added rice?"
   - "How much protein is in this?"
   - "What should I eat for dinner to hit my targets?"
7. User taps "Save" on the AI analysis message → confirmation popup opens
8. User adjusts any fields (name, meal type, calories, macros) and confirms
9. Meal is saved to the database, dashboard updates in real-time
```

---

## Data Model

### New Tables

#### `nutrition_entries`
| Column | Type | Description |
|--------|------|-------------|
| `id` | text (PK) | UUID |
| `workos_id` | text (FK → users.workos_id) | Owner |
| `meal_type` | text | `breakfast` / `lunch` / `dinner` / `snack` |
| `name` | text | AI-generated or user-provided name (e.g. "Grilled Chicken & Rice") |
| `calories` | real | Estimated kcal |
| `protein_g` | real | Grams of protein |
| `carbs_g` | real | Grams of carbohydrates |
| `fat_g` | real | Grams of fat |
| `ai_analysis` | text | Raw AI response text for audit/re-display |
| `logged_at` | text | ISO timestamp of when the meal was logged |
| `date` | text | Date string (YYYY-MM-DD) for daily aggregation |
| `is_deleted` | integer (boolean) | Soft delete |
| `created_at` | text | Auto-generated |
| `updated_at` | text | Auto-generated |

#### `nutrition_chat_messages`
| Column | Type | Description |
|--------|------|-------------|
| `id` | text (PK) | UUID |
| `workos_id` | text (FK → users.workos_id) | Owner |
| `date` | text | Date string (YYYY-MM-DD) — one session per day |
| `role` | text | `user` / `assistant` / `system` |
| `content` | text | Message text |
| `has_image` | integer (boolean) | Whether this message included an image (images are not persisted) |
| `created_at` | text | Auto-generated |

#### `user_body_stats`
Single row per user (upsert pattern). Not a time series.

| Column | Type | Description |
|--------|------|-------------|
| `id` | text (PK) | UUID |
| `workos_id` | text (FK → users.workos_id, UNIQUE) | Owner — one row per user |
| `bodyweight_kg` | real | Current bodyweight in kg |
| `height_cm` | real | Height in cm (nullable) |
| `target_calories` | integer | Manual override for daily calorie target (nullable) |
| `target_protein_g` | integer | Manual override (nullable) |
| `target_carbs_g` | integer | Manual override (nullable) |
| `target_fat_g` | integer | Manual override (nullable) |
| `recorded_at` | text | When this was recorded |
| `created_at` | text | Auto-generated |
| `updated_at` | text | Auto-generated |

#### `nutrition_training_context`
| Column | Type | Description |
|--------|------|-------------|
| `id` | text (PK) | UUID |
| `workos_id` | text (FK → users.workos_id) | Owner |
| `date` | text | Date string (YYYY-MM-DD), unique per (workos_id, date) |
| `training_type` | text | `rest_day` / `cardio` / `powerlifting` / `custom` |
| `custom_label` | text | User's custom label if `training_type` is `custom` |
| `created_at` | text | Auto-generated |
| `updated_at` | text | Auto-generated |

### Schema Changes to Existing Tables

#### `user_preferences` — add column:
```
energy_unit text DEFAULT 'kcal'   -- 'kcal' or 'kj'
```

### Unique Constraints
```sql
UNIQUE(workos_id, date) ON nutrition_training_context
```

### Indexes
```sql
idx_nutrition_entries_workos_date ON nutrition_entries(workos_id, date)
idx_nutrition_entries_workos_deleted ON nutrition_entries(workos_id, is_deleted)
idx_nutrition_chat_workos_date ON nutrition_chat_messages(workos_id, date)
idx_user_body_stats_workos ON user_body_stats(workos_id)
idx_nutrition_training_context_workos_date ON nutrition_training_context(workos_id, date)
```

---

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/nutrition/entries?date=YYYY-MM-DD` | List meals for a given day |
| POST | `/api/nutrition/entries` | Create a nutrition entry |
| PUT | `/api/nutrition/entries/:id` | Update an entry (edit macros) |
| DELETE | `/api/nutrition/entries/:id` | Soft-delete an entry |
| GET | `/api/nutrition/daily-summary?date=YYYY-MM-DD` | Aggregated daily totals + targets |
| GET | `/api/nutrition/chat?date=YYYY-MM-DD` | Load chat history for a given day |
| POST | `/api/nutrition/chat` | Streaming AI chat endpoint (Vercel AI SDK `streamText`) |
| GET | `/api/nutrition/body-stats` | Get current body stats |
| POST | `/api/nutrition/body-stats` | Create/update body stats |
| GET | `/api/nutrition/training-context?date=YYYY-MM-DD` | Get today's training context |
| POST | `/api/nutrition/training-context` | Set today's training context |

---

## Image Handling

- **Client-side compression:** Images compressed to max 2MB before base64 encoding
- **Base64-encode:** Images sent directly in the AI request as base64 strings
- **No photo persistence** — images are used once for AI analysis and discarded

---

## AI System Prompt Context

The AI chat endpoint assembles a dynamic system prompt at meal-log time (snapshot — not updated dynamically mid-session):

```
You are a nutrition assistant for a powerlifter using the Fit workout app.

USER CONTEXT:
- Bodyweight: {bodyweight_kg} kg
- Energy unit preference: {kcal | kj}
- Weight unit preference: {kg | lbs}

TODAY'S TRAINING:
- Training type: {training_type} (rest day / cardio / powerlifting / custom)
- {If program session exists: Program: {program_name}, Session: {session_name}, Target lifts: {target_lifts}}
- {If custom label: Custom label: {custom_label}}

RECOVERY (from Whoop):
- Recovery score: {score}% ({status: green/yellow/red})
- HRV: {hrv} ms
- Resting HR: {rhr} bpm
- Calories burned today: {calories_burned} kcal
- Total strain: {strain}
- {If no Whoop data: No Whoop data available — assume moderate recovery}

DAILY INTAKE SO FAR:
- Calories: {consumed_kcal} / {target_kcal}
- Protein: {consumed_p}g / {target_p}g
- Carbs: {consumed_c}g / {target_c}g
- Fat: {consumed_f}g / {target_f}g

MACRO TARGETS (powerlifting-focused defaults):
- Protein: 2.0g per kg bodyweight
- Fat: 0.8g per kg bodyweight
- Carbs: fill remaining calories
- Adjusted for training day intensity (+10-15% on heavy days, -5% on rest days)

When analysing food images, return structured estimates for calories, protein, carbs, and fat in a conversational response.
Always respond in the user's preferred energy unit.
```

---

## Save Meal Flow

1. AI analyses image → returns conversational response with estimated macros
2. User taps "Save" button on the AI analysis message
3. `SaveMealDialog` opens with all fields editable:
   - **Meal name** — AI-suggested, fully editable
   - **Meal type** — inferred from time of day (before 10am = breakfast, 10am-3pm = lunch, 3pm-7pm = dinner, after 7pm = snack), fully editable
   - **Calories** — editable, validated 0–10,000 kcal
   - **Protein (g)** — editable, validated 0–500g
   - **Carbs (g)** — editable, validated 0–1,000g
   - **Fat (g)** — editable, validated 0–500g
   - **Image preview** — shown if image was captured
4. User taps "Confirm" → POST to `/api/nutrition/entries`
5. Dashboard totals update in real-time via TanStack Query invalidation

---

## Training Context

Users without an active program (or on rest days) can set their training context manually:

| Type | Description |
|------|-------------|
| `rest_day` | No training |
| `cardio` | Default cardio template |
| `powerlifting` | Default powerlifting template |
| `custom` | User-defined custom template label |

Defaults ("Cardio", "Powerlifting") are provided. Users can set a custom label when selecting `custom`.

---

## Frontend Routes & Components

### New Route: `/nutrition`
**File:** `src/routes/nutrition.tsx`

**Layout:**
- **Daily Dashboard** (top section)
  - Calorie ring/progress bar: consumed vs target
  - Macro bars: protein, carbs, fat (each with g consumed / target)
  - WhoopNutritionCard: calories burned, recovery score, HRV, strain
  - TrainingContextCard: today's scheduled session OR manual training context
- **Meal Log** (scrollable list)
  - Each entry: name, calories, macros, time
  - Swipe to delete
- **FAB / "Log Meal" button** → navigates to `/nutrition/chat`

### New Route: `/nutrition/chat`
**File:** `src/routes/nutrition.chat.tsx`

**Layout:**
- Full-screen chat interface using Vercel AI SDK `useChat`
- Camera/upload button for meal photos
- Streaming AI responses
- "Save as Meal" button on AI analysis messages
- Quick action chips: "What should I eat?", "Analyse my meal", "Show remaining macros"

### New Components

| Component | Location | Description |
|-----------|----------|-------------|
| `NutritionDashboard` | `src/components/nutrition/NutritionDashboard.tsx` | Daily overview with rings/bars |
| `MacroProgressBar` | `src/components/nutrition/MacroProgressBar.tsx` | Individual macro progress indicator |
| `MealCard` | `src/components/nutrition/MealCard.tsx` | Single meal entry in the log |
| `NutritionChat` | `src/components/nutrition/NutritionChat.tsx` | Chat UI with `useChat` integration |
| `MealImageCapture` | `src/components/nutrition/MealImageCapture.tsx` | Camera / file upload + compression |
| `TrainingContextCard` | `src/components/nutrition/TrainingContextCard.tsx` | Today's training context |
| `WhoopNutritionCard` | `src/components/nutrition/WhoopNutritionCard.tsx` | Whoop data on nutrition dashboard |
| `SaveMealDialog` | `src/components/nutrition/SaveMealDialog.tsx` | Confirmation popup with editable fields |

### Navigation
- Add "Nutrition" tab to `BottomNav` component (6th tab: Home, Workouts, Programs, Progress, Badges, Nutrition).
- Icon: `Utensils` from lucide-react.

---

## Settings Integration

Extend the existing Settings dropdown in `Header.tsx` with:
- **Energy Unit** toggle: `kcal` ↔ `kJ`
- **Bodyweight** input (stored in `user_body_stats`, accessible from Settings page)

Extend `UserPreferencesContext.tsx` with:
- `energyUnit: 'kcal' | 'kj'`
- `setEnergyUnit` function
- `formatEnergy(kcal: number): string` — converts and formats based on preference
- `convertEnergy(kcal: number): number` — returns value in kJ (multiplies by 4.184)

---

## Whoop Integration Points

| Data Point | Source Table | Usage |
|------------|-------------|-------|
| Calories burned today | `whoopCycles.caloriesBurned` | Display on dashboard, feed to AI context |
| Recovery score | `whoopRecoveries.score` | AI uses to adjust recommendations (lower recovery → suggest more anti-inflammatory foods) |
| Recovery status | `whoopRecoveries.status` | Visual indicator on dashboard |
| HRV | `whoopRecoveries.hrv` | AI context for recovery-aware suggestions |
| Total strain | `whoopCycles.totalStrain` | AI adjusts carb recommendations based on training load |

**Fallback:** If no Whoop data is available, AI context uses "No Whoop data available — assume moderate recovery."

---

## Program Integration Points

| Data Point | Source | Usage |
|------------|--------|-------|
| Today's scheduled session | `programCycleWorkouts` where `scheduledDate = today` | Show on dashboard, AI context |
| Session name + target lifts | `programCycleWorkouts.sessionName`, `targetLifts` | AI knows if it's a heavy squat day vs rest day |
| Program name | `userProgramCycles.name` | AI context |

**Fallback:** If no scheduled session exists, use the user's manual training context from `nutrition_training_context`.

---

## Macro Calculation Logic

### Default Powerlifting Targets (configurable via `user_body_stats` overrides)

```typescript
function calculateDailyTargets(bodyweightKg: number, trainingType: TrainingType, hasProgram: boolean) {
  const proteinG = bodyweightKg * 2.0;        // 2g/kg
  const fatG = bodyweightKg * 0.8;            // 0.8g/kg

  let baseCals = bodyweightKg * 33;           // Maintenance ~33 kcal/kg

  if (hasProgram) {
    // Use program cycle workout data if available
    // Heavy compound days: +15%, light days: +5%, rest days: no adjustment
  } else {
    // Use training context adjustments
    if (trainingType === 'powerlifting') baseCals *= 1.15;
    if (trainingType === 'cardio') baseCals *= 1.05;
    // rest_day: no adjustment
  }

  const proteinCals = proteinG * 4;
  const fatCals = fatG * 9;
  const carbsCals = baseCals - proteinCals - fatCals;
  const carbsG = carbsCals / 4;

  return {
    calories: Math.round(baseCals),
    proteinG: Math.round(proteinG),
    carbsG: Math.round(carbsG),
    fatG: Math.round(fatG),
  };
}
```

### Energy Conversion
- All data stored in kcal
- Display conversion: `kJ = kcal × 4.184`
- Rounded to whole numbers for display

---

## Dependencies

### New Packages
| Package | Purpose |
|---------|---------|
| `ai` | Vercel AI SDK — `useChat`, `streamText` |
| `@ai-sdk/openai` | OpenAI-compatible provider for AI SDK (works on Cloudflare Workers) |

### New Secrets (Infisical)
| Secret | Environments |
|--------|-------------|
| `AI_API_KEY` | dev, staging, prod |
| `AI_MODEL_NAME` | dev, staging, prod |

### New Cloudflare Resources
None — no new Cloudflare resources required.

---

## Implementation Phases

### Phase 1: Foundation (MVP)
1. Add `energyUnit` column to `user_preferences` + schema migration
2. Create `nutrition_entries`, `nutrition_chat_messages`, `user_body_stats`, `nutrition_training_context` tables
3. Install `ai` and `@ai-sdk/openai` packages
4. Add `AI_API_KEY` and `AI_MODEL_NAME` to Infisical (all envs)
5. Build `/api/nutrition/chat` streaming endpoint with base64 image support
6. Build `/api/nutrition/entries` CRUD endpoints
7. Build `/api/nutrition/daily-summary` endpoint
8. Build `/api/nutrition/body-stats` endpoint
9. Build `/api/nutrition/training-context` endpoint
10. Create `NutritionChat` component with `useChat`
11. Create `NutritionDashboard` with daily totals
12. Create `/nutrition` and `/nutrition/chat` routes
13. Add "Nutrition" tab to `BottomNav` (6th tab — Home, Workouts, Programs, Progress, Badges, Nutrition)
14. Add energy unit toggle to Settings
15. Wire up energy unit in `UserPreferencesContext` with `formatEnergy` / `convertEnergy`
16. Add bodyweight input to Settings page
17. Client-side image compression (max 2MB) before base64 encoding
18. Build `SaveMealDialog` with all editable fields + validation
19. Build `TrainingContextCard` and `WhoopNutritionCard` (Whoop integration is Phase 1)
20. Rate limiting: 50 AI analyses/day — block until next day with "running out of credits" message

### Phase 2: Intelligence
1. Add weekly/monthly nutrition trends (charts)
2. Add meal history and favourites ("log this again")
3. Quick-log without AI (manual entry)

### Phase 3: Polish
1. Enhanced AI suggestions based on historical meal data
2. Grocery list generation from nutrition targets
3. Meal timing recommendations based on training schedule

---

## Rate Limiting

- **Limit:** 50 AI image analyses per user per day
- **Enforcement:** Count `nutrition_chat_messages` rows with `role = 'user'` and `has_image = true` for the current day — no separate counter table needed
- **When exceeded:** Show "running out of credits" message, block AI analysis until next day
- **Reset:** Implicit — query filters by today's date

---

## Validation Bounds

| Field | Min | Max |
|-------|-----|-----|
| `calories` | 0 | 10,000 kcal |
| `protein_g` | 0 | 500 g |
| `carbs_g` | 0 | 1,000 g |
| `fat_g` | 0 | 500 g |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI calorie estimates are inaccurate | Users may over/under-eat | Show confidence ranges; allow manual edits; disclaimer text |
| AI API costs | Per-request cost at scale | Rate-limit per user (50 analyses/day); cache common foods; consider smaller model for simple queries |
| Large image uploads on mobile | Slow UX, bandwidth | Client-side compression before upload; max 2MB |
| AI SDK on Cloudflare Workers | Compatibility concerns | Use `@ai-sdk/openai` directly (not `@ai-sdk/vercel`); verify `ai` core SDK works with Workers runtime; fallback to raw `fetch` + SSE if needed |

---

## Success Metrics

- Users log ≥1 meal/day on average
- AI analysis accuracy within ±20% of actual calories (user feedback)
- < 3s response time for image analysis
- Energy unit preference respected across all displays
- AI recommendations reference today's training context and Whoop data

---

## Last Updated

Date: April 7, 2026
Status: PDR complete — ready for implementation
