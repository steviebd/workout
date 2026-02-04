# UI/UX Improvement Plan

**Theme:** Warm (light mode) / Cool (dark mode) | **Style:** Modern Mobile-First

---

## Phase 1: Color System Overhaul
**Status:** ✅ Done - Warm coral/salmon (light), Cool purple/lavender (dark)

**Light Theme (Warm)**
- `--primary`: Warm coral/salmon `oklch(0.72 0.18 25)`
- `--background`: Warm off-white `oklch(0.985 0.015 30)`
- `--accent`: Warm orange `oklch(0.65 0.2 30)`

**Dark Theme (Cool)**
- `--primary`: Cool purple/lavender `oklch(0.7 0.2 265)`
- `--background`: Cool dark `oklch(0.08 0.02 260)`
- `--accent`: Cool accent `oklch(0.65 0.18 260)`

**Files:**
- `src/styles.css`

---

## Phase 2: Card Redesign
**Status:** ✅ Done - rounded-2xl, border-0, shadow-sm, updated padding

## Phase 3: Header Redesign
**Status:** ✅ Done - backdrop blur, gradient logo, shadow-sm

## Phase 4: Bottom Navigation Redesign
**Status:** ✅ Done - floating pill design, backdrop blur-xl, active gradient

## Phase 5: Button & Input Redesign
**Status:** ✅ Done - active:scale-[0.97], rounded-xl, borderless inputs

## Phase 6: Animation & Micro-interactions
**Status:** ✅ Done - spring animations, hover-lift utility, text-gradient

## Phase 7: Skeleton & Loading States
**Status:** ✅ Done - rounded-xl shapes, modern pulse animation

## Phase 8: Chart Visualization Polish
**Status:** ✅ Done - rounded tooltips, larger dots, thicker lines

## Phase 9: Empty States Polish
**Status:** ✅ Done - staggered animations, softer glow, tracking-tight

- Remove border, use shadow-sm instead
- Background: `bg-background/80 backdrop-blur-md`
- Logo container: `rounded-xl bg-primary/10`
- Title: Gradient text

**Files:**
- `src/components/Header.tsx`

---

## Phase 4: Bottom Navigation Redesign
**Status:** Pending

- Remove border, use `bg-card/80 backdrop-blur-xl`
- Change to floating pill design: `rounded-full`
- Gradient fill on active tab
- Center max-width for floating effect

**Files:**
- `src/components/BottomNav.tsx`

---

## Phase 5: Button & Input Redesign
**Status:** Pending

**Button:**
- Add `active:scale-[0.97]` variant
- Softer shadows

**Input:**
- Remove borders, use `bg-muted/50`
- Increase radius: `rounded-md` → `rounded-xl`
- Focus: shadow-md instead of ring

**Files:**
- `src/components/ui/Button.tsx`
- `src/components/ui/Input.tsx`

---

## Phase 6: Animation & Micro-interactions
**Status:** Pending

- Add spring easing: `cubic-bezier(0.34, 1.56, 0.64, 1)`
- Add hover-lift utility class
- Update all interactive elements with active scale
- Add text gradient animation

**Files:**
- `src/styles.css`
- Components using buttons/cards

---

## Phase 7: Skeleton & Loading States
**Status:** Pending

- Use brand-tinted pulse animation
- Add rounded-xl to skeleton shapes
- Staggered fade-in animations

**Files:**
- `src/components/ui/Skeleton.tsx`
- `src/components/ui/LoadingSkeleton.tsx`

---

## Phase 8: Chart Visualization Polish
**Status:** Pending

- Gradient fills on chart areas
- Theme colors for chart palette
- Animate drawing on load
- Larger touch targets

**Files:**
- `src/components/progress/StrengthChart.tsx`
- `src/components/progress/WeeklyVolumeChart.tsx`
- `src/components/progress/ExerciseHistoryChart.tsx`

---

## Phase 9: Empty States Polish
**Status:** Pending

- Add gradient text
- Staggered fade-in animations
- Subtle illustrations (optional)

**Files:**
- `src/components/ui/EmptyState.tsx`
- Various route files with empty states

---

## Verification

**Status:** ✅ Complete

- [x] Run `bun run typecheck` - Passed
- [x] Run `bun run lint` - Passed (fixed 1 pre-existing lint issue)
- [x] Run `bun run test` - 258 tests passed

---

## Progress Tracker

| Phase | Status | Notes |
|-------|--------|-------|
| 1. Color System | ✅ Done | Warm coral/salmon (light), Cool purple/lavender (dark) |
| 2. Card Redesign | ✅ Done | rounded-2xl, border-0, shadow-sm |
| 3. Header Redesign | ✅ Done | backdrop blur, gradient logo |
| 4. Bottom Nav | ✅ Done | floating pill design |
| 5. Button/Input | ✅ Done | active:scale, rounded-xl |
| 6. Animations | ✅ Done | spring, hover-lift utilities |
| 7. Skeleton States | ✅ Done | rounded-xl shapes |
| 8. Charts | ✅ Done | larger touch targets, polish |
| 9. Empty States | ✅ Done | staggered animations |
| Verification | ⏳ In Progress | - |

---

## Commands

```bash
# Type checking
bun run typecheck

# Linting
bun run lint

# Tests
bun run test
```
