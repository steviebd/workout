# Product Design Document: Simplified Exercise & Template Creation

## Executive Summary

This document outlines a redesign of the exercise and template creation workflow to reduce friction, consolidate pages, and provide a unified mobile-first experience.

---

## Problem Statement

**Current State:**
- Creating exercises and templates requires 3+ page navigations
- Exercise library exists but isn't integrated into template creation
- Modal-based exercise selection disrupts workflow
- No inline exercise creation during template building
- Separate pages for creating and editing templates
- Desktop-focused UI doesn't serve mobile users well
- Users must navigate to workout start after template creation

**User Pain Points:**
- Cognitive overhead from context switching between pages
- No quick way to add library exercises to templates
- Arrows for reordering are fiddly on mobile
- Extra steps to go from template → workout

---

## Goals & Objectives

1. **Reduce Time-to-Workout**: Minimize steps from "I want to work out" → "doing workout"
2. **Mobile-First Design**: Optimize for touch interactions, one-handed use
3. **Unified Workflow**: Single page for exercise creation, template building, and workout start
4. **Library Integration**: Seamless access to 60+ pre-built exercises with fuzzy matching
5. **Consolidate Pages**: Merge create/edit template into one flexible route
6. **Auto-save**: Debounced save on blur for seamless editing
7. **Local Undo**: Ctrl+Z style undo within session

---

## Design Decisions (Final)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Both create & edit, consolidated | Reduces code duplication, consistent UX |
| Library additions | Hybrid + fuzzy match 70% | Balances convenience with customization |
| Reordering | Native HTML5 D&D | Zero dependencies, full control, mobile support |
| New exercise inline | All fields (name, muscle, description) | Full flexibility inline |
| Duplicate handling | Warning shown + fuzzy match | Prevents accidental duplicates, detects library matches |
| Design priority | Mobile-first | Most users access on phone at gym |
| Delete behavior | Remove from template only | Preserves exercise data, only breaks template link |
| Post-creation | Stay on page with "Start Workout" button | Allows review before starting workout |
| Auto-save | On blur (debounced) | Saves when user leaves field, not too aggressive |
| Migration | Remove old immediately | Cleaner codebase, no technical debt |
| Undo | Local undo (session-based) | Simple, familiar pattern |

---

## User Flow

### New Template Flow

```
1. User clicks "New Template" from /templates
   ↓
2. Single-page view loads with search, results, selected exercises
   ↓ (on Create)
3. Toast: "Template created!"
   ↓
4. User clicks "Start Workout"
   ↓
5. Navigates to /workouts/start/$templateId
```

### Edit Template Flow

```
1. User clicks "Edit" from template detail
   ↓
2. Same single-page view, pre-filled with existing data
3. Changes auto-save on blur (debounced)
4. User can add/remove/reorder/edit inline
5. Local undo available (Ctrl+Z / Undo button)
```

### Inline Exercise Edit

```
1. User clicks pencil icon on exercise in template
   ↓
2. Exercise expands to inline edit form (all fields)
   ↓ (on Save)
3. Toast: "Exercise updated"
4. Local undo available
```

---

## UI Components

### New Files to Create

| File | Purpose |
|------|---------|
| `src/components/ExerciseSearch.tsx` | Unified search with library + user exercises |
| `src/components/ExerciseList.tsx` | Draggable exercise list with remove + edit |
| `src/components/InlineEditExercise.tsx` | All-fields inline exercise editor |
| `src/components/UndoManager.tsx` | Local undo/redo state management |
| `src/components/ui/Collapsible.tsx` | Reusable collapsible sections |
| `src/components/ui/DuplicateWarning.tsx` | Toast/banner for duplicate attempts |
| `src/lib/fuzzy-match.ts` | Fuzzy matching logic (70% threshold) |
| `src/hooks/useAutoSave.ts` | Auto-save hook (on blur, debounced) |
| `src/hooks/useUndo.ts` | Local undo hook |

### Modified Files

| File | Changes |
|------|---------|
| `src/routes/templates.new.tsx` | Complete rewrite with new components |
| `src/routes/templates.$id.edit.tsx` | Refactor to reuse templates.new.tsx logic |
| `src/routes/templates._index.tsx` | Update "New" button link |
| `src/routes/templates.$id.tsx` | Update "Edit" button link |
| `src/lib/exercise-library.ts` | Export types, add fuzzy match helpers |
| `src/routes/api/exercises.ts` | Add `libraryId` field support |

### Removed Files

| File | Reason |
|------|--------|
| `src/routes/exercises.new.tsx` | Consolidated into template flow |

---

## Implementation Phases

## Phase 1: Foundation
**Duration:** 2 days
**Goal:** Core utilities and hooks

- [x] Create `src/lib/fuzzy-match.ts` - Fuzzy matching (70% threshold)
- [x] Create `src/components/ui/Collapsible.tsx` - Reusable collapsible
- [x] Create `src/hooks/useUndo.ts` - Local undo/redo hook
- [x] Update `/api/exercises` to accept `libraryId` field

## Phase 2: Search & List
**Duration:** 2 days
**Goal:** Exercise picker with drag-and-drop

- [x] Create `src/components/ExerciseSearch.tsx` - Unified search
- [x] Create `src/components/ExerciseList.tsx` - Native HTML5 D&D
- [x] Create `src/components/ui/DuplicateWarning.tsx` - Warning component
- [x] Update exercise library exports

## Phase 3: Inline Edit & Auto-save
**Duration:** 2 days
**Goal:** Edit exercises inline, auto-save

- [x] Create `src/components/InlineEditExercise.tsx` - All-fields editor
- [x] Create `src/hooks/useAutoSave.ts` - Auto-save on blur hook
- [ ] Integrate auto-save into template editor

## Phase 4: Route Integration
**Duration:** 2 days
**Goal:** Unified template creation/editing

- [ ] Create shared `TemplateEditor` component
- [ ] Refactor `src/routes/templates.new.tsx`
- [ ] Refactor `src/routes/templates.$id.edit.tsx`
- [ ] Update navigation links
- [ ] Remove `src/routes/exercises.new.tsx`

## Phase 5: Testing & Polish
**Duration:** 1 day
**Goal:** Quality assurance

- [x] Mobile touch testing
- [x] Cross-browser testing
- [x] Full test suite (253 tests passing)
- [x] Lint and typecheck
- [x] Performance review
- [x] Updated E2E tests for new workflow
- [x] Added inline exercise creation to exercises page

---

## Timeline Summary

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Foundation | 2 days | Pending |
| Phase 2: Search & List | 2 days | Pending |
| Phase 3: Inline Edit & Auto-save | 2 days | Pending |
| Phase 4: Route Integration | 2 days | Pending |
| Phase 5: Testing & Polish | 1 day | Pending |

**Total: 9 days**

---

## Fuzzy Matching Algorithm

File: `src/lib/fuzzy-match.ts`

```typescript
interface FuzzyMatchResult {
  score: number; // 0-1
  isMatch: boolean;
}

function calculateSimilarity(str1: string, str2: string): number {
  // Levenshtein distance based
  // Returns 0-1 where 1 is exact match
}

function matchLibraryExercise(
  name: string,
  muscleGroup: string
): LibraryExercise | null {
  // Calculate similarity for each library exercise
  // Return best match if score >= 0.70
}
```

---

## Auto-Save Implementation

File: `src/hooks/useAutoSave.ts`

```typescript
function useAutoSave<T>(
  data: T,
  onSave: (data: T) => Promise<void>,
  options: {
    delay: number; // default 1000ms
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  }
) {
  // Debounced save on blur
  // Show "Saving..." indicator while pending
  // Show "Saved" checkmark on success
}
```

---

## Local Undo Implementation

File: `src/hooks/useUndo.ts`

```typescript
interface UndoAction {
  id: string;
  description: string;
  before: unknown;
  after: unknown;
  timestamp: number;
}

function useUndo() {
  // Stores last 20 actions in memory
  // Ctrl+Z triggers undo
  // Undo button in header
}
```

---

## API Changes

### POST /api/exercises - Add libraryId field

```typescript
// Request body
{
  name: string;
  muscleGroup: string;
  description?: string;
  libraryId?: string; // NEW: link to library source
}
```

---

## Acceptance Criteria

### Core Flow
- [ ] User can create template + exercises in single page
- [ ] User can search and add library exercises directly
- [ ] Fuzzy matching detects similar exercises (70% threshold)
- [ ] User can create custom exercise inline (all fields)
- [ ] User can drag-and-drop to reorder exercises (mobile + desktop)
- [ ] Duplicate exercise shows warning dialog
- [ ] Template edit uses same simplified workflow

### Auto-save & Undo
- [ ] Changes save automatically on blur
- [ ] Save indicator shows pending/success state
- [ ] Undo button available and functional
- [ ] Ctrl+Z triggers undo
- [ ] Undo stack limited to 20 items

### Data Integrity
- [ ] Library ID linked when adding library exercises
- [ ] Fuzzy match prevents accidental duplicates
- [ ] Exercise delete removes from template only
- [ ] All existing templates still editable

### UX Quality
- [ ] Mobile-first layout works on small screens
- [ ] Touch targets meet accessibility guidelines
- [ ] Loading states for async operations
- [ ] Error messages are clear and actionable

---

## File Changes Summary

### New Files (10)
```
src/components/
├── ExerciseSearch.tsx
├── ExerciseList.tsx
├── InlineEditExercise.tsx
├── UndoManager.tsx
├── DuplicateWarning.tsx
└── ui/
    └── Collapsible.tsx

src/lib/
└── fuzzy-match.ts

src/hooks/
├── useAutoSave.ts
└── useUndo.ts
```

### Modified Files (6)
```
src/routes/templates.new.tsx
src/routes/templates.$id.edit.tsx
src/routes/templates._index.tsx
src/routes/templates.$id.tsx
src/lib/exercise-library.ts
src/routes/api/exercises.ts
```

### Removed Files (1)
```
src/routes/exercises.new.tsx
```

---

## Approved By

**Product Owner:** _________________  
**Date:** _________________
