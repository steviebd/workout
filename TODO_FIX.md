# UI/UX Fixes - Matching Example Design

This document outlines all differences between the current implementation and the `example/` reference design. Each item includes the exact changes needed to align the app with the slicker example UI.

**Reference Directory**: `/home/steven/workout/example/`
**Current Implementation**: `/home/steven/workout/src/`

---

## Table of Contents

1. [CSS Variables](#1-css-variables)
2. [Hardcoded Colors in Charts](#2-hardcoded-colors-in-charts)
3. [Hardcoded Colors in Routes](#3-hardcoded-colors-in-routes)
4. [Component Redesigns](#4-component-redesigns)
5. [Missing Features](#5-missing-features)
6. [Typography & Polish](#6-typography--polish)
7. [CSS Utilities](#7-css-utilities)

---

## 1. CSS Variables

**File**: `src/styles.css`
**Priority**: High
**Effort**: 5 minutes

### Issue
Two CSS variables have different values than the example, causing the UI to look less refined.

### Changes Required

```css
/* Line 18 - Change muted-foreground */
/* BEFORE */
--muted-foreground: oklch(0.72 0 0);

/* AFTER */
--muted-foreground: oklch(0.6 0 0);
```

```css
/* Line 27 - Change border */
/* BEFORE */
--border: oklch(0.35 0 0);

/* AFTER */
--border: oklch(0.25 0 0);
```

### Why
- `--muted-foreground`: Example uses darker (0.6) for more subtle secondary text
- `--border`: Example uses darker (0.25) for subtler, less prominent borders

---

## 2. Hardcoded Colors in Charts

**Priority**: High
**Effort**: 15 minutes

Charts currently use hardcoded hex colors instead of CSS variables, breaking theme consistency.

### 2.1 StrengthChart.tsx

**File**: `src/components/progress/StrengthChart.tsx`

#### Change 1: Icon color (Line 40)
```tsx
/* BEFORE */
<TrendingUp className="h-5 w-5 text-blue-500" />

/* AFTER */
<TrendingUp className="h-5 w-5 text-primary" />
```

#### Change 2: Chart stroke and dots (Lines 83-89)
```tsx
/* BEFORE */
<Line
  type="monotone"
  dataKey="weight"
  stroke="#3b82f6"
  strokeWidth={2}
  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
  activeDot={{ r: 6, fill: '#2563eb' }}
/>

/* AFTER */
<Line
  type="monotone"
  dataKey="weight"
  stroke="hsl(var(--primary))"
  strokeWidth={2}
  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
  activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
/>
```

#### Change 3: CartesianGrid stroke (Line 58)
```tsx
/* BEFORE */
<CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />

/* AFTER */
<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
```

#### Change 4: All axis ticks and lines
Replace all instances of `var(--xxx)` with `hsl(var(--xxx))` for proper color parsing:
- `fill: 'var(--muted-foreground)'` → `fill: 'hsl(var(--muted-foreground))'`
- `stroke: 'var(--border)'` → `stroke: 'hsl(var(--border))'`

#### Change 5: Tooltip contentStyle (Lines 73-79)
```tsx
/* BEFORE */
contentStyle={{
  backgroundColor: 'var(--card)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--foreground)',
}}

/* AFTER */
contentStyle={{
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  color: 'hsl(var(--foreground))',
}}
```

### 2.2 WeeklyVolumeChart.tsx

**File**: `src/components/progress/WeeklyVolumeChart.tsx`

#### Change 1: Icon color (Line 36)
```tsx
/* BEFORE */
<Dumbbell className="h-5 w-5 text-emerald-500" />

/* AFTER */
<Dumbbell className="h-5 w-5 text-accent" />
```

#### Change 2: Bar fill (Line 71-72)
```tsx
/* BEFORE */
<Bar
  dataKey="volume"
  fill="#10b981"
  radius={[4, 4, 0, 0]}
/>

/* AFTER */
<Bar
  dataKey="volume"
  fill="hsl(var(--accent))"
  radius={[4, 4, 0, 0]}
/>
```

#### Change 3: All var() → hsl(var())
Apply the same `hsl()` wrapper pattern as StrengthChart for:
- CartesianGrid stroke
- XAxis/YAxis tick fill, tickLine stroke, axisLine stroke
- Tooltip contentStyle

---

## 3. Hardcoded Colors in Routes

**Priority**: Medium
**Effort**: 10 minutes

### 3.1 history._index.tsx

**File**: `src/routes/history._index.tsx`

The stat cards use hardcoded Tailwind colors instead of theme tokens.

#### Lines 325-368: Stat card icons
```tsx
/* BEFORE */
<Trophy className="text-blue-600" size={16} />
<Calendar className="text-green-600" size={16} />
<Calendar className="text-purple-600" size={16} />
<Scale className="text-orange-600" size={16} />
<Dumbbell className="text-red-600" size={16} />

/* AFTER - Use theme chart colors for consistency */
<Trophy className="text-primary" size={16} />
<Calendar className="text-accent" size={16} />
<Calendar className="text-chart-5" size={16} />
<Scale className="text-chart-4" size={16} />
<Dumbbell className="text-destructive" size={16} />
```

**Alternative**: Use chart-1 through chart-5 for varied colors:
- `text-chart-1` (primary/orange)
- `text-chart-2` (accent/blue)
- `text-chart-3` (success/green)
- `text-chart-4` (warning/yellow)
- `text-chart-5` (purple)

---

## 4. Component Redesigns

### 4.1 ExerciseSelector - Convert Dropdown to Horizontal Pills

**File**: `src/components/progress/ExerciseSelector.tsx`
**Priority**: High
**Effort**: 20 minutes

#### Current Implementation
Uses a dropdown `<Select>` component - options are hidden until clicked.

#### Target Implementation
Horizontal scrolling pill buttons (like example) - all options visible and tappable.

#### Replace entire file with:
```tsx
'use client'

import { cn } from '~/lib/cn'

interface Exercise {
  id: string
  name: string
}

interface ExerciseSelectorProps {
  exercises: Exercise[]
  selectedId: string
  onSelect: (id: string) => void
}

export function ExerciseSelector({ exercises, selectedId, onSelect }: ExerciseSelectorProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {exercises.map((exercise) => (
        <button
          key={exercise.id}
          onClick={() => onSelect(exercise.id)}
          className={cn(
            'flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all',
            selectedId === exercise.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
          )}
        >
          {exercise.name}
        </button>
      ))}
    </div>
  )
}
```

**Reference**: `example/components/progress/exercise-selector.tsx`

---

### 4.2 VolumeSummary - Convert to Compact Gradient Card

**File**: `src/components/dashboard/VolumeSummary.tsx`
**Priority**: Medium
**Effort**: 25 minutes

#### Current Implementation
- Uses CardHeader + CardContent structure
- Plain Card background
- More verbose layout

#### Target Implementation
- Single CardContent
- Gradient background: `bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20`
- Compact inline layout

#### Replace entire file with:
```tsx
'use client'

import { Dumbbell, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '~/components/ui/Card'
import { useUnit } from '@/lib/context/UnitContext'

interface VolumeSummaryProps {
  totalVolume: number
  weeklyVolume: number
  volumeGoal: number
  volumeChange: number
}

export function VolumeSummary({ totalVolume, volumeGoal, volumeChange }: VolumeSummaryProps) {
  const { formatVolume } = useUnit()
  const remainingVolume = Math.max(0, volumeGoal - totalVolume)
  const progressPercent = Math.min((totalVolume / volumeGoal) * 100, 100)

  return (
    <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20">
              <Dumbbell className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Volume</p>
              <p className="text-2xl font-bold">{formatVolume(totalVolume)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-success/20 px-2.5 py-1 text-success">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">+{volumeChange}%</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {formatVolume(remainingVolume)} until {volumeGoal.toLocaleString()} Club badge
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
```

**Reference**: `example/components/dashboard/volume-summary.tsx`

---

### 4.3 RecentPRs - Add Header "View All" Link

**File**: `src/components/dashboard/RecentPRs.tsx`
**Priority**: Medium
**Effort**: 15 minutes

#### Changes Required

1. Add ChevronRight import
2. Change CardHeader to flex row with justify-between
3. Add "View All" link in header
4. Remove footer "View All PRs" button
5. Change icon from Trophy to TrendingUp in list items

```tsx
/* BEFORE - CardHeader (lines 25-29) */
<CardHeader className="pb-2">
  <CardTitle className="flex items-center gap-2 text-base">
    <Trophy className="h-5 w-5 text-chart-4" />
    Recent PRs
  </CardTitle>
</CardHeader>

/* AFTER */
<CardHeader className="flex flex-row items-center justify-between pb-2">
  <CardTitle className="flex items-center gap-2 text-base">
    <Trophy className="h-5 w-5 text-chart-4" />
    Recent PRs
  </CardTitle>
  <Link 
    to="/progress" 
    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
  >
    View All
    <ChevronRight className="h-3.5 w-3.5" />
  </Link>
</CardHeader>
```

```tsx
/* BEFORE - Icon in list item (line 39) */
<Trophy className="h-5 w-5 text-chart-4" />

/* AFTER */
<TrendingUp className="h-5 w-5 text-chart-4" />
```

```tsx
/* BEFORE - Remove footer link (lines 56-60) */
<Link to="/progress" className="block pt-2">
  <div className="flex items-center justify-center...">
    View All PRs
  </div>
</Link>

/* AFTER */
/* Delete this entire block */
```

**Reference**: `example/components/dashboard/recent-prs.tsx`

---

### 4.4 QuickActions - Add History Button

**File**: `src/components/dashboard/QuickActions.tsx`
**Priority**: Medium
**Effort**: 10 minutes

#### Changes Required

Add History import and second button in footer.

```tsx
/* Add to imports */
import { Play, Plus, Loader2, History } from 'lucide-react'
```

```tsx
/* BEFORE - Footer buttons (lines 108-115) */
<div className="flex gap-2 pt-2">
  <Button asChild={true} variant="outline" className="flex-1 bg-transparent">
    <a href="/workouts/new">
      <Plus className="mr-2 h-4 w-4" />
      New Workout
    </a>
  </Button>
</div>

/* AFTER */
<div className="flex gap-2 pt-2">
  <Button asChild={true} variant="outline" className="flex-1 bg-transparent">
    <a href="/workouts/new">
      <Plus className="mr-2 h-4 w-4" />
      New Workout
    </a>
  </Button>
  <Button asChild={true} variant="outline" className="flex-1 bg-transparent">
    <a href="/history">
      <History className="mr-2 h-4 w-4" />
      History
    </a>
  </Button>
</div>
```

**Reference**: `example/components/dashboard/quick-actions.tsx`

---

## 5. Missing Features

### 5.1 Achievements Page - Filter Not Functional

**File**: `src/routes/achievements.tsx`
**Priority**: Low
**Effort**: 20 minutes

#### Issue
The Tabs component is rendered but badge filtering is not implemented.

#### Changes Required
Add state management and filter logic:

```tsx
'use client'

import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
// ... other imports

type BadgeFilter = 'all' | 'unlocked' | 'locked'

function AchievementsPage() {
  const [filter, setFilter] = useState<BadgeFilter>('all')
  
  const filteredBadges = mockBadges.filter((badge) => {
    if (filter === 'unlocked') return badge.unlocked
    if (filter === 'locked') return !badge.unlocked
    return true
  })

  const unlockedCount = mockBadges.filter((b) => b.unlocked).length
  const totalCount = mockBadges.length

  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Achievements</h1>
        <p className="text-muted-foreground">
          {unlockedCount} of {totalCount} badges earned
        </p>
      </div>
      
      <StreakDisplay stats={mockStats} />
      
      {/* Replace Tabs with filter buttons */}
      <div className="mt-6 mb-4 flex gap-2">
        {(['all', 'unlocked', 'locked'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition-all',
              filter === f
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground'
            )}
          >
            {f === 'all' ? `All (${totalCount})` : 
             f === 'unlocked' ? `Unlocked (${unlockedCount})` : 
             `Locked (${totalCount - unlockedCount})`}
          </button>
        ))}
      </div>
      
      <div className="grid gap-3">
        {filteredBadges.map((badge) => (
          <BadgeCard key={badge.id} badge={badge} />
        ))}
      </div>
    </main>
  )
}
```

**Reference**: `example/app/achievements/page.tsx`

---

## 6. Typography & Polish

### 6.1 Add Antialiased Text Rendering

**File**: `src/routes/__root.tsx`
**Priority**: Low
**Effort**: 2 minutes

#### Change (Line 70)
```tsx
/* BEFORE */
<body className={'min-h-screen bg-background'}>

/* AFTER */
<body className={'min-h-screen bg-background font-sans antialiased'}>
```

---

## 7. CSS Utilities

### 7.1 Add Scrollbar Hide Utility

**File**: `src/styles.css`
**Priority**: Medium (required for ExerciseSelector fix)
**Effort**: 2 minutes

#### Add at end of file:
```css
/* Hide scrollbar for horizontal scroll containers */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
```

---

## Implementation Checklist

### Phase 1: Quick Wins (30 min total)
- [ ] Fix CSS variables in `src/styles.css`
- [ ] Add `antialiased` to body class
- [ ] Add `scrollbar-hide` CSS utility

### Phase 2: Chart Colors (30 min total)
- [ ] Fix StrengthChart.tsx hardcoded colors
- [ ] Fix WeeklyVolumeChart.tsx hardcoded colors
- [ ] Fix history._index.tsx icon colors

### Phase 3: Component Updates (1.5 hr total)
- [ ] Redesign ExerciseSelector (dropdown → pills)
- [ ] Redesign VolumeSummary (compact gradient)
- [ ] Update RecentPRs (header link)
- [ ] Update QuickActions (add History button)

### Phase 4: Polish (30 min total)
- [ ] Implement Achievements filter functionality
- [ ] Review and test all changes on mobile

---

## Testing Checklist

After implementing changes, verify:

1. **Theme Consistency**
   - [ ] All chart colors match theme (orange primary, blue accent)
   - [ ] No hardcoded hex colors visible
   - [ ] Borders and muted text appear subtle

2. **Component Functionality**
   - [ ] ExerciseSelector scrolls horizontally on mobile
   - [ ] VolumeSummary progress bar animates
   - [ ] QuickActions History button navigates correctly
   - [ ] Achievements filter buttons work

3. **Visual Regression**
   - [ ] Compare dashboard side-by-side with example
   - [ ] Compare progress page with example
   - [ ] Compare achievements page with example

---

## Reference Files

| Component | Example File | Current File |
|-----------|--------------|--------------|
| CSS Variables | `example/app/globals.css` | `src/styles.css` |
| StrengthChart | `example/components/progress/strength-chart.tsx` | `src/components/progress/StrengthChart.tsx` |
| WeeklyVolumeChart | `example/components/progress/weekly-volume-chart.tsx` | `src/components/progress/WeeklyVolumeChart.tsx` |
| ExerciseSelector | `example/components/progress/exercise-selector.tsx` | `src/components/progress/ExerciseSelector.tsx` |
| VolumeSummary | `example/components/dashboard/volume-summary.tsx` | `src/components/dashboard/VolumeSummary.tsx` |
| RecentPRs | `example/components/dashboard/recent-prs.tsx` | `src/components/dashboard/RecentPRs.tsx` |
| QuickActions | `example/components/dashboard/quick-actions.tsx` | `src/components/dashboard/QuickActions.tsx` |
| Achievements | `example/app/achievements/page.tsx` | `src/routes/achievements.tsx` |
