# UI/UX Overhaul Plan

This document outlines a comprehensive plan to create a cohesive, modern, and accessible design system for the Fit Workout App.

---

## 1. Executive Summary

### Current Issues
- **Inconsistent color usage**: Pages use hardcoded colors (`text-accent`, `text-chart-4`, `text-chart-5`, `text-destructive`) inconsistently for similar elements
- **Mismatched theme colors**: Light mode uses warm coral/orange primary (`oklch(0.72 0.18 25)`), dark mode uses cool purple/violet (`oklch(0.7 0.2 265)`) - creates jarring theme switching
- **Inconsistent card styling**: Some cards have `p-4`, others `p-5`, some use `CardContent`, others apply padding directly
- **Inconsistent icon coloring**: Stats use random chart colors instead of semantic meaning
- **Button variant inconsistency**: Mix of inline styles and Button component variants
- **Page header inconsistency**: Some pages have action buttons, some don't, spacing varies
- **Empty state inconsistency**: Different patterns across pages
- **Bottom nav crowding**: 6 items makes touch targets small on mobile

---

## 2. Design System Foundation

### 2.1 Unified Color Palette

**Goal**: Create a consistent primary color that works in both light and dark modes. Keeping coral as primary for brand consistency.

```css
/* PROPOSED: Unified Primary - Coral */
:root, .light {
  --primary: oklch(0.65 0.18 25);              /* Coral */
  --primary-foreground: oklch(0.99 0 0);
  --accent: oklch(0.72 0.18 195);              /* Teal accent */
  --accent-foreground: oklch(0.99 0 0);
}

.dark {
  --primary: oklch(0.70 0.18 25);              /* Coral (slightly brighter for dark) */
  --primary-foreground: oklch(0.99 0 0);
  --accent: oklch(0.65 0.18 195);              /* Teal accent */
  --accent-foreground: oklch(0.99 0 0);
}
```

### 2.2 Semantic Color System

Create purpose-driven color tokens instead of generic chart colors:

| Token | Purpose | Current Usage | Proposed Value (Light/Dark) |
|-------|---------|---------------|----------------------------|
| `--color-workout` | Workout counts, sessions | Replace `chart-1`, `text-accent` | `oklch(0.65 0.18 25)` / `oklch(0.70 0.18 25)` |
| `--color-exercise` | Exercise-related elements | Replace `chart-2` | `oklch(0.65 0.18 195)` / `oklch(0.70 0.18 195)` |
| `--color-volume` | Volume/weight metrics | Replace `chart-3` | `oklch(0.65 0.18 280)` / `oklch(0.70 0.18 280)` |
| `--color-streak` | Streaks and consistency | Replace `chart-4` | `oklch(0.70 0.18 85)` / `oklch(0.75 0.18 85)` |
| `--color-achievement` | Badges and achievements | Replace `chart-5` | `oklch(0.65 0.20 320)` / `oklch(0.70 0.20 320)` |

**CSS Implementation:**
```css
:root, .light {
  --workout: oklch(0.65 0.18 25);
  --workout-foreground: oklch(0.99 0 0);
  --exercise: oklch(0.65 0.18 195);
  --exercise-foreground: oklch(0.99 0 0);
  --volume: oklch(0.65 0.18 280);
  --volume-foreground: oklch(0.99 0 0);
  --streak: oklch(0.70 0.18 85);
  --streak-foreground: oklch(0.15 0 0);
  --achievement: oklch(0.65 0.20 320);
  --achievement-foreground: oklch(0.99 0 0);
}

.dark {
  --workout: oklch(0.70 0.18 25);
  --workout-foreground: oklch(0.99 0 0);
  --exercise: oklch(0.70 0.18 195);
  --exercise-foreground: oklch(0.99 0 0);
  --volume: oklch(0.70 0.18 280);
  --volume-foreground: oklch(0.99 0 0);
  --streak: oklch(0.75 0.18 85);
  --streak-foreground: oklch(0.15 0 0);
  --achievement: oklch(0.70 0.20 320);
  --achievement-foreground: oklch(0.99 0 0);
}
```

**Tailwind Theme Extension:**
```css
@theme inline {
  --color-workout: var(--workout);
  --color-workout-foreground: var(--workout-foreground);
  --color-exercise: var(--exercise);
  --color-exercise-foreground: var(--exercise-foreground);
  --color-volume: var(--volume);
  --color-volume-foreground: var(--volume-foreground);
  --color-streak: var(--streak);
  --color-streak-foreground: var(--streak-foreground);
  --color-achievement: var(--achievement);
  --color-achievement-foreground: var(--achievement-foreground);
}
```

### 2.3 Spacing Scale

Standardize component spacing:

| Context | Value | Usage |
|---------|-------|-------|
| Card padding | `p-4` | All cards uniformly |
| Section gap | `space-y-6` | Between major sections |
| Item gap | `space-y-3` | Between list items |
| Page padding | `px-4 py-6` | All page containers |
| Header margin | `mb-6` | All page headers |

---

## 3. Component Standardization

### 3.1 Page Layout Pattern

Create a standard page structure using shadcn/ui Card component:

```tsx
// src/components/ui/PageLayout.tsx
import { Card } from '~/components/ui/card'
import { cn } from '~/lib/cn'

interface PageLayoutProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function PageLayout({
  title,
  subtitle,
  action,
  children,
  className
}: PageLayoutProps) {
  return (
    <main className={cn("mx-auto max-w-lg px-4 py-6 pb-24", className)}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </main>
  )
}
```

**Files to update**:
- [ ] `src/routes/index.tsx`
- [ ] `src/routes/workouts._index.tsx`
- [ ] `src/routes/exercises._index.tsx`
- [ ] `src/routes/templates._index.tsx`
- [ ] `src/routes/progress.tsx`
- [ ] `src/routes/achievements.tsx`
- [ ] `src/routes/history._index.tsx`
- [ ] `src/routes/programs._index.tsx`

### 3.2 Stat Card Component

Create a unified stat card using shadcn/ui Card:

```tsx
// src/components/ui/StatCard.tsx
import { Card } from '~/components/ui/card'
import { cn } from '~/lib/cn'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  variant?: 'default' | 'primary' | 'success' | 'warning'
  onClick?: () => void
  className?: string
}

export function StatCard({
  icon: Icon,
  label,
  value,
  variant = 'default',
  onClick,
  className
}: StatCardProps) {
  const variantStyles = {
    default: 'text-muted-foreground',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
  }

  return (
    <Card
      className={cn(
        "p-4",
        onClick && "hover:border-primary/50 hover:shadow-md cursor-pointer active:scale-95 transition-all",
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className={cn("h-4 w-4", variantStyles[variant])} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </Card>
  )
}
```

**Files to update**:
- [ ] `src/routes/history._index.tsx` - Replace manual stat cards
- [ ] `src/components/dashboard/DashboardWidgets.tsx`
- [ ] `src/components/dashboard/VolumeSummary.tsx`

### 3.3 Section Header Component

```tsx
// src/components/ui/SectionHeader.tsx
interface SectionHeaderProps {
  title: string
  action?: React.ReactNode
}

export function SectionHeader({ title, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      {action}
    </div>
  )
}
```

### 3.4 List Card Component

Standardize clickable list items with optional selection support using shadcn/ui Card:

```tsx
// src/components/ui/ListCard.tsx
import { Check, ChevronRight } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Card } from '~/components/ui/card'
import { cn } from '~/lib/cn'

interface ListCardProps {
  title: string
  subtitle?: string
  badge?: React.ReactNode
  meta?: React.ReactNode
  onClick?: () => void
  href?: string
  selected?: boolean
  selectable?: boolean
  onSelect?: () => void
  className?: string
}

export function ListCard({
  title,
  subtitle,
  badge,
  meta,
  onClick,
  href,
  selected = false,
  selectable = false,
  onSelect,
  className,
}: ListCardProps) {
  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect?.()
  }

  const content = (
    <Card
      className={cn(
        "p-4 hover:border-primary/50 transition-colors cursor-pointer touch-manipulation",
        selected && "border-primary bg-primary/5",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {selectable && (
          <button
            onClick={handleSelect}
            className={cn(
              "flex-shrink-0 mt-0.5 h-5 w-5 rounded border-2 transition-colors",
              selected
                ? "bg-primary border-primary text-primary-foreground"
                : "border-muted-foreground/30 hover:border-primary"
            )}
          >
            {selected && <Check className="h-3 w-3 m-auto" />}
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{title}</h3>
              {subtitle && <p className="text-sm text-muted-foreground line-clamp-2">{subtitle}</p>}
            </div>
            {badge}
          </div>
          {meta && (
            <div className="flex items-center justify-between pt-3 border-t border-border">
              {meta}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>
      </div>
    </Card>
  )

  if (href) {
    return <Link to={href}>{content}</Link>
  }

  return <div onClick={onClick}>{content}</div>
}
```

### 3.5 IconButton Component

```tsx
// src/components/ui/IconButton.tsx
import * as React from 'react'
import { cn } from '~/lib/cn'
import type { LucideIcon } from 'lucide-react'
import { Button } from '~/components/ui/button'

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon
  variant?: 'default' | 'ghost' | 'destructive' | 'primary'
  size?: 'sm' | 'md' | 'lg'
  label: string
}

export function IconButton({
  icon: Icon,
  variant = 'ghost',
  size = 'md',
  label,
  className,
  ...props
}: IconButtonProps) {
  const sizeStyles = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-10 w-10',
  }

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  const variantStyles = {
    default: 'text-muted-foreground hover:text-foreground hover:bg-secondary',
    ghost: 'text-muted-foreground hover:text-foreground hover:bg-accent',
    destructive: 'text-muted-foreground hover:text-destructive hover:bg-destructive/10',
    primary: 'text-muted-foreground hover:text-primary hover:bg-primary/10',
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        sizeStyles[size],
        variantStyles[variant],
        className
      )}
      title={label}
      aria-label={label}
      {...props}
    >
      <Icon className={iconSizes[size]} />
    </Button>
  )
}
```

### 3.6 FilterPills Component

```tsx
// src/components/ui/FilterPills.tsx
import { cn } from '~/lib/cn'

interface FilterOption<T extends string> {
  value: T
  label: string
  count?: number
}

interface FilterPillsProps<T extends string> {
  options: FilterOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

export function FilterPills<T extends string>({ 
  options, 
  value, 
  onChange,
  className 
}: FilterPillsProps<T>) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto scrollbar-hide pb-1", className)}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "whitespace-nowrap flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all active:scale-95",
            value === option.value
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
          {option.count !== undefined && ` (${option.count})`}
        </button>
      ))}
    </div>
  )
}
```

### 3.7 EmptyState Component

```tsx
// src/components/ui/EmptyState.tsx
import type { LucideIcon } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
  variant?: 'card' | 'inline'
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = 'card',
  className
}: EmptyStateProps) {
  const content = (
    <div className={cn("flex flex-col items-center text-center py-8 px-4", className)}>
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm max-w-xs mb-4">{description}</p>
      {action && (
        <Button onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )

  if (variant === 'card') {
    return <Card className="p-4">{content}</Card>
  }

  return content
}
```

### 3.8 DatePicker Component

```tsx
// src/components/ui/DatePicker.tsx
import { Calendar } from 'lucide-react'
import { Input } from '~/components/ui/input'
import { cn } from '~/lib/cn'

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  min?: string
  max?: string
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  className,
  min,
  max,
}: DatePickerProps) {
  return (
    <div className={cn("relative", className)}>
      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
        className="pl-10"
      />
    </div>
  )
}
```

---

## 4. Page-by-Page Updates

### 4.1 Dashboard (index.tsx)
- [x] Uses consistent Card styling ✓
- [ ] **Fix**: Greeting section could use PageLayout pattern
- [ ] **Fix**: Add consistent spacing with other pages

### 4.2 Workouts Page (workouts._index.tsx)
- [ ] **Fix**: Card hover states use `hover:border-primary/50` - keep this as standard
- [ ] **Fix**: Active Programs section icon uses `bg-primary/20` - standardize all section icons
- [ ] **Fix**: Use SectionHeader component

### 4.3 Exercises Page (exercises._index.tsx)
- [ ] **Fix**: Card uses `p-4` directly instead of CardContent
- [ ] **Fix**: Badge placement should be consistent with templates page
- [ ] **Fix**: Inline form styling should use form components

### 4.4 Templates Page (templates._index.tsx)
- [x] Uses CardContent properly ✓
- [ ] **Fix**: Copy button has delete icon tooltip - bug
- [ ] **Fix**: Action buttons should use IconButton component

### 4.5 Progress Page (progress.tsx)
- [ ] **Fix**: Uses generic Card for empty states - use EmptyState component
- [ ] **Fix**: Chart cards have inconsistent padding
- [ ] **Fix**: Section titles use different sizes

### 4.6 Achievements Page (achievements.tsx)
- [ ] **Fix**: Filter pills are custom styled - use ToggleGroup or Tabs component
- [ ] **Fix**: Grid gap should match other pages

### 4.7 History Page (history._index.tsx)
- [ ] **Fix**: Use PageLayout component
- [ ] **Fix**: Stat cards use hardcoded colors (`text-accent`, `text-chart-5`, etc.) - use StatCard with semantic variants
- [ ] **Fix**: Filter buttons are custom styled - use FilterPills component
- [ ] **Fix**: Date inputs should use DatePicker component
- [ ] **Fix**: Sort select is inline - group with filters better
- [ ] **Fix**: Replace hardcoded color classes:
  - `text-accent` → `text-workout`
  - `text-chart-5` → `text-achievement`
  - `text-chart-4` → `text-volume`
  - `text-destructive` (for sets) → `text-exercise`

### 4.8 Programs Page (programs._index.tsx)
- [ ] **Fix**: Use PageLayout component
- [ ] **Fix**: Ensure consistent card styling with other pages
- [ ] **Fix**: Use SectionHeader component

---

## 5. Navigation Improvements

### 5.1 Bottom Navigation Redesign

**Current state**: 6 items (Home, Workouts, Programs, Progress, Badges, History)

**Current issues**:
- 6 items is crowded on mobile (touch targets ~55px each on 375px screen)
- Labels add unnecessary height
- Icons could be more distinctive

**Proposed changes**:

**Option A: Reduce to 5 items** (Recommended)
- Remove History from nav, access via other pages
- Keep: Home, Workouts, Programs, Progress, Achievements

```tsx
// Proposed simplified nav (5 items)
const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/workouts', icon: Dumbbell, label: 'Workouts' },
  { href: '/programs', icon: FileText, label: 'Programs' },
  { href: '/progress', icon: TrendingUp, label: 'Progress' },
  { href: '/achievements', icon: Trophy, label: 'Badges' },
]

// History becomes accessible via:
// 1. Dashboard "Recent Workouts" section → "View All" link
// 2. Workouts page → "History" tab or section
```

### 5.2 Header Simplification

**Current issues**:
- Settings dropdown is complex
- Weekly target display takes space

**Proposed changes**:
- [ ] Move settings to a dedicated Settings page
- [ ] Simplify header to: Logo, Streak indicator, Theme toggle, Profile

---

## 6. Micro-interactions & Polish

### 6.1 Loading States
- [ ] Create skeleton variants for each page type
- [ ] Use consistent shimmer animation
- [ ] Add subtle entrance animations for content

### 6.2 Transitions
- [ ] Page transitions using View Transitions API
- [ ] Card hover/press states with consistent timing (200ms)
- [ ] Smooth accordion/collapsible animations

### 6.3 Feedback
- [ ] Haptic feedback on mobile for important actions
- [ ] Success confetti for achievements/PRs
- [ ] Pull-to-refresh visual indicator improvements

---

## 7. Accessibility Improvements

### 7.1 Color Contrast
- [ ] Audit all text colors against backgrounds
- [ ] Ensure 4.5:1 ratio for normal text
- [ ] Ensure 3:1 ratio for large text and icons

### 7.2 Focus States
- [ ] Visible focus rings on all interactive elements
- [ ] Skip navigation link
- [ ] Proper heading hierarchy (h1 → h2 → h3)

### 7.3 Touch Targets
- [ ] Minimum 44x44px touch targets
- [ ] Adequate spacing between interactive elements
- [ ] No nested clickable elements

---

## 8. Implementation Priority

### Phase 1: Foundation (Week 1)
1. [ ] Unify primary color across light/dark modes in `styles.css`
2. [ ] Add semantic color tokens (workout, exercise, volume, streak, achievement)
3. [ ] Create `PageLayout` component (Section 3.1)
4. [ ] Create `StatCard` component (Section 3.2)
5. [ ] Create `SectionHeader` component (Section 3.3)
6. [ ] Create `ListCard` component (Section 3.4)
7. [ ] Create `IconButton` component (Section 3.5)
8. [ ] Create `FilterPills` component (Section 3.6)
9. [ ] Update/consolidate `EmptyState` component (Section 3.7)
10. [ ] Update/consolidate `DatePicker` component (Section 3.8)

### Phase 2: Component Migration (Week 2)
1. [ ] Update Dashboard (`src/routes/index.tsx`) to use PageLayout
2. [ ] Update Workouts page (`src/routes/workouts._index.tsx`) - SectionHeader
3. [ ] Update Exercises page (`src/routes/exercises._index.tsx`) - PageLayout, cards
4. [ ] Update Templates page (`src/routes/templates._index.tsx`) - IconButton
5. [ ] Update Progress page (`src/routes/progress.tsx`) - EmptyState, sections
6. [ ] Update Achievements page (`src/routes/achievements.tsx`) - FilterPills
7. [ ] Update History page (`src/routes/history._index.tsx`) - StatCard, FilterPills, DatePicker
8. [ ] Update Programs page (`src/routes/programs._index.tsx`) - PageLayout

### Phase 3: Navigation & Polish (Week 3)
1. [ ] Redesign Bottom Navigation (reduce to 5 items)
2. [ ] Simplify Header (move settings to dedicated page)
3. [ ] Add page transitions using View Transitions API
4. [ ] Improve loading skeletons with consistent shimmer
5. [ ] Migrate all hardcoded colors to semantic tokens

### Phase 4: Final Polish (Week 4)
1. [ ] Accessibility audit (color contrast, focus states, touch targets)
2. [ ] Cross-browser testing (Safari, Chrome, Firefox)
3. [ ] Mobile device testing (iOS, Android)
4. [ ] Performance optimization
5. [ ] Documentation update

---

## 9. Files to Modify

### Core Styles
- [ ] `src/styles.css` - Color palette unification + semantic color tokens

### New Components to Create
- [ ] `src/components/ui/PageLayout.tsx` (Section 3.1)
- [ ] `src/components/ui/StatCard.tsx` (Section 3.2)
- [ ] `src/components/ui/SectionHeader.tsx` (Section 3.3)
- [ ] `src/components/ui/ListCard.tsx` (Section 3.4)
- [ ] `src/components/ui/IconButton.tsx` (Section 3.5)
- [ ] `src/components/ui/FilterPills.tsx` (Section 3.6)
- [ ] `src/components/ui/EmptyState.tsx` (Section 3.7) - Enhance existing `src/components/ui/EmptyState.tsx`
- [ ] `src/components/ui/DatePicker.tsx` (Section 3.8) - Enhance existing `src/components/ui/DatePicker.tsx`

### Components to Update
- [ ] `src/components/BottomNav.tsx` - Reduce to 5 items
- [ ] `src/components/Header.tsx` - Simplification
- [ ] `src/components/dashboard/DashboardWidgets.tsx` - StatCard usage
- [ ] `src/components/dashboard/VolumeSummary.tsx` - StatCard usage
- [ ] `src/components/dashboard/StreakCard.tsx` - Semantic colors
- [ ] `src/components/achievements/BadgeCard.tsx` - Semantic colors
- [ ] `src/components/achievements/StreakDisplay.tsx` - Semantic colors
- [ ] `src/components/progress/StrengthChart.tsx` - Semantic colors
- [ ] `src/components/progress/WeeklyVolumeChart.tsx` - Semantic colors
- [ ] `src/components/progress/PRBoard.tsx` - Semantic colors

### Pages to Update
- [ ] `src/routes/index.tsx` - PageLayout, consistent spacing
- [ ] `src/routes/workouts._index.tsx` - SectionHeader, consistent cards
- [ ] `src/routes/exercises._index.tsx` - PageLayout, CardContent consistency
- [ ] `src/routes/templates._index.tsx` - IconButton for actions
- [ ] `src/routes/progress.tsx` - EmptyState component, section titles
- [ ] `src/routes/achievements.tsx` - FilterPills, PageLayout
- [ ] `src/routes/history._index.tsx` - StatCard, FilterPills, DatePicker, semantic colors
- [ ] `src/routes/programs._index.tsx` - PageLayout, SectionHeader

---

## 10. Design Mockup References

### Color Palette Visual

```
Light Mode:
┌─────────────────────────────────────────────┐
│ Background: Warm cream     (#faf8f5)        │
│ Primary:    Teal           (#0891b2)        │
│ Accent:     Coral          (#f97316)        │
│ Success:    Green          (#22c55e)        │
│ Warning:    Amber          (#f59e0b)        │
│ Destructive: Red           (#ef4444)        │
└─────────────────────────────────────────────┘

Dark Mode:
┌─────────────────────────────────────────────┐
│ Background: Deep slate     (#0f172a)        │
│ Primary:    Bright teal    (#22d3ee)        │
│ Accent:     Coral          (#fb923c)        │
│ Success:    Green          (#4ade80)        │
│ Warning:    Amber          (#fbbf24)        │
│ Destructive: Red           (#f87171)        │
└─────────────────────────────────────────────┘
```

### Spacing System Visual

```
Page Structure:
┌──────────────────────────────────┐
│ px-4 py-6                        │
│  ┌────────────────────────────┐  │
│  │ Header (mb-6)              │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Section 1 (mb-6)           │  │
│  │  ┌──────────────────────┐  │  │
│  │  │ Card (p-4)           │  │  │
│  │  └──────────────────────┘  │  │
│  │  gap-3                     │  │
│  │  ┌──────────────────────┐  │  │
│  │  │ Card (p-4)           │  │  │
│  │  └──────────────────────┘  │  │
│  └────────────────────────────┘  │
│  ┌────────────────────────────┐  │
│  │ Section 2 (mb-6)           │  │
│  └────────────────────────────┘  │
│ pb-24 (for bottom nav)           │
└──────────────────────────────────┘
```

---

## 11. TypeScript Exports

Add all new components to the ui index file for convenient imports:

```ts
// src/components/ui/index.ts
export { PageLayout } from './PageLayout'
export { StatCard } from './StatCard'
export { SectionHeader } from './SectionHeader'
export { ListCard } from './ListCard'
export { IconButton } from './IconButton'
export { FilterPills } from './FilterPills'
export { EmptyState } from './EmptyState'
export { DatePicker } from './DatePicker'
```

---

## 12. Success Metrics

After implementation, measure:

1. **Visual Consistency Score**: Manual audit of color usage across pages
2. **Theme Switch Test**: No jarring color changes between light/dark
3. **Touch Target Compliance**: 100% of interactive elements ≥44px
4. **Lighthouse Accessibility Score**: Target ≥95
5. **User Feedback**: Qualitative assessment of visual polish

---

## 13. Color Migration Guide

Use this reference when replacing hardcoded colors with semantic tokens:

### Icon Colors in Stats
| Current | Semantic Replacement | Context |
|---------|---------------------|---------|
| `text-primary` | `text-primary` | Keep for primary actions |
| `text-accent` | `text-workout` | Workout counts, "This Week" |
| `text-chart-1` | `text-workout` | Workout-related charts |
| `text-chart-2` | `text-exercise` | Exercise-related elements |
| `text-chart-3` | `text-success` | Keep for positive values |
| `text-chart-4` | `text-volume` | Volume, weight metrics |
| `text-chart-5` | `text-achievement` | Badges, "This Month", trophies |
| `text-destructive` | `text-destructive` | Keep for delete/danger actions only |

### Background Colors
| Current | Semantic Replacement | Context |
|---------|---------------------|---------|
| `bg-primary/20` | `bg-primary/20` | Keep for primary element backgrounds |
| `bg-accent/20` | `bg-workout/20` | Workout-related backgrounds |
| `bg-chart-4/20` | `bg-volume/20` | Volume-related backgrounds |
| `bg-chart-5/20` | `bg-achievement/20` | Achievement-related backgrounds |
| `bg-success/20` | `bg-success/20` | Keep for success states |

### Files with Hardcoded Colors to Fix

1. **`src/routes/history._index.tsx`** (Lines 375-414)
   - `text-accent` → `text-workout` (This Week stat)
   - `text-chart-5` → `text-achievement` (This Month stat)
   - `text-chart-4` → `text-volume` (Total Volume stat)
   - `text-destructive` → `text-exercise` (Total Sets stat)

2. **`src/components/achievements/BadgeCard.tsx`** (Lines 21-33)
   - `text-chart-4` → `text-volume`
   - Uses `categoryColors` map - update values

3. **`src/components/dashboard/StreakCard.tsx`** (Line 80)
   - `text-chart-5` → `text-achievement` (Trophy icon)

---

## 14. Notes

- Keep existing functionality intact during refactor
- Test on iOS Safari, Android Chrome, Desktop Chrome/Firefox
- All new components extend shadcn/ui base components (`Card`, `Button`, `Input`)
- Existing EmptyState and DatePicker components - enhance them rather than creating duplicates
- All new components go in `src/components/ui/` directory
- Reduce bottom navigation from 6 to 5 items (remove History)
- Primary color remains coral, unified across light/dark modes
