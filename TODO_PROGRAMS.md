# Programs Accessory Research - Implementation Plan

## Executive Summary

This document describes the implementation of accessory exercises for all strength programs in the Fit Workout App. Accessories will be added to the **same template** as main lifts, using the existing exercise library for common exercises, with support for weighted bodyweight variations via an "added weight" field.

---

## Key Implementation Decisions (Finalized)

| Decision | Resolution |
|----------|------------|
| Template organization | **Option B**: Accessories in same template as main lifts |
| Weighted bodyweight exercises | Add `addedWeight` field (default 0) to track additional weight |
| Exercise library | Use existing library; add 15 missing accessories |
| User experience | Program-generated exercises are identical to user-created exercises |
| Rep parsing | Store as raw string (e.g., "50-100 reps total", "30sec") |
| nSuns back work | Auto-add rows + pullups + face-pulls (all required) |

---

## 1. Database Schema Extensions

### 1.1 Template Exercises Table (Schema Update)

```typescript
// src/lib/db/schema.ts - templateExercises table extension
export const templateExercises = sqliteTable('template_exercises', {
  // ... existing fields ...
  targetWeight: real('target_weight'),              // Calculated target weight
  addedWeight: real('added_weight').default(0),     // NEW: For bodyweight exercises (dips, pullups)
  sets: integer('sets'),
  reps: integer('reps'),                            // Numeric value (0 if string like "30sec")
  repsRaw: text('reps_raw'),                        // NEW: Store raw string for display
  isAmrap: integer('is_amrap', { mode: 'boolean' }).default(false),
  setNumber: integer('set_number'),
  isAccessory: integer('is_accessory', { mode: 'boolean' }).default(false),  // NEW
  isRequired: integer('is_required', { mode: 'boolean' }).default(true),    // NEW
});
```

### 1.2 TypeScript Types

```typescript
// src/lib/programs/types.ts

export type AccessoryCategory = 'push' | 'pull' | 'leg' | 'core';

export interface AccessoryDefinition {
  id: string;
  name: string;
  category: AccessoryCategory;
  baseLift: LiftType | null;           // null for pure bodyweight
  defaultPercentage: number | null;    // % of base lift 1RM, null for bodyweight
  muscleGroup: string;
  libraryId: string;                   // Reference to exerciseLibrary
}

export interface ProgramAccessory {
  accessoryId: string;
  sets: number;
  reps: number | string;               // number for reps, string for "30sec", "50-100 reps total"
  targetPercentage?: number;           // Override default percentage
  isRequired: boolean;
  notes?: string;
}

export interface WorkoutAccessory {
  accessoryId: string;
  name: string;
  libraryId?: string;
  muscleGroup: string;
  sets: number;
  reps: number | string;
  targetWeight: number;
  addedWeight: number;                 // For bodyweight exercises (0 by default)
  isRequired: boolean;
}

export interface ProgramWorkout {
  weekNumber: number;
  sessionNumber: number;
  sessionName: string;
  exercises: Array<{
    name: string;
    lift: LiftType;
    sets: number;
    reps: number;
    targetWeight: number;
    isAmrap?: boolean;
  }>;
  accessories?: WorkoutAccessory[];    // NEW: Accessories in same workout
}

export interface ProgramConfig {
  info: ProgramInfo;
  generateWorkouts(oneRMs: OneRMValues): ProgramWorkout[];
  calculateTargetWeight(estimatedOneRM: number, week: number, session: number, lift: LiftType): number;
  getAccessories?(week: number, session: number): ProgramAccessory[];
}
```

---

## 2. Exercise Library Extensions

### 2.1 Missing Accessories to Add to `src/lib/exercise-library.ts`

```typescript
// New accessory exercises to add to exerciseLibrary array:

{ id: 'back-raises', name: 'Back Raises', muscleGroup: 'Back', description: 'A back extension exercise performed on a roman chair, targeting the erector spinae and glutes.' },
{ id: 'hyperextensions', name: 'Hyperextensions', muscleGroup: 'Back', description: 'Lying face down on a hyperextension bench, raise your upper body to target the lower back muscles.' },
{ id: 'weighted-pullups', name: 'Weighted Pull-ups', muscleGroup: 'Back', description: 'Pull-ups with added weight (belt or dumbbell) for increased resistance.' },
{ id: 'weighted-dips', name: 'Weighted Dips', muscleGroup: 'Chest', description: 'Dips with added weight belt or dumbbell between feet for increased difficulty.' },
{ id: 'inverted-rows', name: 'Inverted Rows', muscleGroup: 'Back', description: 'Horizontal pulling exercise using a bar at waist height, similar to a pull-up but easier.' },
{ id: 'pause-squat', name: 'Pause Squat', muscleGroup: 'Quads', description: 'Squat with a 2-3 second pause at the bottom to build strength at the sticking point.' },
{ id: 'paused-bench', name: 'Paused Bench Press', muscleGroup: 'Chest', description: 'Bench press with a 2-3 second pause on the chest to build strength and control.' },
{ id: 'paused-deadlift', name: 'Paused Deadlift', muscleGroup: 'Back', description: 'Deadlift with a pause just above the knee to build lockout strength.' },
{ id: 'deficit-deadlift', name: 'Deficit Deadlift', muscleGroup: 'Back', description: 'Deadlift performed standing on a platform to increase range of motion and build strength.' },
{ id: 'rack-pull', name: 'Rack Pull', muscleGroup: 'Back', description: 'Deadlift from pins in the rack, emphasizing lockout strength above the knee.' },
{ id: 'good-mornings', name: 'Good Mornings', muscleGroup: 'Hamstrings', description: 'Hip-hinge exercise with barbell on back, bending at the waist to target hamstrings and lower back.' },
{ id: 'face-pulls', name: 'Face Pulls', muscleGroup: 'Shoulders', description: 'Cable exercise pulling rope to face level, targeting rear delts and rotator cuff.' },
{ id: 'hanging-leg-raise', name: 'Hanging Leg Raise', muscleGroup: 'Core', description: 'Hanging from bar, raise legs to horizontal to target hip flexors and lower abs.' },
{ id: 'cable-crunch', name: 'Cable Crunch', muscleGroup: 'Core', description: 'Kneeling cable exercise crunching down to flex spine against resistance.' },
{ id: 'ab-wheel', name: 'Ab Wheel', muscleGroup: 'Core', description: 'Rolling wheel exercise extending and contracting the core for intense abdominal work.' },
```

### 2.2 Library Mapping Reference

| Accessory | Library ID | Notes |
|-----------|------------|-------|
| Dips | `chest-dips` | Bodyweight |
| Weighted Dips | `weighted-dips` | NEW |
| Pull-ups | `pull-ups` | Bodyweight |
| Weighted Pull-ups | `weighted-pullups` | NEW |
| Barbell Curl | `barbell-curl` | |
| Skullcrushers | `skull-crushers` | |
| Face Pulls | `face-pulls` | NEW |
| Tricep Pushdowns | `tricep-pushdown` | |
| Tricep Extensions | `overhead-tricep-extension` | |
| RDL | `romanian-deadlift` | |
| DB Row | `dumbbell-row` | |
| DB OHP | `dumbbell-shoulder-press` | |
| Planks | `plank` | |
| Lunges | `lunges` | |
| Back Raises | `back-raises` | NEW |
| Push-ups | `push-ups` | |
| Rows | `barbell-row` | |
| Hyperextensions | `hyperextensions` | NEW |
| Box Jumps | `box-jump` | |
| Cable Rows | `seated-cable-row` | |
| Lat Pulldowns | `lat-pulldown` | |
| Hammer Curls | `hammer-curl` | |
| Lateral Raises | `lateral-raises` | |
| Preacher Curl | `preacher-curl` | |
| Incline DB Press | `incline-dumbbell-press` | |
| Leg Curls | `leg-curl` | |
| Leg Extensions | `leg-extension` | |
| Good Mornings | `good-mornings` | NEW |
| Hanging Leg Raise | `hanging-leg-raise` | NEW |
| Cable Crunch | `cable-crunch` | NEW |

---

## 3. Accessory Data Repository

### 3.1 New File: `src/lib/programs/accessory-data.ts`

```typescript
import { exerciseLibrary } from '../exercise-library';
import type { AccessoryDefinition, ProgramAccessory, WorkoutAccessory, OneRMValues } from './types';
import { roundToPlate } from './utils';

export const ACCESSORIES: Record<string, AccessoryDefinition> = {
  // Push Accessories
  dips: {
    id: 'dips',
    name: 'Dips',
    category: 'push',
    baseLift: 'bench',
    defaultPercentage: 0.50,
    muscleGroup: 'Chest',
    libraryId: 'chest-dips',
  },
  weightedDips: {
    id: 'weighted-dips',
    name: 'Weighted Dips',
    category: 'push',
    baseLift: 'bench',
    defaultPercentage: 0.50,
    muscleGroup: 'Chest',
    libraryId: 'weighted-dips',
  },
  pushups: {
    id: 'pushups',
    name: 'Push-ups',
    category: 'push',
    baseLift: null,
    defaultPercentage: null,
    muscleGroup: 'Chest',
    libraryId: 'push-ups',
  },
  skullcrushers: {
    id: 'skullcrushers',
    name: 'Skull Crushers',
    category: 'push',
    baseLift: 'bench',
    defaultPercentage: 0.35,
    muscleGroup: 'Triceps',
    libraryId: 'skull-crushers',
  },
  tricepPushdowns: {
    id: 'tricep-pushdowns',
    name: 'Tricep Pushdowns',
    category: 'push',
    baseLift: 'bench',
    defaultPercentage: 0.25,
    muscleGroup: 'Triceps',
    libraryId: 'tricep-pushdown',
  },
  tricepExtensions: {
    id: 'tricep-extensions',
    name: 'Overhead Tricep Extension',
    category: 'push',
    baseLift: 'bench',
    defaultPercentage: 0.30,
    muscleGroup: 'Triceps',
    libraryId: 'overhead-tricep-extension',
  },
  lateralRaises: {
    id: 'lateral-raises',
    name: 'Lateral Raises',
    category: 'push',
    baseLift: 'ohp',
    defaultPercentage: 0.15,
    muscleGroup: 'Shoulders',
    libraryId: 'lateral-raises',
  },

  // Pull Accessories
  pullups: {
    id: 'pullups',
    name: 'Pull-ups',
    category: 'pull',
    baseLift: null,
    defaultPercentage: null,
    muscleGroup: 'Back',
    libraryId: 'pull-ups',
  },
  weightedPullups: {
    id: 'weighted-pullups',
    name: 'Weighted Pull-ups',
    category: 'pull',
    baseLift: null,
    defaultPercentage: null,
    muscleGroup: 'Back',
    libraryId: 'weighted-pullups',
  },
  barbellCurl: {
    id: 'barbell-curl',
    name: 'Barbell Curl',
    category: 'pull',
    baseLift: 'bench',
    defaultPercentage: 0.30,
    muscleGroup: 'Biceps',
    libraryId: 'barbell-curl',
  },
  dumbbellCurl: {
    id: 'dumbbell-curl',
    name: 'Dumbbell Curl',
    category: 'pull',
    baseLift: 'bench',
    defaultPercentage: 0.25,
    muscleGroup: 'Biceps',
    libraryId: 'dumbbell-curl',
  },
  hammerCurl: {
    id: 'hammer-curl',
    name: 'Hammer Curl',
    category: 'pull',
    baseLift: 'bench',
    defaultPercentage: 0.25,
    muscleGroup: 'Biceps',
    libraryId: 'hammer-curl',
  },
  rows: {
    id: 'rows',
    name: 'Barbell Row',
    category: 'pull',
    baseLift: 'bench',
    defaultPercentage: 0.50,
    muscleGroup: 'Back',
    libraryId: 'barbell-row',
  },
  dumbbellRow: {
    id: 'dumbbell-row',
    name: 'Dumbbell Row',
    category: 'pull',
    baseLift: 'bench',
    defaultPercentage: 0.40,
    muscleGroup: 'Back',
    libraryId: 'dumbbell-row',
  },
  facePulls: {
    id: 'face-pulls',
    name: 'Face Pulls',
    category: 'pull',
    baseLift: 'ohp',
    defaultPercentage: 0.20,
    muscleGroup: 'Shoulders',
    libraryId: 'face-pulls',
  },
  latPulldowns: {
    id: 'lat-pulldowns',
    name: 'Lat Pulldowns',
    category: 'pull',
    baseLift: 'deadlift',
    defaultPercentage: 0.50,
    muscleGroup: 'Back',
    libraryId: 'lat-pulldown',
  },
  cableRows: {
    id: 'cable-rows',
    name: 'Seated Cable Row',
    category: 'pull',
    baseLift: 'deadlift',
    defaultPercentage: 0.45,
    muscleGroup: 'Back',
    libraryId: 'seated-cable-row',
  },
  invertedRows: {
    id: 'inverted-rows',
    name: 'Inverted Rows',
    category: 'pull',
    baseLift: null,
    defaultPercentage: null,
    muscleGroup: 'Back',
    libraryId: 'inverted-rows',
  },

  // Leg Accessories
  lunges: {
    id: 'lunges',
    name: 'Lunges',
    category: 'leg',
    baseLift: 'squat',
    defaultPercentage: 0.35,
    muscleGroup: 'Quads',
    libraryId: 'lunges',
  },
  romanianDeadlift: {
    id: 'romanian-dl',
    name: 'Romanian Deadlift',
    category: 'leg',
    baseLift: 'deadlift',
    defaultPercentage: 0.65,
    muscleGroup: 'Hamstrings',
    libraryId: 'romanian-deadlift',
  },
  legExtensions: {
    id: 'leg-extensions',
    name: 'Leg Extension',
    category: 'leg',
    baseLift: 'squat',
    defaultPercentage: 0.35,
    muscleGroup: 'Quads',
    libraryId: 'leg-extension',
  },
  legCurls: {
    id: 'leg-curls',
    name: 'Leg Curl',
    category: 'leg',
    baseLift: 'deadlift',
    defaultPercentage: 0.30,
    muscleGroup: 'Hamstrings',
    libraryId: 'leg-curl',
  },
  goodMornings: {
    id: 'good-mornings',
    name: 'Good Mornings',
    category: 'leg',
    baseLift: 'deadlift',
    defaultPercentage: 0.45,
    muscleGroup: 'Hamstrings',
    libraryId: 'good-mornings',
  },
  boxJumps: {
    id: 'box-jumps',
    name: 'Box Jump',
    category: 'leg',
    baseLift: null,
    defaultPercentage: null,
    muscleGroup: 'Other',
    libraryId: 'box-jump',
  },

  // Core Accessories
  planks: {
    id: 'planks',
    name: 'Plank',
    category: 'core',
    baseLift: null,
    defaultPercentage: null,
    muscleGroup: 'Core',
    libraryId: 'plank',
  },
  hangingLegRaises: {
    id: 'hanging-leg-raises',
    name: 'Hanging Leg Raise',
    category: 'core',
    baseLift: null,
    defaultPercentage: null,
    muscleGroup: 'Core',
    libraryId: 'hanging-leg-raise',
  },
  backRaises: {
    id: 'back-raises',
    name: 'Back Raises',
    category: 'core',
    baseLift: null,
    defaultPercentage: null,
    muscleGroup: 'Back',
    libraryId: 'back-raises',
  },
  hyperextensions: {
    id: 'hyperextensions',
    name: 'Hyperextensions',
    category: 'core',
    baseLift: null,
    defaultPercentage: null,
    muscleGroup: 'Back',
    libraryId: 'hyperextensions',
  },
  cableCrunch: {
    id: 'cable-crunch',
    name: 'Cable Crunch',
    category: 'core',
    baseLift: null,
    defaultPercentage: null,
    muscleGroup: 'Core',
    libraryId: 'cable-crunch',
  },
};

// Get library ID for an accessory
export function getLibraryIdForAccessory(accessoryId: string): string | null {
  return ACCESSORIES[accessoryId]?.libraryId || null;
}

// Calculate target weight for an accessory
export function calculateAccessoryWeight(
  accessoryId: string,
  oneRMs: OneRMValues,
  addedWeight: number = 0
): number {
  const accessory = ACCESSORIES[accessoryId];
  if (!accessory) return 0;

  // Bodyweight exercise
  if (accessory.baseLift === null || accessory.defaultPercentage === null) {
    return addedWeight;
  }

  // Exercise with base lift percentage
  const baseLift1RM = oneRMs[accessory.baseLift];
  if (!baseLift1RM) return 0;

  const weight = baseLift1RM * accessory.defaultPercentage;
  return roundToPlate(weight);
}

// Parse reps - returns numeric value and original string
export interface ParsedReps {
  numericValue: number;
  rawString: string;
}

export function parseReps(reps: number | string): ParsedReps {
  if (typeof reps === 'number') {
    return { numericValue: reps, rawString: String(reps) };
  }

  // Match patterns like "30sec", "45 sec", "50-100 reps total"
  const timeMatch = reps.match(/(\d+)\s*sec/);
  if (timeMatch) {
    return {
      numericValue: parseInt(timeMatch[1]),
      rawString: reps
    };
  }

  // Default: return 0 as numeric, original string for display
  return { numericValue: 0, rawString: reps };
}

// Generate workout accessories for a program
export function generateWorkoutAccessories(
  accessories: ProgramAccessory[],
  oneRMs: OneRMValues
): WorkoutAccessory[] {
  return accessories.map(acc => {
    const def = ACCESSORIES[acc.accessoryId];
    if (!def) {
      throw new Error(`Unknown accessory: ${acc.accessoryId}`);
    }

    return {
      accessoryId: acc.accessoryId,
      name: def.name,
      libraryId: def.libraryId,
      muscleGroup: def.muscleGroup,
      sets: acc.sets,
      reps: acc.reps,
      targetWeight: calculateAccessoryWeight(acc.accessoryId, oneRMs),
      addedWeight: 0,  // Default, user can adjust
      isRequired: acc.isRequired,
    };
  });
}
```

---

## 4. Per-Program Accessory Configurations

### 4.1 StrongLifts 5x5

```typescript
// src/lib/programs/stronglifts.ts

export const strongliftsAccessories: ProgramAccessory[] = [
  // Day A (Session 1, 3, 5...)
  { accessoryId: 'pullups', sets: 3, reps: 8, isRequired: false },
  { accessoryId: 'dips', sets: 3, reps: 8, isRequired: false },
  { accessoryId: 'skullcrushers', sets: 3, reps: 8, isRequired: false },
  // Day B (Session 2, 4, 6...)
  { accessoryId: 'barbell-curl', sets: 3, reps: 8, isRequired: false },
];

export function getStrongliftsAccessories(week: number, session: number): ProgramAccessory[] {
  const isDayA = session % 2 === 1;
  return strongliftsAccessories.filter(acc => {
    if (isDayA) {
      return ['pullups', 'dips', 'skullcrushers'].includes(acc.accessoryId);
    }
    return ['barbell-curl'].includes(acc.accessoryId);
  });
}
```

### 4.2 5/3/1 (Wendler)

```typescript
// src/lib/programs/wendler531.ts

export function getWendlerAccessories(week: number, session: number): ProgramAccessory[] {
  const dayIndex = (session - 1) % 4;

  const pushAccessories: ProgramAccessory[] = [
    { accessoryId: 'dips', sets: 3, reps: '50-100 reps total', isRequired: true },
    { accessoryId: 'pushups', sets: 4, reps: 15, isRequired: true },
  ];

  const pullAccessories: ProgramAccessory[] = [
    { accessoryId: 'pullups', sets: 3, reps: '50-100 reps total', isRequired: true },
    { accessoryId: 'rows', sets: 3, reps: 10, isRequired: true },
  ];

  const coreAccessories: ProgramAccessory[] = [
    { accessoryId: 'planks', sets: 3, reps: '45sec', isRequired: true },
    { accessoryId: 'lunges', sets: 3, reps: 12, isRequired: true },
  ];

  // Day 1: Squat (Push + Core)
  if (dayIndex === 0) return [...pushAccessories, ...coreAccessories];
  // Day 2: Bench (Push + Pull)
  if (dayIndex === 1) return [...pushAccessories, ...pullAccessories];
  // Day 3: Deadlift (Pull + Core)
  if (dayIndex === 2) return [...pullAccessories, ...coreAccessories];
  // Day 4: OHP (Push + Pull + Core)
  return [...pushAccessories, ...pullAccessories, ...coreAccessories];
}
```

### 4.3 Candito 6 Week

```typescript
// src/lib/programs/candito.ts

export const canditoAccessories: ProgramAccessory[] = [
  // Required - every upper day (Days 1 & 2)
  { accessoryId: 'dumbbell-row', sets: 3, reps: '6-12', isRequired: true },
  { accessoryId: 'dumbbell-ohp', sets: 3, reps: '6-12', isRequired: true },
  { accessoryId: 'weighted-pullups', sets: 3, reps: '6-12', isRequired: true },
  { accessoryId: 'romanian-dl', sets: 3, reps: 8, isRequired: true },
];

export function getCanditoAccessories(week: number, session: number): ProgramAccessory[] {
  const dayIndex = (session - 1) % 4;
  // Only apply to upper body days (1 and 2)
  if (dayIndex > 1) return [];
  return canditoAccessories;
}
```

### 4.4 nSuns LP

```typescript
// src/lib/programs/nsuns.ts

// Required back work (all 3 required per program philosophy)
export const nsunsRequiredAccessories: ProgramAccessory[] = [
  { accessoryId: 'rows', sets: 3, reps: '8-12', isRequired: true },
  { accessoryId: 'pullups', sets: 3, reps: 'AMRAP', isRequired: true },
  { accessoryId: 'face-pulls', sets: 3, reps: '15-20', isRequired: true },
];

// Suggested accessories per day
export const nsunsSuggestedAccessories: Record<number, ProgramAccessory[]> = {
  1: [  // Bench/OHP day
    { accessoryId: 'tricep-pushdowns', sets: 3, reps: '8-12', isRequired: false },
    { accessoryId: 'lateral-raises', sets: 3, reps: '12-15', isRequired: false },
  ],
  2: [  // Squat/Sumo DL day
    { accessoryId: 'romanian-dl', sets: 3, reps: '5-8', isRequired: false },
    { accessoryId: 'leg-extensions', sets: 3, reps: '12-15', isRequired: false },
  ],
  3: [  // OHP/Incline day
    { accessoryId: 'dumbbell-row', sets: 3, reps: '8-12', isRequired: false },
    { accessoryId: 'skullcrushers', sets: 3, reps: '8-12', isRequired: false },
  ],
  4: [  // Deadlift/Front Squat day
    { accessoryId: 'leg-curls', sets: 3, reps: '12-15', isRequired: false },
  ],
};

export function getNsunsAccessories(week: number, session: number): ProgramAccessory[] {
  const dayIndex = ((session - 1) % 4) + 1;
  const required = nsunsRequiredAccessories;
  const suggested = nsunsSuggestedAccessories[dayIndex] || [];
  return [...required, ...suggested];
}
```

### 4.5 Madcow 5x5

```typescript
// src/lib/programs/madcow.ts

export const madcowAccessories: ProgramAccessory[] = [
  // Day A
  { accessoryId: 'dips', sets: 3, reps: 8, isRequired: false },
  { accessoryId: 'hyperextensions', sets: 2, reps: '10-12', isRequired: false },
  // Day B
  { accessoryId: 'pullups', sets: 3, reps: 8, isRequired: false },
  { accessoryId: 'planks', sets: 3, reps: '30sec', isRequired: false },
  // Day C
  { accessoryId: 'barbell-curl', sets: 3, reps: 8, isRequired: false },
  { accessoryId: 'skullcrushers', sets: 3, reps: 8, isRequired: false },
];

export function getMadcowAccessories(week: number, session: number): ProgramAccessory[] {
  const dayIndex = (session - 1) % 3;
  if (dayIndex === 0) {
    return madcowAccessories.filter(a => ['dips', 'hyperextensions'].includes(a.accessoryId));
  }
  if (dayIndex === 1) {
    return madcowAccessories.filter(a => ['pullups', 'planks'].includes(a.accessoryId));
  }
  return madcowAccessories.filter(a => ['barbell-curl', 'skullcrushers'].includes(a.accessoryId));
}
```

### 4.6 Sheiko

```typescript
// src/lib/programs/sheiko.ts

export const sheikoAccessories: ProgramAccessory[] = [
  // GPP work - optional but recommended
  { accessoryId: 'pullups', sets: 4, reps: '8-12', isRequired: false },
  { accessoryId: 'dumbbell-row', sets: 3, reps: '8-12', isRequired: false },
  { accessoryId: 'dumbbell-curl', sets: 3, reps: '8-12', isRequired: false },
  { accessoryId: 'planks', sets: 3, reps: '30sec', isRequired: false },
  { accessoryId: 'face-pulls', sets: 3, reps: '15-20', isRequired: false },
];

export function getSheikoAccessories(week: number, session: number): ProgramAccessory[] {
  // Sheiko typically has 4 sessions per week
  return sheikoAccessories;
}
```

### 4.7 Greg Nuckols 28 Programs

```typescript
// src/lib/programs/nuckols.ts

// No prescribed accessories - provide suggested list for user selection
export const nuckolsSuggestedAccessories: ProgramAccessory[] = [
  // Push
  { accessoryId: 'dips', sets: 3, reps: '8-12', isRequired: false },
  { accessoryId: 'pushups', sets: 3, reps: '15-20', isRequired: false },
  { accessoryId: 'tricep-pushdowns', sets: 3, reps: '10-15', isRequired: false },
  // Pull
  { accessoryId: 'pullups', sets: 3, reps: 'AMRAP', isRequired: false },
  { accessoryId: 'rows', sets: 3, reps: '8-12', isRequired: false },
  { accessoryId: 'face-pulls', sets: 3, reps: '15-20', isRequired: false },
  // Legs
  { accessoryId: 'romanian-dl', sets: 3, reps: '8-12', isRequired: false },
  { accessoryId: 'leg-curls', sets: 3, reps: '10-15', isRequired: false },
  { accessoryId: 'leg-extensions', sets: 3, reps: '10-15', isRequired: false },
  // Core
  { accessoryId: 'planks', sets: 3, reps: '30-60sec', isRequired: false },
  { accessoryId: 'hanging-leg-raises', sets: 3, reps: '10-15', isRequired: false },
];

export function getNuckolsAccessories(week: number, session: number): ProgramAccessory[] {
  // Nuckols programs don't prescribe accessories
  // Return empty array - user will select manually
  return [];
}
```

---

## 5. Program Workout Generation Updates

### 5.1 Updated `generateWorkouts` Function

```typescript
// In each program file (e.g., wendler531.ts)

import { generateWorkoutAccessories } from './accessory-data';
import { wendler531, type ProgramConfig } from './types';

export function generateWorkouts(oneRMs: OneRMValues): ProgramWorkout[] {
  const workouts: ProgramWorkout[] = [];
  // ... existing main lift generation ...

  // Add accessories to each workout
  for (const workout of workouts) {
    const accessories = getWendlerAccessories(workout.weekNumber, workout.sessionNumber);
    if (accessories.length > 0) {
      workout.accessories = generateWorkoutAccessories(accessories, oneRMs);
    }
  }

  return workouts;
}
```

### 5.2 Updated ProgramConfig Interface

```typescript
// In types.ts - ensure ProgramConfig has optional getAccessories
export interface ProgramConfig {
  info: ProgramInfo;
  generateWorkouts(oneRMs: OneRMValues): ProgramWorkout[];
  calculateTargetWeight(estimatedOneRM: number, week: number, session: number, lift: LiftType): number;
  getAccessories?(week: number, session: number): ProgramAccessory[];  // NEW - optional
}
```

---

## 6. Template Creation Integration

### 6.1 Updated `api/program-cycles.ts`

```typescript
import { parseReps, getLibraryIdForAccessory } from '../programs/accessory-data';

async function createAccessoryTemplates(
  db: D1Database,
  cycleId: string,
  cycleName: string,
  workouts: (ProgramWorkout & { accessories?: WorkoutAccessory[] })[],
  workosId: string
) {
  for (const workout of workouts) {
    if (!workout.accessories?.length) continue;

    // Add accessories to the same template as main lifts
    // The template already exists - we just need to add accessory exercises to it

    // Get the template for this workout (already created in main loop)
    const template = await getTemplateByWorkoutInfo(db, cycleId, workout.weekNumber, workout.sessionNumber);
    if (!template) continue;

    // Get current max orderIndex
    const existingExercises = await getTemplateExercises(db, template.id, workosId);
    let orderIndex = existingExercises.length;

    for (const accessory of workout.accessories) {
      // Find or create exercise
      let exercise = await findOrCreateExercise(db, workosId, accessory);

      // Parse reps
      const parsedReps = parseReps(accessory.reps);

      await addExerciseToTemplate(
        db, template.id, workosId, exercise.id, orderIndex,
        accessory.targetWeight,      // Calculated target weight
        accessory.addedWeight,       // Added weight (0 by default)
        accessory.sets,
        parsedReps.numericValue,     // Store numeric value
        parsedReps.rawString,        // Store raw string for display
        false,                       // isAmrap
        1,                           // setNumber
        true,                        // isAccessory
        accessory.isRequired         // isRequired
      );
      orderIndex++;
    }
  }
}

async function findOrCreateExercise(
  db: D1Database,
  workosId: string,
  accessory: WorkoutAccessory
): Promise<Exercise> {
  // First try to find by name
  const existing = await getExercisesByWorkosId(db, workosId, {
    search: accessory.name,
    limit: 1
  });

  const match = existing.find(e => e.name.toLowerCase() === accessory.name.toLowerCase());
  if (match) return match;

  // Try to find in exercise library by libraryId
  if (accessory.libraryId) {
    const libraryMatch = exerciseLibrary.find(e => e.id === accessory.libraryId);
    if (libraryMatch) {
      // Check if user already has this library exercise
      const libraryCopy = await getExercisesByWorkosId(db, workosId, {
        search: libraryMatch.name,
        limit: 1,
      });
      const existingCopy = libraryCopy.find(e =>
        e.libraryId === accessory.libraryId ||
        (e.name === libraryMatch.name && e.muscleGroup === libraryMatch.muscleGroup)
      );
      if (existingCopy) return existingCopy;

      // Copy from library
      return await copyExerciseFromLibrary(db, workosId, {
        name: libraryMatch.name,
        muscleGroup: libraryMatch.muscleGroup,
        description: libraryMatch.description,
      });
    }
  }

  // Create custom exercise
  return await createExercise(db, {
    workosId,
    name: accessory.name,
    muscleGroup: accessory.muscleGroup,
    description: '',
    libraryId: accessory.libraryId || undefined,
  });
}
```

### 6.2 Updated `addExerciseToTemplate` Function

Update `src/lib/db/template.ts`:

```typescript
export async function addExerciseToTemplate(
  db: D1Database,
  templateId: string,
  workosId: string,
  exerciseId: string,
  orderIndex: number,
  targetWeight?: number,
  addedWeight?: number,
  sets?: number,
  reps?: number,
  repsRaw?: string,
  isAmrap?: boolean,
  setNumber?: number,
  isAccessory?: boolean,
  isRequired?: boolean
): Promise<void> {
  const drizzleDb = createDb(db);

  await drizzleDb.insert(templateExercises).values({
    templateId,
    exerciseId,
    orderIndex,
    targetWeight,
    addedWeight: addedWeight ?? 0,
    sets,
    reps: reps ?? 0,
    repsRaw: repsRaw ?? null,
    isAmrap: isAmrap ? 1 : 0,
    setNumber,
    isAccessory: isAccessory ? 1 : 0,
    isRequired: isRequired !== false ? 1 : 0,
  }).run();
}
```

---

## 7. UI Components

### 7.1 Bodyweight Exercise with Added Weight

```tsx
// components/BodyweightExerciseRow.tsx
interface BodyweightExerciseProps {
  exercise: {
    name: string;
    sets: number;
    reps: number | string;
    targetWeight: number;
    addedWeight: number;
    isRequired: boolean;
  };
  unit: 'kg' | 'lb';
  onUpdateAddedWeight: (weight: number) => void;
}

export function BodyweightExerciseRow({
  exercise,
  unit,
  onUpdateAddedWeight
}: BodyweightExerciseProps) {
  const totalWeight = exercise.targetWeight + exercise.addedWeight;

  return (
    <div className="flex items-center gap-4 p-3 border rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{exercise.name}</span>
          {!exercise.isRequired && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              Optional
            </span>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {exercise.sets} × {typeof exercise.reps === 'string' ? exercise.reps : `${exercise.reps} reps`}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="text-sm text-muted-foreground">+</div>
        <input
          type="number"
          className="w-20 px-2 py-1 border rounded text-right"
          value={exercise.addedWeight || ''}
          onChange={(e) => onUpdateAddedWeight(parseFloat(e.target.value) || 0)}
          placeholder="0"
          min="0"
          step="2.5"
        />
        <div className="text-sm text-muted-foreground w-8">{unit}</div>
      </div>

      <div className="w-20 text-right font-mono font-medium">
        {totalWeight} {unit}
      </div>
    </div>
  );
}
```

### 7.2 Accessory Section in Workout Template

```tsx
// components/AccessorySection.tsx
interface AccessorySectionProps {
  accessories: WorkoutAccessory[];
  unit: 'kg' | 'lb';
  onUpdateAddedWeight: (accessoryId: string, weight: number) => void;
}

export function AccessorySection({
  accessories,
  unit,
  onUpdateAddedWeight
}: AccessorySectionProps) {
  const required = accessories.filter(a => a.isRequired);
  const optional = accessories.filter(a => !a.isRequired);

  return (
    <div className="space-y-4">
      {/* Required Accessories */}
      {required.length > 0 && (
        <div>
          <h3 className="font-medium mb-2 flex items-center gap-2">
            Required Accessories
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
              {required.length}
            </span>
          </h3>
          <div className="space-y-2">
            {required.map(accessory => (
              <BodyweightExerciseRow
                key={accessory.accessoryId}
                exercise={accessory}
                unit={unit}
                onUpdateAddedWeight={(w) => onUpdateAddedWeight(accessory.accessoryId, w)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Optional Accessories */}
      {optional.length > 0 && (
        <div>
          <h3 className="font-medium mb-2 flex items-center gap-2">
            Optional Accessories
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {optional.length}
            </span>
          </h3>
          <div className="space-y-2">
            {optional.map(accessory => (
              <BodyweightExerciseRow
                key={accessory.accessoryId}
                exercise={accessory}
                unit={unit}
                onUpdateAddedWeight={(w) => onUpdateAddedWeight(accessory.accessoryId, w)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

### 7.3 Template Editor Integration

Update `src/components/TemplateEditor.tsx` to:
1. Display accessories in a separate section
2. Show "Required" vs "Optional" badges
3. Allow editing addedWeight for bodyweight exercises
4. Handle special reps display (seconds, ranges)

---

## 8. Files to Create/Modify Summary

| File | Action | Description |
|------|--------|-------------|
| `src/lib/exercise-library.ts` | MODIFY | Add 15 new accessory exercises |
| `src/lib/db/schema.ts` | MODIFY | Add `addedWeight`, `repsRaw`, `isAccessory`, `isRequired` fields |
| `src/lib/db/template.ts` | MODIFY | Update `addExerciseToTemplate` for new fields + add `repsRaw` |
| `src/lib/programs/types.ts` | MODIFY | Add accessory types + extend ProgramWorkout |
| `src/lib/programs/accessory-data.ts` | CREATE | Centralized accessory definitions and helpers |
| `src/lib/programs/stronglifts.ts` | MODIFY | Add `getStrongliftsAccessories()` function |
| `src/lib/programs/wendler531.ts` | MODIFY | Add `getWendlerAccessories()` function |
| `src/lib/programs/madcow.ts` | MODIFY | Add `getMadcowAccessories()` function |
| `src/lib/programs/candito.ts` | MODIFY | Add `getCanditoAccessories()` function |
| `src/lib/programs/nsuns.ts` | MODIFY | Add `getNsunsAccessories()` function |
| `src/lib/programs/sheiko.ts` | MODIFY | Add `getSheikoAccessories()` function |
| `src/lib/programs/nuckols.ts` | MODIFY | Add suggested list + `getNuckolsAccessories()` |
| `src/routes/api/program-cycles.ts` | MODIFY | Include accessories in template creation |
| `src/components/TemplateEditor.tsx` | MODIFY | Add accessory section display |
| `src/components/BodyweightExerciseRow.tsx` | CREATE | Component for bodyweight + added weight |
| `src/components/AccessorySection.tsx` | CREATE | Section for required/optional accessories |

---

## 9. Implementation Steps

### Phase 1: Foundation
1. Add fields to `templateExercises` table in schema
2. Add accessory types to `types.ts`
3. Run database migration

### Phase 2: Data Layer
1. Add 15 exercises to `exercise-library.ts`
2. Create `accessory-data.ts` with all definitions and helpers

### Phase 3: Program Updates
1. Update each program file with `getXxxAccessories()` function
2. Update `generateWorkouts()` to include accessories

### Phase 4: Template Creation
1. Update `addExerciseToTemplate` to handle new fields
2. Update `api/program-cycles.ts` to add accessories to templates

### Phase 5: UI Components
1. Create `BodyweightExerciseRow.tsx`
2. Create `AccessorySection.tsx`
3. Update `TemplateEditor.tsx` to display accessories

### Phase 6: Testing
1. Test program creation with accessories
2. Test workout start
3. Test added weight functionality
4. Verify all programs generate correct accessories

---

## 10. Summary

This implementation adds accessory exercise support to all programs with:

- **Option B**: Accessories in same template as main lifts
- **15 new exercises** added to the library
- **Weighted bodyweight support** via `addedWeight` field (default 0)
- **Required vs Optional** indicators
- **Raw string rep display** for "50-100 reps", "30sec", etc.
- **nSuns**: Auto-adds rows + pullups + face-pulls (all required)

---

## Research Verification Status (Preserved)

| Program | Source | Verified | Date |
|---------|--------|----------|------|
| StrongLifts 5x5 | stronglifts.com | ✅ | Feb 2026 |
| Madcow 5x5 | stronglifts.com, hevyapp.com | ✅ | Feb 2026 |
| 5/3/1 (Wendler) | jimwendler.com, thefitness.wiki | ✅ | Feb 2026 |
| Candito 6 Week | canditotraininghq.com, liftvault.com, boostcamp.app | ✅ | Feb 2026 |
| nSuns LP | thefitness.wiki, r/nSuns | ✅ | Feb 2026 |
| Sheiko | sheikogold.com, simplifaster.com, powerliftingtowin.com | ✅ | Feb 2026 |
| Greg Nuckols 28 | strongerbyscience.com | ✅ | Feb 2026 |

---

## Last Updated

Date: February 2, 2026
Status: Implementation plan complete - ready for development
