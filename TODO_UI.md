# UI/UX Audit - Fit Workout App

This document contains findings from a UI/UX audit of the mobile-first workout tracking application. Issues are categorized by priority for implementation.

---

## 1. Inconsistencies Found

### Page Header Patterns
| Page | Pattern | Issue |
|------|---------|-------|
| Dashboard (`src/routes/index.tsx`) | Greeting + subtitle, no action buttons | Different from other pages |
| Exercises/Templates/History | `h1` + single action button | Standard pattern |
| Achievements (`src/routes/achievements.tsx`) | Subtitle below heading | Inconsistent placement |

### Page Title Sizes
- **Most pages**: `text-2xl font-bold`
- **History page**: `text-3xl font-bold` ← Fix to match others

### Card Padding & Structure
- Dashboard cards: `p-4` via `CardContent`
- Exercise list cards: `p-4` directly on `Card`
- Template cards: `CardContent` with `p-4`
- Create exercise form: `Card` with `p-4`
- **Issue**: Mixing `Card` wrapper vs `Card > CardContent` patterns inconsistently

### Form Elements - Native vs UI Components
| Component | Location | Issue |
|-----------|----------|-------|
| `Input` component | Exercises, Workouts search | ✅ Correct |
| Native `<input>` | History search, workout notes, date inputs | ❌ Should use `Input` |
| Native `<select>` | Exercises form, History filters | ❌ Should use `Select` component |

### Button Patterns
- Some pages use `Button asChild` with `<Link>` (correct TanStack pattern)
- Some use `Button asChild` with `<a href>` (mixing patterns)
- `QuickActions.tsx` uses raw `<button>` elements with custom styling instead of `Button` component

### Empty State Handling
- Exercises/Templates: Use dedicated `EmptyState` component ✅
- Workouts page: Inline centered div with icon (inconsistent)
- Icon sizes vary: 48px in `EmptyState` vs 12/10px in inline versions

### Loading States
- Uses `Spinner`, `Loader2` icon, `SkeletonList`, `SkeletonCard` inconsistently
- Some pages show "Redirecting to sign in..." text
- Others show `Loader2` spinner
- **Need**: Standardized loading component

### Modal/Dialog Patterns
- Workout session (`src/routes/workouts.$id.tsx`) uses custom modal:
  ```tsx
  <div className="fixed inset-0 bg-black/50...">
  ```
- **Should use**: `Dialog`, `Drawer`, or `AlertDialog` UI components

---

## 2. Mobile-First Issues

### Touch Targets Too Small
- Icon buttons (Edit, Delete, Copy) are only `p-2` (~32px)
- **Minimum required**: 44x44px for mobile accessibility
- Bottom nav icons `h-5 w-5` with small tap areas

### Settings Dropdown Not Mobile-Friendly
- Header dropdowns (`src/components/Header.tsx`) are desktop patterns
- **Should be**: Full-screen sheets or bottom drawers on mobile

### Date Inputs
- Native date inputs work poorly on mobile
- Consider a mobile-friendly date picker component

### Horizontal Scroll on History Filters
- Filter row in `src/routes/history._index.tsx` can overflow on small screens
- Need responsive layout or horizontal scroll with indicators

### Missing Mobile Patterns
- No pull-to-refresh on list pages
- No swipe actions on list items
- No haptic feedback indicators

---

## 3. Implementation Tasks

### High Priority

#### Task 1: Create Standardized Page Layout Component ✅
**File**: `src/components/PageHeader.tsx`
```tsx
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
```
**Apply to**: All route files

#### Task 2: Replace Native Form Elements with UI Components ✅
**Files to update**:
- `src/routes/history._index.tsx` - Replace native `<input>` and `<select>`
- `src/routes/exercises._index.tsx` - Replace native `<select>` for muscle group
- `src/routes/workouts.$id.tsx` - Replace native `<input>` and `<textarea>`

**Use**:
- `Input` from `~/components/ui/Input`
- `Select` from `~/components/ui/Select`
- Create `Textarea` component if needed

#### Task 3: Increase Touch Targets ✅
**Files to update**:
- `src/components/ui/Button.tsx` - Update `icon-sm` to 44px minimum
- `src/routes/templates._index.tsx` - Icon button sizes
- `src/components/Header.tsx` - Settings and profile buttons
- `src/components/BottomNav.tsx` - Navigation items

**Changes**:
```tsx
// Button.tsx - update icon sizes
'icon-sm': 'size-11', // 44px
'icon': 'size-11',    // 44px (was size-9)
'icon-lg': 'size-12', // 48px
```

#### Task 4: Use Drawer for Mobile Modals ✅
**Files to update**:
- `src/routes/workouts.$id.tsx` - Exercise selector modal → `Drawer`
- `src/routes/workouts.$id.tsx` - Confirmation dialogs → `AlertDialog`
- `src/components/Header.tsx` - Settings menu → `Drawer`

**Pattern**:
```tsx
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '~/components/ui/Drawer';

// Replace custom modals with:
<Drawer open={showExerciseSelector} onOpenChange={setShowExerciseSelector}>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>Add Exercise</DrawerTitle>
    </DrawerHeader>
    {/* content */}
  </DrawerContent>
</Drawer>
```

#### Task 5: Standardize Loading States ✅
**Create**: `src/components/PageLoader.tsx`
```tsx
import { Loader2 } from 'lucide-react';

export function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
```
**Apply to**: All route files that show loading states

---

### Medium Priority

#### Task 6: Standardize Card Patterns ✅
**Rule**: Always use `Card > CardContent` for content with padding
```tsx
// ✅ Correct
<Card>
  <CardContent className="p-4">
    {/* content */}
  </CardContent>
</Card>

// ❌ Avoid
<Card className="p-4">
  {/* content */}
</Card>
```
**Files to update**:
- `src/routes/exercises._index.tsx`
- `src/routes/workouts._index.tsx`
- `src/routes/workouts.$id.tsx`

#### Task 7: Fix History Page Title Size ✅
**File**: `src/routes/history._index.tsx`
**Change**: `text-3xl` → `text-2xl`

#### Task 8: Add Mobile Feedback ✅
**Add to interactive elements**:
```tsx
className="active:scale-95 transition-transform"
```
**Files**: All button and clickable card components

#### Task 9: Improve Bottom Navigation ✅
**File**: `src/components/BottomNav.tsx`
**Changes**:
- Add safe area padding: `pb-safe` or `pb-[env(safe-area-inset-bottom)]`
- Increase touch targets
- Consider hide-on-scroll-down pattern

#### Task 10: Standardize Button Link Patterns ✅
**Rule**: Use `Link` from TanStack Router, not `<a href>`
```tsx
// ✅ Correct
<Button asChild>
  <Link to="/templates/new">Create</Link>
</Button>

// ❌ Avoid
<Button asChild>
  <a href="/templates/new">Create</a>
</Button>
```
**Files to update**:
- `src/components/dashboard/QuickActions.tsx`
- `src/routes/templates._index.tsx`

---

### Low Priority

#### Task 11: Add Skeleton Screens for Dashboard ✅
**File**: `src/routes/index.tsx`
**Change**: Replace spinner with skeleton cards matching dashboard layout

#### Task 12: Add Page Transitions
Consider using Framer Motion or CSS transitions for page enter/exit animations

#### Task 13: Add Swipe Actions
Consider implementing swipe-to-delete on:
- Exercise list items
- Template list items
- Workout history items

---

## 4. Files Reference

| File | Issues |
|------|--------|
| `src/routes/index.tsx` | Header pattern, loading state |
| `src/routes/exercises._index.tsx` | Native select, card pattern |
| `src/routes/templates._index.tsx` | Button links, icon touch targets |
| `src/routes/workouts._index.tsx` | Card patterns |
| `src/routes/workouts.$id.tsx` | Custom modals, native inputs |
| `src/routes/history._index.tsx` | Title size, native inputs, filter overflow |
| `src/routes/achievements.tsx` | Header pattern |
| `src/routes/progress.tsx` | Consistent ✅ |
| `src/components/Header.tsx` | Dropdown pattern, touch targets |
| `src/components/BottomNav.tsx` | Touch targets, safe area |
| `src/components/dashboard/QuickActions.tsx` | Raw buttons, link pattern |
| `src/components/ui/Button.tsx` | Icon sizes |

---

## 5. Design Tokens to Standardize

```css
/* Touch targets */
--touch-target-min: 44px;

/* Spacing */
--page-padding-x: 1rem;     /* px-4 */
--page-padding-y: 1.5rem;   /* py-6 */
--card-padding: 1rem;       /* p-4 */
--section-gap: 1.5rem;      /* space-y-6 */

/* Typography */
--page-title: text-2xl font-bold;
--section-title: text-lg font-semibold;
--card-title: text-base font-semibold;
```

---

## 6. Testing Checklist

After implementation, verify:

- [ ] All touch targets are minimum 44x44px
- [ ] All pages use consistent header pattern
- [ ] All forms use UI components (no native inputs/selects)
- [ ] All modals use Drawer/Dialog components
- [ ] All loading states use standardized components
- [ ] All cards use consistent Card > CardContent pattern
- [ ] Bottom nav has safe area padding
- [ ] No horizontal overflow on mobile screens
- [ ] All buttons provide visual feedback on press
