# UI/UX Consistency TODO

Remaining items from the UI/UX audit. The first pass fixed hardcoded colors, double padding, raw `<h2>` → `<SectionHeader>`, nested Card, `cn()` usage, PageHeader subtitle, and migrated exercise/template detail pages to `<PageLayout>`.

## 1. Workout Summary Page — Raw `<main>` Instead of `<PageLayout>`

**File:** `src/routes/workouts.$id_.summary.tsx`

The workout summary page uses `<main className="mx-auto max-w-lg px-4 py-6">` instead of `<PageLayout>`. It has a custom celebration layout ("Workout Complete!") with stat cards, 1RM progress, exercise summary, and PR comparison — so migrating requires careful restructuring of the title/subtitle area.

**Also:** The stat cards on this page (Duration, Total Sets, Volume, Exercises) use raw `<div className="bg-card border border-border rounded-lg p-4">` instead of the `<Card>` or `<StatCard>` components. Should be standardized.

## 2. Workout Session Page — Inconsistent Bottom Padding

**File:** `src/routes/workouts.$id.tsx`

Uses `pb-28 sm:pb-32` while `<PageLayout>` uses `pb-24`. The workout session has a fixed bottom action bar, so extra padding is intentional — but the value should be derived from a shared constant or documented as intentional.

## 3. Loading States — No Shared Pattern

Detail pages have inconsistent loading UX:

| Page | Loading pattern |
|------|----------------|
| `index.tsx` (dashboard) | Skeleton placeholders |
| `exercises._index.tsx` | `<SkeletonList>` component |
| `templates._index.tsx` | `<SkeletonList>` component |
| `workouts._index.tsx` | `<SkeletonWorkoutsPage>` component |
| `achievements.tsx` | Plain text `"Loading..."` inside `<PageLayout>` |
| `workouts.$id_.summary.tsx` | Centered `<Loader2>` spinner full-screen |
| `templates.$id.tsx` | Plain text `"Loading..."` full-screen |

**Recommendation:** Create a `<PageLoading>` component (skeleton or spinner inside `<PageLayout>`) and use it consistently on all pages.

## 4. Error States — No Shared Pattern

| Page | Error pattern |
|------|--------------|
| `exercises.$id.tsx` | `<Card>` with red text inside `<PageLayout>` |
| `templates.$id.tsx` | `bg-destructive/10` div, full-screen centered |
| `workouts.$id_.summary.tsx` | `bg-destructive/10` div with "Go to dashboard" link, raw layout |
| `index.tsx` (dashboard) | `min-h-screen` centered red text |

**Recommendation:** Use `<ErrorState>` component (already exists at `src/components/ui/ErrorState.tsx`) consistently, wrapped in `<PageLayout>`.

## 5. Back Navigation — Inconsistent Patterns

| Page | Back nav style |
|------|---------------|
| `exercises.$id.tsx` | Now uses `<PageLayout>` (no back link) ✅ |
| `templates.$id.tsx` | Now uses `<PageLayout>` (no back link) ✅ |
| `workouts.$id_.summary.tsx` | `<ArrowLeft>` icon + "Back to dashboard" text link |
| `workouts.$id.tsx` | `<ChevronLeft>` icon in error state only |

**Recommendation:** Either rely on browser back / bottom nav (no back links needed since PageLayout doesn't have one), or add a consistent back link pattern to `<PageLayout>` via an optional `backHref` prop.

## 6. Auth Redirect — Inconsistent Patterns

Pages handle unauthenticated users differently:

- Some use `window.location.href = '/auth/signin'` in a `useEffect`
- Some show "Redirecting to sign in..." text
- Some return `null`
- Dashboard redirects inline during data fetch

**Recommendation:** Create a shared `useRequireAuth()` hook or handle at the router level.

## 7. Card Padding in List Views

Exercise list cards in `workouts._index.tsx` use `p-3` while template/exercise list cards use `p-4`. Should pick one consistent value (`p-4` preferred).

**File:** `src/routes/workouts._index.tsx` line 232: `<CardContent className="p-3">`

## 8. Section Spacing Between Cards

- Dashboard widgets use `space-y-4`
- Exercise/template lists use `space-y-3`
- Progress workout history uses `space-y-4`
- Workout session exercises use `space-y-4`

**Recommendation:** Standardize list gaps to `space-y-3` for dense lists (exercises, templates) and `space-y-4` for content-heavy cards (workouts, dashboard widgets). Document the convention.
