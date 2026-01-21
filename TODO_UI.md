# Fit Workout App - UI Transformation Plan

## Overview

This document outlines the comprehensive plan to **refactor the existing Fit Workout App** to match the design and user experience of the `example/` project. The refactor will transform the application from its current basic styling to a dark bold, mobile-first design with gamification features, while maintaining the TanStack Start architecture.

**Key Principles:**
- Keep TanStack Start framework and routing
- Create new route files alongside existing ones (progress.tsx, achievements.tsx, workouts.$id.start.tsx, history.tsx)
- Replace existing components with improved implementations
- Use the exact same oklch() color palette as the example
- Mobile-first layout with 480px max-width centered on desktop
- Reuse patterns from `/home/steven/workout/example/` as the design reference

**Target Design**: Dark bold theme with orange primary (#oklch 0.65 0.24 30), blue accent (#oklch 0.7 0.15 195), mobile-first bottom navigation, gamification (streaks, badges, PR tracking).

**Current State**: Basic gray/blue theme, desktop sidebar navigation, minimal components, no gamification.

**Stack**: TanStack Start + React + Cloudflare Workers + Drizzle ORM + Tailwind CSS v4.

---

## Phase 0: Dependency Installation

### Task 0.1 - Install Required Dependencies

**Command**:
```bash
bun add clsx tailwind-merge class-variance-authority \
  @radix-ui/react-slot @radix-ui/react-tabs @radix-ui/react-dialog \
  @radix-ui/react-progress @radix-ui/react-select @radix-ui/react-dropdown-menu \
  @radix-ui/react-checkbox @radix-ui/react-label @radix-ui/react-separator \
  @radix-ui/react-scroll-area @radix-ui/react-alert-dialog \
  vaul tw-animate-css
```

**Verify in `package.json`**:
```json
{
  "clsx": "^2.1.1",
  "tailwind-merge": "^3.3.1",
  "class-variance-authority": "^0.7.1",
  "@radix-ui/react-slot": "^1.1.1",
  "@radix-ui/react-tabs": "^1.1.2",
  "@radix-ui/react-dialog": "^1.1.4",
  "@radix-ui/react-progress": "^1.1.1",
  "@radix-ui/react-select": "^2.1.4",
  "@radix-ui/react-dropdown-menu": "^2.1.4",
  "@radix-ui/react-checkbox": "^1.1.3",
  "@radix-ui/react-label": "^2.1.1",
  "@radix-ui/react-separator": "^1.1.1",
  "@radix-ui/react-scroll-area": "^1.2.2",
  "@radix-ui/react-alert-dialog": "^1.1.4",
  "vaul": "^1.1.2",
  "tw-animate-css": "^1.3.3",
  "lucide-react": "^0.544.0",
  "recharts": "^3.6.0",
  "sonner": "^2.0.7"
}
```

**Note**: `lucide-react`, `recharts`, and `sonner` already exist in current package.json.

---

## Phase 1: Foundation (Styling & Components)

### 1.1 Theme System Setup

**Objective**: Create CSS variables-based theming matching the example's dark bold aesthetic.

#### Task 1.1.1 - Update src/styles.css with CSS Variables
**File**: `src/styles.css`

**Changes**:
- Replace current `@import "tailwindcss"` with `@import "tailwindcss"; @import "tw-animate-css";`
- Add `:root` CSS variables block:

```css
:root {
  --background: oklch(0.1 0 0);
  --foreground: oklch(0.98 0 0);
  --card: oklch(0.14 0 0);
  --card-foreground: oklch(0.98 0 0);
  --popover: oklch(0.14 0 0);
  --popover-foreground: oklch(0.98 0 0);
  --primary: oklch(0.65 0.24 30);
  --primary-foreground: oklch(0.98 0 0);
  --secondary: oklch(0.2 0 0);
  --secondary-foreground: oklch(0.98 0 0);
  --muted: oklch(0.18 0 0);
  --muted-foreground: oklch(0.6 0 0);
  --accent: oklch(0.7 0.15 195);
  --accent-foreground: oklch(0.1 0 0);
  --success: oklch(0.72 0.19 142);
  --success-foreground: oklch(0.1 0 0);
  --warning: oklch(0.8 0.18 85);
  --warning-foreground: oklch(0.1 0 0);
  --destructive: oklch(0.55 0.22 25);
  --destructive-foreground: oklch(0.98 0 0);
  --border: oklch(0.25 0 0);
  --input: oklch(0.2 0 0);
  --ring: oklch(0.65 0.24 30);
  --chart-1: oklch(0.65 0.24 30);
  --chart-2: oklch(0.7 0.15 195);
  --chart-3: oklch(0.72 0.19 142);
  --chart-4: oklch(0.8 0.18 85);
  --chart-5: oklch(0.7 0.2 280);
  --radius: 0.75rem;
  --sidebar: oklch(0.12 0 0);
  --sidebar-foreground: oklch(0.98 0 0);
  --sidebar-primary: oklch(0.65 0.24 30);
  --sidebar-primary-foreground: oklch(0.98 0 0);
  --sidebar-accent: oklch(0.18 0 0);
  --sidebar-accent-foreground: oklch(0.98 0 0);
  --sidebar-border: oklch(0.25 0 0);
  --sidebar-ring: oklch(0.65 0.24 30);
}
```

- Add `@theme inline` block mapping CSS variables to Tailwind utilities
- Add `@layer base` styles for body and global elements

**Reference**: `/home/steven/workout/example/app/globals.css`

#### Task 1.1.2 - Create Tailwind Theme Configuration
**File**: `src/styles.css` (add after CSS variables)

```css
@theme inline {
  --font-sans: 'Geist', 'Geist Fallback';
  --font-mono: 'Geist Mono', 'Geist Mono Fallback';
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

---

### 1.2 Utility Functions

#### Task 1.2.1 - Create cn Utility Function
**File**: `src/lib/cn.ts`

**Purpose**: Merge Tailwind classes with proper precedence handling.

**Content**:
```typescript
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Dependencies**:
- Ensure `clsx` and `tailwind-merge` are installed (check package.json)
- If not installed: `bun add clsx tailwind-merge`

**Reference**: `/home/steven/workout/example/lib/utils.ts`

---

### 1.3 Core UI Components

#### Task 1.3.1 - Create Button Component
**File**: `src/components/ui/Button.tsx`

**Requirements**:
- Use `class-variance-authority` (CVA) for variants
- Support variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
- Support sizes: `default`, `sm`, `lg`, `icon`, `icon-sm`, `icon-lg`
- Use `@radix-ui/react-slot` for `asChild` prop
- Match example styling with rounded corners, transitions, focus states

**Reference**: `/home/steven/workout/example/components/ui/button.tsx`

#### Task 1.3.2 - Create Card Component
**File**: `src/components/ui/Card.tsx`

**Requirements**:
- Export sub-components: `Card`, `CardHeader`, `CardFooter`, `CardTitle`, `CardAction`, `CardDescription`, `CardContent`
- Use data-slot pattern for styling
- Match example rounded-xl styling, padding, shadows

**Reference**: `/home/steven/workout/example/components/ui/card.tsx`

#### Task 1.3.3 - Create Input Component
**File**: `src/components/ui/Input.tsx`

**Requirements**:
- Base input styling with focus states
- Support file input variant
- Match example styling with dark backgrounds on mobile

**Reference**: `/home/steven/workout/example/components/ui/input.tsx`

#### Task 1.3.4 - Create Badge Component
**File**: `src/components/ui/Badge.tsx`

**Requirements**:
- Support variants: `default`, `secondary`, `destructive`, `outline`
- Use for tags in workout cards, exercise lists, status indicators

**Reference**: `/home/steven/workout/example/components/ui/badge.tsx`

#### Task 1.3.5 - Create Progress Component
**File**: `src/components/ui/Progress.tsx`

**Requirements**:
- Use `@radix-ui/react-progress` for accessibility
- Support animated transitions
- Use for streak progress, volume goals, badge progress

**Reference**: `/home/steven/workout/example/components/ui/progress.tsx`

#### Task 1.3.6 - Create Tabs Component
**File**: `src/components/ui/Tabs.tsx`

**Requirements**:
- Use `@radix-ui/react-tabs`
- Support horizontal tab layout
- Use for filtering (All/Unlocked/Locked badges), chart type switching

**Reference**: `/home/steven/workout/example/components/ui/tabs.tsx`

#### Task 1.3.7 - Create Dialog Component
**File**: `src/components/ui/Dialog.tsx`

**Requirements**:
- Use `@radix-ui/react-dialog` with `vaul` for drawer support
- Support modal and sheet variants
- Use for workout completion confirmation, exercise details

**Reference**: `/home/steven/workout/example/components/ui/dialog.tsx`

#### Task 1.3.8 - Create Toast Components
**File**: `src/components/ui/Toast.tsx`, `src/components/ui/Toaster.tsx`, `src/hooks/use-toast.ts`

**Requirements**:
- Implement toast notification system
- Use `sonner` library (already in dependencies)
- Create hook for triggering toasts from anywhere

**Reference**: `/home/steven/workout/example/components/ui/toast.tsx`, `/home/steven/workout/example/hooks/use-toast.ts`

#### Task 1.3.9 - Create Select Component
**File**: `src/components/ui/Select.tsx`

**Requirements**:
- Use `@radix-ui/react-select`
- Support trigger, content, item, label, separator
- Match dark theme styling
- Use for exercise dropdowns, template selection

**Reference**: `/home/steven/workout/example/components/ui/select.tsx`

#### Task 1.3.10 - Create Dropdown Menu Component
**File**: `src/components/ui/DropdownMenu.tsx`

**Requirements**:
- Use `@radix-ui/react-dropdown-menu`
- Support trigger, content, item, separator, sub-menu
- Use for action menus (edit, delete workout)

**Reference**: `/home/steven/workout/example/components/ui/dropdown-menu.tsx`

#### Task 1.3.11 - Create Drawer Component
**File**: `src/components/ui/Drawer.tsx`

**Requirements**:
- Use `vaul` library for mobile drawer
- Support snap points for partial open
- Mobile-first modal alternative
- Use for exercise details, filters on mobile

**Reference**: `/home/steven/workout/example/components/ui/drawer.tsx`

#### Task 1.3.12 - Create Skeleton Component
**File**: `src/components/ui/Skeleton.tsx`

**Requirements**:
- Simple div with pulse animation
- Composable for various loading states
- Use bg-muted with animate-pulse

**Reference**: `/home/steven/workout/example/components/ui/skeleton.tsx`

#### Task 1.3.13 - Create Label Component
**File**: `src/components/ui/Label.tsx`

**Requirements**:
- Use `@radix-ui/react-label`
- Proper form accessibility
- Match theme typography

**Reference**: `/home/steven/workout/example/components/ui/label.tsx`

#### Task 1.3.14 - Create Checkbox Component
**File**: `src/components/ui/Checkbox.tsx`

**Requirements**:
- Use `@radix-ui/react-checkbox`
- Checked/unchecked states with animation
- Use for set completion marking

**Reference**: `/home/steven/workout/example/components/ui/checkbox.tsx`

#### Task 1.3.15 - Create Separator Component
**File**: `src/components/ui/Separator.tsx`

**Requirements**:
- Use `@radix-ui/react-separator`
- Horizontal and vertical orientations
- Use border color from theme

**Reference**: `/home/steven/workout/example/components/ui/separator.tsx`

#### Task 1.3.16 - Create Scroll Area Component
**File**: `src/components/ui/ScrollArea.tsx`

**Requirements**:
- Use `@radix-ui/react-scroll-area`
- Custom scrollbar styling for dark theme
- Use for long exercise lists

**Reference**: `/home/steven/workout/example/components/ui/scroll-area.tsx`

#### Task 1.3.17 - Create Alert Dialog Component
**File**: `src/components/ui/AlertDialog.tsx`

**Requirements**:
- Use `@radix-ui/react-alert-dialog`
- Confirmation dialogs for destructive actions
- Use for "Delete Workout?" confirmations

**Reference**: `/home/steven/workout/example/components/ui/alert-dialog.tsx`

#### Task 1.3.18 - Create Chart Wrapper Component
**File**: `src/components/ui/Chart.tsx`

**Requirements**:
- Wrapper for Recharts with theme colors
- CSS variable color mapping for chart elements
- Consistent tooltip styling

**Reference**: `/home/steven/workout/example/components/ui/chart.tsx`

#### Task 1.3.19 - Create Spinner Component
**File**: `src/components/ui/Spinner.tsx`

**Requirements**:
- Simple loading spinner with size variants
- Use primary color
- Replace/consolidate with existing LoadingSpinner

**Reference**: `/home/steven/workout/example/components/ui/spinner.tsx`

#### Task 1.3.20 - Create UI Barrel Export
**File**: `src/components/ui/index.ts`

**Requirements**:
- Export all UI components from single entry point
- Example: `export * from './Button'`

---

## Phase 2: Navigation & Layout

### 2.1 Navigation Components

#### Task 2.1.1 - Create Bottom Navigation Component
**File**: `src/components/BottomNav.tsx`

**Requirements**:
- Fixed bottom position with border-top
- Max width of 480px centered on mobile
- 5 navigation items: Home, Workouts, Progress, Badges, History
- Active state styling with primary color
- Use Lucide icons: Home, Dumbbell, TrendingUp, Trophy, History
- Responsive: hide on desktop, show on mobile (< 768px)

**Reference**: `/home/steven/workout/example/components/bottom-nav.tsx`

#### Task 2.1.2 - Redesign Header Component
**File**: `src/components/Header.tsx`

**Requirements**:
- Replace current header with example-style header
- Logo/icon with app name (Fit Workout with flame icon)
- Streak counter badge showing current streak
- Online/offline status indicator
- User avatar button
- Sticky positioning with backdrop blur
- Max width 480px centered

**Reference**: `/home/steven/workout/example/components/header.tsx`

#### Task 2.1.3 - Update Root Layout for Responsive Navigation
**File**: `src/routes/__root.tsx`

**Changes**:
- Import and render `BottomNav` component
- Update main content area padding for bottom nav (pb-20)
- Make sidebar responsive: hide on mobile, show on desktop
- Update navigation links to include new routes
- Apply consistent max-width (480px) to main content

**Reference**: `/home/steven/workout/example/app/layout.tsx`, `/home/steven/workout/src/routes/__root.tsx`

---

### 2.2 Route Structure

#### Task 2.2.1 - Create Progress Route
**File**: `src/routes/progress.tsx`

**Requirements**:
- Placeholder page matching example layout
- Include header, main content, bottom nav
- Exercise selector with horizontal scroll
- Strength chart placeholder
- Weekly volume chart placeholder
- PR board placeholder

**Reference**: `/home/steven/workout/example/app/progress/page.tsx`

#### Task 2.2.2 - Create Achievements Route
**File**: `src/routes/achievements.tsx`

**Requirements**:
- Placeholder page matching example layout
- Streak display component
- Badge filter tabs (All/Unlocked/Locked)
- Badge grid with placeholder badges
- Include header, main content, bottom nav

**Reference**: `/home/steven/workout/example/app/achievements/page.tsx`

#### Task 2.2.3 - Create Active Workout Route
**File**: `src/routes/workouts.$id.start.tsx`

**Requirements**:
- Placeholder page for active workout session
- Timer display (elapsed time)
- Progress bar for completed sets
- Exercise logger cards placeholder
- Finish workout button
- Exit button to cancel

**Reference**: `/home/steven/workout/example/app/workouts/[id]/start/page.tsx`

#### Task 2.2.4 - Create History Route
**File**: `src/routes/history.tsx`

**Requirements**:
- Replace or update existing history route
- Card-based list of past workouts
- Workout details: date, duration, total volume
- Exercise tags for each workout
- Match example styling

**Reference**: `/home/steven/workout/example/app/history/page.tsx`

---

## Phase 3: Dashboard Redesign

### 3.1 Dashboard Components

#### Task 3.1.1 - Create Streak Card Component
**File**: `src/components/dashboard/StreakCard.tsx`

**Requirements**:
- Flame icon with streak count badge
- Progress bar to 30-day badge
- This week workouts count
- Total workouts count
- Gradient background (from-primary/10 to-primary/5)
- Border with primary/20 color

**Reference**: `/home/steven/workout/example/components/dashboard/streak-card.tsx`

#### Task 3.1.2 - Create Volume Summary Component
**File**: `src/components/dashboard/VolumeSummary.tsx`

**Requirements**:
- Dumbbell icon with total volume
- Trend indicator (+12%)
- Progress bar to 50K Club badge
- Formatted number display (e.g., "45,230 lbs")
- Gradient background (from-accent/10 to-accent/5)

**Reference**: `/home/steven/workout/example/components/dashboard/volume-summary.tsx`

#### Task 3.1.3 - Create Quick Actions Component
**File**: `src/components/dashboard/QuickActions.tsx`

**Requirements**:
- List of workout templates (slice to 3)
- "New Workout" button
- "History" button
- Clickable template cards linking to workout start
- Exercise count per template

**Reference**: `/home/steven/workout/example/components/dashboard/quick-actions.tsx`

#### Task 3.1.4 - Create Recent PRs Component
**File**: `src/components/dashboard/RecentPRs.tsx`

**Requirements**:
- Card with trophy icon
- List of recent personal records (slice to 3)
- Exercise name, date, weight
- "+X lbs" improvement indicator
- Link to view all PRs

**Reference**: `/home/steven/workout/example/components/dashboard/recent-prs.tsx`

---

### 3.2 Dashboard Page Redesign

#### Task 3.2.1 - Update Index Route
**File**: `src/routes/index.tsx`

**Requirements**:
- Time-based greeting (Good morning/afternoon/evening)
- Render Header component
- Main content with max-width 480px
- Stack of dashboard cards:
  1. StreakCard
  2. VolumeSummary
  3. QuickActions
  4. RecentPRs
- BottomNav rendering
- Loading state matching example (spinner)
- Error state styling

**Reference**: `/home/steven/workout/example/app/page.tsx`, current `src/routes/index.tsx`

---

## Phase 4: Charts & Progress

### 4.1 Chart Components

#### Task 4.1.1 - Create Strength Chart Component
**File**: `src/components/progress/StrengthChart.tsx`

**Requirements**:
- Use `recharts` library
- Line chart for weight progression over time
- X-axis: date (formatted as "Jan 15")
- Y-axis: weight with domain auto-scaling
- Tooltip with full date and weight display
- Improvement percentage indicator
- Current weight display
- Responsive container with fixed height (200px)

**Reference**: `/home/steven/workout/example/components/progress/strength-chart.tsx`

#### Task 4.1.2 - Create Weekly Volume Chart Component
**File**: `src/components/progress/WeeklyVolumeChart.tsx`

**Requirements**:
- Use `recharts` library
- Bar chart for weekly volume
- X-axis: week labels (formatted "W1")
- Y-axis: volume in thousands (e.g., "15k")
- Tooltip with formatted volume
- Average volume indicator
- Responsive container with fixed height (200px)

**Reference**: `/home/steven/workout/example/components/progress/weekly-volume-chart.tsx`

#### Task 4.1.3 - Create Exercise Selector Component
**File**: `src/components/progress/ExerciseSelector.tsx`

**Requirements**:
- Horizontal scrollable list of exercise pills
- Active state styling (primary background)
- Inactive state styling (secondary background)
- Scrollbar hidden
- Click handler for selection

**Reference**: `/home/steven/workout/example/components/progress/exercise-selector.tsx`

#### Task 4.1.4 - Create PR Board Component
**File**: `src/components/progress/PRBoard.tsx`

**Requirements**:
- Card with trophy icon
- List of personal records with ranking (#1, #2, etc.)
- Exercise name, date, weight, reps
- Improvement indicator (+X lbs)
- Category colors (chart-4 for PRs)

**Reference**: `/home/steven/workout/example/components/progress/pr-board.tsx`

---

### 4.2 Update Existing Charts

#### Task 4.2.1 - Update ExerciseHistoryChart Styling
**File**: `src/components/ExerciseHistoryChart.tsx`

**Changes**:
- Replace hardcoded colors with CSS variables
- Use `--primary` for line color
- Use `--border` for grid lines
- Use `--muted-foreground` for axis labels
- Add responsive container with consistent height
- Match example tooltip styling

**Reference**: `/home/steven/workout/example/components/progress/strength-chart.tsx`

---

## Phase 5: Workout Experience

### 5.1 Workout Components

#### Task 5.1.1 - Create Exercise Logger Component
**File**: `src/components/workouts/ExerciseLogger.tsx`

**Requirements**:
- Collapsible card (expand/collapse with chevron)
- Exercise name and muscle group
- Completed sets / total sets indicator
- Expandable set list
- "Add Set" button
- Visual indication when all sets completed (success border)

**Reference**: `/home/steven/workout/example/components/workouts/exercise-logger.tsx`

#### Task 5.1.2 - Create Set Logger Component
**File**: `src/components/workouts/SetLogger.tsx`

**Requirements**:
- Set number badge
- Weight input with +/- 5lb buttons
- Reps input with +/- 1 buttons
- Complete button (check icon)
- Visual state change when completed (success border/background)
- Touch-friendly tap targets

**Reference**: `/home/steven/workout/example/components/workouts/set-logger.tsx`

#### Task 5.1.3 - Create Workout Template Card Component
**File**: `src/components/workouts/WorkoutTemplateCard.tsx`

**Requirements**:
- Card layout with exercise list
- Muscle group tags
- Exercise preview (first 3)
- "+X more exercises" indicator
- "Start Workout" button
- More options button (three dots)
- Hover effects and transitions

**Reference**: `/home/steven/workout/example/components/workouts/workout-template-card.tsx`

---

### 5.2 Workout Pages Update

#### Task 5.2.1 - Update Workouts List Page
**File**: `src/routes/workouts.tsx`

**Requirements**:
- Use new WorkoutTemplateCard component
- Match example page layout
- Header with "Workouts" title and "New" button
- Template list with consistent spacing
- Bottom navigation

**Reference**: `/home/steven/workout/example/app/workouts/page.tsx`

#### Task 5.2.2 - Update Workout Creation Page
**File**: `src/routes/workouts.new.tsx`

**Requirements**:
- Apply example styling to form elements
- Use new Button and Input components
- Consistent card styling
- Bottom navigation padding

#### Task 5.2.3 - Update Active Workout Page
**File**: `src/routes/workouts.$id.tsx` (or create new route)

**Requirements**:
- Timer display (elapsed time)
- Progress bar for workout completion
- Exercise logger components for each exercise
- "Complete Workout" button at bottom
- Exit button to cancel
- Match example styling

**Reference**: `/home/steven/workout/example/app/workouts/[id]/start/page.tsx`

---

## Phase 6: Gamification Features (Placeholders)

### 6.1 Achievement Components

#### Task 6.1.1 - Create Badge Card Component
**File**: `src/components/achievements/BadgeCard.tsx`

**Requirements**:
- Display badge icon, name, description
- Locked/unlocked state styling
- Progress bar for incomplete badges
- Category-based gradient backgrounds
- Unlocked date display
- Icon mapping for badge types (flame, crown, trophy, etc.)

**Reference**: `/home/steven/workout/example/components/achievements/badge-card.tsx`

#### Task 6.1.2 - Create Streak Display Component
**File**: `src/components/achievements/StreakDisplay.tsx`

**Requirements**:
- Large flame icon with streak count
- Best streak display
- Weekly workout calendar
- Day-of-week visualization (Sun, Mon, Tue, etc.)
- Today indicator (border ring)
- Active day indicators (filled with flame)

**Reference**: `/home/steven/workout/example/components/achievements/streak-display.tsx`

---

### 6.2 Achievement Pages

#### Task 6.2.1 - Implement Achievements Route
**File**: `src/routes/achievements.tsx` (from Phase 2)

**Requirements**:
- StreakDisplay component
- Filter tabs (All/Unlocked/Locked)
- Badge grid with BadgeCard components
- Badge count display
- Match example layout and styling

**Reference**: `/home/steven/workout/example/app/achievements/page.tsx`

---

## Phase 7: Polish & Mobile Experience

### 7.1 Mobile Optimizations

#### Task 7.1.1 - Add Mobile Detection Hook
**File**: `src/hooks/use-mobile.ts`

**Requirements**:
- Detect screen width (< 768px breakpoint)
- Return boolean for mobile state
- Listen for window resize events
- Handle SSR (return undefined initially)

**Reference**: `/home/steven/workout/example/hooks/use-mobile.ts`

#### Task 7.1.2 - Update Global Styles
**Changes to `src/styles.css`**:
- Add safe area padding for mobile notches
- Hide scrollbars in horizontal scroll containers
- Add touch-action utilities for better mobile interactions
- Ensure minimum tap target size (44px)

#### Task 7.1.3 - Add Loading Skeletons
**File**: `src/components/ChartSkeleton.tsx` (exists - review/update)

**Requirements**:
- Pulse animation for loading states
- Chart-like skeleton with bars
- Consistent with example styling

**Reference**: `/home/steven/workout/src/components/ChartSkeleton.tsx`, `/home/steven/workout/example/components/ui/skeleton.tsx`

---

### 7.2 Empty States

#### Task 7.2.1 - Update EmptyState Component
**File**: `src/components/EmptyState.tsx`

**Requirements**:
- Review and update styling to match new theme
- Add icon support with new icon set
- Update action button styling to match example
- Ensure consistent spacing and typography

**Reference**: `/home/steven/workout/example/components/ui/empty.tsx` (if exists), current `/home/steven/workout/src/components/EmptyState.tsx`

---

### 7.3 Toast Notifications

#### Task 7.3.1 - Implement Toast System
**File**: `src/components/ToastProvider.tsx` (exists - review/update)

**Requirements**:
- Integrate `sonner` library
- Update styling to match dark theme
- Ensure proper positioning (bottom on mobile)
- Test with various notification types (success, error, info)

**Reference**: `/home/steven/workout/example/components/ui/sonner.tsx`

---

## Phase 8: Existing Route Migrations

### 8.1 Exercise Routes

#### Task 8.1.1 - Update Exercises List Page
**File**: `src/routes/exercises._index.tsx`

**Requirements**:
- Apply new Card, Button, Badge components
- Dark theme styling
- Bottom nav padding
- Use new Input and Select for filtering

#### Task 8.1.2 - Update Exercise Detail Page
**File**: `src/routes/exercises.$id.tsx`

**Requirements**:
- Apply Card styling for exercise details
- Use new Button variants
- Integrate ExerciseHistoryChart with new theme colors

#### Task 8.1.3 - Update Exercise Edit Page
**File**: `src/routes/exercises.$id.edit.tsx`

**Requirements**:
- Apply new Input, Label, Button components
- Form styling with dark theme
- Use AlertDialog for delete confirmation

#### Task 8.1.4 - Update New Exercise Page
**File**: `src/routes/exercises.new.tsx`

**Requirements**:
- Apply new form components (Input, Label, Select, Button)
- Consistent styling with other forms

---

### 8.2 Template Routes

#### Task 8.2.1 - Update Templates List Page
**File**: `src/routes/templates._index.tsx`

**Requirements**:
- Apply new Card styling
- Use WorkoutTemplateCard component
- Dark theme with proper spacing

#### Task 8.2.2 - Update Template Detail Page
**File**: `src/routes/templates.$id.tsx`

**Requirements**:
- Apply Card, Badge, Button components
- Exercise list with proper styling
- Action buttons (Start Workout, Edit, Delete)

#### Task 8.2.3 - Update Template Edit Page
**File**: `src/routes/templates.$id.edit.tsx`

**Requirements**:
- Apply new form components
- Use Checkbox for exercise selection
- AlertDialog for delete confirmation

#### Task 8.2.4 - Update New Template Page
**File**: `src/routes/templates.new.tsx`

**Requirements**:
- Apply new form components
- Multi-select for exercises
- Consistent dark theme styling

---

### 8.3 Workout Summary Route

#### Task 8.3.1 - Update Workout Summary Page
**File**: `src/routes/workouts.$id_.summary.tsx`

**Requirements**:
- Apply new Card, Badge components
- PR indicators with chart-4 color
- Volume and duration display
- Share/save actions

---

### 8.4 Desktop Sidebar (Optional)

#### Task 8.4.1 - Create Desktop Sidebar Component
**File**: `src/components/Sidebar.tsx`

**Requirements**:
- Desktop-only (hidden on mobile < 768px)
- Navigation links matching BottomNav
- User profile section
- Streak display
- Use sidebar CSS variables from theme

**Reference**: `/home/steven/workout/example/components/ui/sidebar.tsx`

---

## Implementation Checklist

### Phase 1: Foundation
- [x] Task 0.1 - Install required dependencies
- [x] Task 1.1.1 - Update src/styles.css with CSS variables
- [x] Task 1.1.2 - Add Tailwind theme configuration
- [x] Task 1.2.1 - Create cn utility function
- [x] Task 1.3.1 - Create Button component
- [x] Task 1.3.2 - Create Card component
- [x] Task 1.3.3 - Create Input component
- [x] Task 1.3.4 - Create Badge component
- [x] Task 1.3.5 - Create Progress component
- [x] Task 1.3.6 - Create Tabs component
- [x] Task 1.3.7 - Create Dialog component
- [x] Task 1.3.8 - Create Toast components
- [x] Task 1.3.9 - Create Select component
- [x] Task 1.3.10 - Create Dropdown Menu component
- [x] Task 1.3.11 - Create Drawer component
- [x] Task 1.3.12 - Create Skeleton component
- [x] Task 1.3.13 - Create Label component
- [x] Task 1.3.14 - Create Checkbox component
- [x] Task 1.3.15 - Create Separator component
- [x] Task 1.3.16 - Create Scroll Area component
- [x] Task 1.3.17 - Create Alert Dialog component
- [x] Task 1.3.18 - Create Chart wrapper component
- [x] Task 1.3.19 - Create Spinner component
- [x] Task 1.3.20 - Create UI barrel export

### Phase 2: Navigation & Layout
- [x] Task 2.1.1 - Create BottomNav component
- [x] Task 2.1.2 - Redesign Header component
- [x] Task 2.1.3 - Update Root layout for responsive nav
- [x] Task 2.2.1 - Create Progress route
- [x] Task 2.2.2 - Create Achievements route
- [x] Task 2.2.3 - Create Active Workout route
- [x] Task 2.2.4 - Create/Update History route

### Phase 3: Dashboard Redesign
- [x] Task 3.1.1 - Create StreakCard component
- [x] Task 3.1.2 - Create VolumeSummary component
- [x] Task 3.1.3 - Create QuickActions component
- [x] Task 3.1.4 - Create RecentPRs component
- [x] Task 3.2.1 - Update Index route (dashboard)

### Phase 4: Charts & Progress
- [x] Task 4.1.1 - Create StrengthChart component
- [x] Task 4.1.2 - Create WeeklyVolumeChart component
- [x] Task 4.1.3 - Create ExerciseSelector component
- [x] Task 4.1.4 - Create PRBoard component
- [x] Task 4.2.1 - Update ExerciseHistoryChart styling

### Phase 5: Workout Experience
- [x] Task 5.1.1 - Create ExerciseLogger component
- [x] Task 5.1.2 - Create SetLogger component
- [x] Task 5.1.3 - Create WorkoutTemplateCard component
- [x] Task 5.2.1 - Update Workouts list page
- [x] Task 5.2.2 - Update Workout creation page
- [x] Task 5.2.3 - Update Active Workout page

### Phase 6: Gamification Features
- [x] Task 6.1.1 - Create BadgeCard component
- [x] Task 6.1.2 - Create StreakDisplay component
- [x] Task 6.2.1 - Implement Achievements route

### Phase 7: Polish & Mobile
- [x] Task 7.1.1 - Add mobile detection hook
- [x] Task 7.1.2 - Update global styles for mobile
- [x] Task 7.1.3 - Add loading skeletons
- [x] Task 7.2.1 - Update EmptyState component
- [x] Task 7.3.1 - Implement Toast system

### Phase 8: Existing Route Migrations
- [x] Task 8.1.1 - Update Exercises list page
- [x] Task 8.1.2 - Update Exercise detail page
- [x] Task 8.1.3 - Update Exercise edit page
- [x] Task 8.1.4 - Update New Exercise page
- [x] Task 8.2.1 - Update Templates list page
- [x] Task 8.2.2 - Update Template detail page
- [x] Task 8.2.3 - Update Template edit page
- [x] Task 8.2.4 - Update New Template page
- [x] Task 8.3.1 - Update Workout summary page
- [x] Task 8.4.1 - Create Desktop Sidebar (optional)

---

## Dependencies to Verify

Ensure these packages are installed (check `package.json`):

```json
{
  "clsx": "^2.1.1",
  "tailwind-merge": "^3.3.1",
  "class-variance-authority": "^0.7.1",
  "@radix-ui/react-slot": "^1.1.1",
  "@radix-ui/react-tabs": "^1.1.2",
  "@radix-ui/react-dialog": "^1.1.4",
  "@radix-ui/react-progress": "^1.1.1",
  "@radix-ui/react-select": "^2.1.4",
  "@radix-ui/react-dropdown-menu": "^2.1.4",
  "@radix-ui/react-checkbox": "^1.1.3",
  "@radix-ui/react-label": "^2.1.1",
  "@radix-ui/react-separator": "^1.1.1",
  "@radix-ui/react-scroll-area": "^1.2.2",
  "@radix-ui/react-alert-dialog": "^1.1.4",
  "vaul": "^1.1.2",
  "tw-animate-css": "^1.3.3",
  "lucide-react": "^0.544.0",
  "recharts": "^3.6.0",
  "sonner": "^2.0.7"
}
```

---

## Color Reference

| CSS Variable | Value | Usage |
|--------------|-------|-------|
| `--primary` | oklch(0.65 0.24 30) | Orange - Main actions, streak, brand |
| `--accent` | oklch(0.7 0.15 195) | Blue - Secondary accents, volume |
| `--success` | oklch(0.72 0.19 142) | Green - Completed sets, achievements |
| `--warning` | oklch(0.8 0.18 85) | Yellow - Offline status, pending |
| `--chart-4` | oklch(0.8 0.18 85) | Yellow/amber - PRs, trophies |
| `--background` | oklch(0.1 0 0) | Near black - Page background |
| `--card` | oklch(0.14 0 0) | Dark gray - Card backgrounds |
| `--muted` | oklch(0.18 0 0) | Muted gray - Secondary backgrounds |
| `--border` | oklch(0.25 0 0) | Border color |

---

## Icon Reference

Use Lucide React icons throughout:

| Component | Icons |
|-----------|-------|
| BottomNav | Home, Dumbbell, TrendingUp, Trophy, History |
| Header | Flame, User, Wifi, WifiOff |
| Dashboard | Flame, Calendar, Target, Play, Plus, History |
| Charts | TrendingUp, Dumbbell |
| Workouts | Play, ChevronDown, ChevronUp, Check, Plus, Minus |
| Achievements | Flame, Crown, Trophy, Dumbbell, Medal, Star, Zap, Lock |

---

## Testing Checklist

After implementation, verify:

- [ ] Dark theme applied everywhere
- [ ] Bottom nav visible on mobile, hidden on desktop
- [ ] Sidebar hidden on mobile, visible on desktop
- [ ] All cards use consistent styling (rounded-xl, shadows, borders)
- [ ] Charts display correctly with CSS variable colors
- [ ] Toast notifications work
- [ ] Loading states display properly
- [ ] Empty states have proper styling
- [ ] Touch targets are 44px+ on mobile
- [ ] Bottom navigation doesn't overlap content
- [ ] Streak/badges display correctly

---

## File Structure

```
src/
├── components/
│   ├── ui/
│   │   ├── AlertDialog.tsx
│   │   ├── Badge.tsx
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Chart.tsx
│   │   ├── Checkbox.tsx
│   │   ├── Dialog.tsx
│   │   ├── Drawer.tsx
│   │   ├── DropdownMenu.tsx
│   │   ├── Input.tsx
│   │   ├── Label.tsx
│   │   ├── Progress.tsx
│   │   ├── ScrollArea.tsx
│   │   ├── Select.tsx
│   │   ├── Separator.tsx
│   │   ├── Skeleton.tsx
│   │   ├── Spinner.tsx
│   │   ├── Tabs.tsx
│   │   ├── Toast.tsx
│   │   ├── Toaster.tsx
│   │   └── index.ts (barrel export)
│   ├── achievements/
│   │   ├── BadgeCard.tsx
│   │   └── StreakDisplay.tsx
│   ├── dashboard/
│   │   ├── QuickActions.tsx
│   │   ├── RecentPRs.tsx
│   │   ├── StreakCard.tsx
│   │   └── VolumeSummary.tsx
│   ├── progress/
│   │   ├── ExerciseSelector.tsx
│   │   ├── PRBoard.tsx
│   │   ├── StrengthChart.tsx
│   │   └── WeeklyVolumeChart.tsx
│   ├── workouts/
│   │   ├── ExerciseLogger.tsx
│   │   ├── SetLogger.tsx
│   │   └── WorkoutTemplateCard.tsx
│   ├── BottomNav.tsx
│   ├── ChartSkeleton.tsx
│   ├── EmptyState.tsx
│   ├── ErrorBoundary.tsx
│   ├── ExerciseHistoryChart.tsx
│   ├── ExerciseSelect.tsx
│   ├── Header.tsx
│   ├── LoadingSpinner.tsx
│   ├── Sidebar.tsx
│   └── ToastProvider.tsx
├── hooks/
│   ├── use-mobile.ts
│   └── use-toast.ts
├── lib/
│   ├── cn.ts
│   ├── posthog.server.ts
│   ├── posthog.ts
│   ├── auth.ts
│   ├── db/
│   ├── exercise-library.ts
│   └── session.ts
├── routes/
│   ├── __root.tsx
│   ├── index.tsx
│   ├── achievements.tsx
│   ├── exercises._index.tsx
│   ├── exercises.$id.tsx
│   ├── exercises.$id.edit.tsx
│   ├── exercises.new.tsx
│   ├── history._index.tsx
│   ├── history.$exerciseId.tsx
│   ├── progress.tsx
│   ├── templates._index.tsx
│   ├── templates.$id.tsx
│   ├── templates.$id.edit.tsx
│   ├── templates.new.tsx
│   ├── workouts.$id.start.tsx
│   ├── workouts.$id.tsx
│   ├── workouts.$id_.summary.tsx
│   ├── workouts.new.tsx
│   ├── api/
│   └── ...
├── styles.css
├── entry-client.tsx
├── entry-server.tsx
├── logo.svg
├── router.tsx
└── tests/
```

---

## References

- Example project: `/home/steven/workout/example/`
- Current project: `/home/steven/workout/src/`
- TanStack Start docs: https://tanstack.com/start
- Tailwind CSS v4: https://tailwindcss.com/docs
- Recharts: https://recharts.org/
- Lucide React: https://lucide.dev/
- shadcn/ui: https://ui.shadcn.com/
