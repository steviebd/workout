# UI Overhaul — Look & Feel Recommendations

## Summary

The current UI is structurally sound (Tailwind v4 + Radix + CVA) but reads as a **generic shadcn template with fitness colors painted on**. The overhaul focuses on surface/elevation discipline, typographic restraint, and reducing visual noise to achieve a premium, fitness-oriented identity.

---

## Table of Contents

1. [Surface & Elevation System](#1-surface--elevation-system)
2. [Color Strategy](#2-color-strategy)
3. [Card System](#3-card-system)
4. [Buttons](#4-buttons)
5. [Typography](#5-typography)
6. [Bottom Nav & Header](#6-bottom-nav--header)
7. [Interactions & Micro-animations](#7-interactions--micro-animations)
8. [Component-Specific Changes](#8-component-specific-changes)
9. [Dark Mode](#9-dark-mode)
10. [Priority & Effort](#10-priority--effort)

---

## 1. Surface & Elevation System

**Problem:** Light mode neutrals are achromatic (chroma=0), making everything feel flat and default. Color only appears as "paint on top" of gray surfaces.

**Fix:** Introduce warm-tinted surface tokens so the entire palette feels cohesive:

```css
:root {
  --background: oklch(0.985 0.01 30);
  --surface-1:  oklch(0.995 0.005 30); /* cards */
  --surface-2:  oklch(0.97  0.01 30);  /* muted/secondary backgrounds */
  --surface-3:  oklch(0.945 0.015 30); /* pressed/selected states */

  --border:        oklch(0.90 0.01 30);
  --border-strong: oklch(0.84 0.015 30);
}
```

Then map existing tokens:
- `--card` → `--surface-1`
- `--secondary` / `--muted` → `--surface-2`
- Selected/pressed fills → `--surface-3`

---

## 2. Color Strategy

**Problem:** Too many equally-saturated semantic colors (workout, exercise, volume, streak, achievement, chart-1 through chart-5) compete for attention on the dashboard.

**Fix — "Ember + Data Blue":**
- Nudge primary from hue `25` → `32` (more ember/coral, less "generic red")
- Keep accent as a "data blue" (shift from hue `195` → `215` to reduce green cast)
- Lower chroma on non-primary semantic colors — use them for subtle tinting, not bold fills
- Use color as **signal**, not decoration

```css
:root {
  --primary: oklch(0.64 0.20 32);   /* ember */
  --accent:  oklch(0.67 0.16 215);  /* data blue */
}
.dark {
  --primary: oklch(0.72 0.19 32);
  --accent:  oklch(0.74 0.16 215);
}
```

---

## 3. Card System

**Bug:** `Card.tsx` sets `border-0`, but `ListCard` and `StreakCard` apply `border-primary/20` which won't render without border width. Borders are silently broken.

**Fix:** Change Card base to `border border-border/60 bg-card shadow-xs`. Remove ad-hoc gradients and standardize on 3 card variants:

| Variant | When to Use | Style |
|---------|-------------|-------|
| **surface** (default) | Most cards | Subtle border, `shadow-xs` |
| **elevated** | Modals, key CTA blocks | Stronger `shadow-md` |
| **tinted** | Streak, Quick Start, Volume (max 2-3 per page) | Single direction (`to-br`), max 8% tint |

**Radius:** `--radius` is `0.75rem` but Card hardcodes `rounded-2xl` (~1rem). Standardize: use `rounded-xl` everywhere, reserve `rounded-2xl` for hero/tinted cards only.

---

## 4. Buttons

**Problem:** `active:scale-[0.97]` is applied to every button variant. Combined with the same interaction on FilterPills, BottomNav links, Header buttons, and cards, the app feels "bouncy/toy-like" rather than premium.

**Changes:**
- [ ] Keep scale feedback only on **primary CTA** and **icon-only** buttons
- [ ] Secondary/outline/ghost: use brightness shift or `translateY(1px)` on press instead
- [ ] Add a **"cta" variant** for high-impact actions ("Start Workout", "Finish", "Save"):
  - Subtle gradient fill + stronger shadow + crisp border
  - Used sparingly (1-2 per screen max)
- [ ] Add consistent **loading state** styling (spinner alignment + disabled appearance) since many flows are async

---

## 5. Typography

**Problem:** Overuse of `font-bold` flattens the hierarchy. Stats-heavy screens have misaligned numbers.

**Changes:**
- [ ] Add `font-variant-numeric: tabular-nums` to `body` in `styles.css` — critical for stats/metrics alignment
- [ ] Reduce `font-bold` usage; use `font-semibold` as default heading weight, reserve `font-bold` for 1-2 hero metrics per screen
- [ ] Tighten the scale:
  - Page title: `text-[22px] font-semibold tracking-tight`
  - Section headings: `text-sm font-semibold uppercase tracking-wide text-muted-foreground`
  - Card value numbers: `text-2xl font-semibold tabular-nums`
  - Meta/labels: `text-xs text-muted-foreground`

---

## 6. Bottom Nav & Header

### Bottom Nav (`src/components/BottomNav.tsx`)
- [ ] Reduce icon size from `h-7 w-7` to `h-5 w-5` — current size feels cartoonish
- [ ] Remove `active:scale-[0.95]` — use color-only feedback for nav items
- [ ] Pick one material: solid surface with border **or** glass with backdrop-blur. Currently using both blur and shadow which looks "webby" vs native.

### Header (`src/components/Header.tsx`)
- [ ] Settings dropdown is a raw `<div>` with manual click-outside handling — replace with a Radix `Popover` or `DropdownMenu` for accessibility and polish
- [ ] User menu (same issue) — also replace with Radix primitive
- [ ] Gradient text on "Fit Workout" brand — consider solid `text-primary` instead; gradients on small text can look blurry on low-DPI screens

---

## 7. Interactions & Micro-animations

**Problem:** `hover-lift`, `active-scale`, and `transition-colors` are sprinkled everywhere inconsistently. Mobile-first doesn't benefit from hover transforms.

**Fix — Define two interaction tiers:**

| Tier | Elements | Feedback |
|------|----------|----------|
| **Controls** | Buttons, pills, toggles | Subtle press: `translateY(1px)` or small scale (primary CTA only) |
| **Content** | Cards, list rows | Border highlight + background color wash. No lift, no scale. |

**Standardize transitions:**
- `transition-colors duration-150` as the default
- `transition-transform duration-150` only where explicitly needed
- Remove `hover-lift` utility (or restrict to desktop-only with `@media (hover: hover)`)

---

## 8. Component-Specific Changes

### FilterPills (`src/components/ui/FilterPills.tsx`)
- [ ] Switch from floating pills to **segmented control** aesthetic:
  - Track: `bg-surface-2 ring-1 ring-border rounded-lg`
  - Active pill: `bg-surface-1 shadow-xs`
  - Instantly reads more "iOS-native premium"

### EmptyState (`src/components/EmptyState.tsx`)
- [ ] Add a faint tinted circle behind the icon: `bg-primary/8 rounded-full p-5`
- [ ] Reduce icon size from `56` to `40-48`
- [ ] Use the `cta` button variant for the action button

### StatCard (`src/components/ui/StatCard.tsx`)
- [ ] Add `tabular-nums` to the value display
- [ ] Remove `active:scale-95` — cards shouldn't bounce
- [ ] Restructure layout: label left, icon/delta right (more like an instrument reading)

### ListCard (`src/components/ui/ListCard.tsx`)
- [ ] Fix border rendering (depends on Card base fix)
- [ ] Improve checkbox styling: use `bg-surface-2 ring-1 ring-border` instead of raw `border-2`
- [ ] Use `data-[selected=true]` attribute styling for cleaner selected state

### QuickActions (`src/components/dashboard/QuickActions.tsx`)
- [ ] Make this a "Start Session" module with a hero CTA at the top
- [ ] Template rows: remove individual borders, use `bg-surface-2` rows with subtle separator
- [ ] Reduce visual weight of the Play icon per row

### StreakCard (`src/components/dashboard/StreakCard.tsx`)
- [ ] Standardize gradient direction and intensity (same as other tinted cards)
- [ ] Week progress tiles: use consistent `surface-2`/`surface-3` instead of ad-hoc alpha colors

### VolumeSummary (`src/components/dashboard/VolumeSummary.tsx`)
- [ ] Use a standardized "delta chip" component for `+x%` badges (reuse across PR cards too)
- [ ] Match gradient rules from tinted card variant

### Progress bar (`src/components/ui/Progress.tsx`)
- [ ] Add `rounded-full` to the indicator (it has it on root but not indicator explicitly)
- [ ] Consider a subtle gradient on the fill for more visual interest

---

## 9. Dark Mode

**What's working:** The blue-tinted dark background `oklch(0.08 0.02 260)` is modern and effective.

**What's broken:** Some tokens revert to achromatic — e.g., `--muted: oklch(0.18 0 0)` has no blue tint, breaking the cohesive feel.

**Fix:**
```css
.dark {
  --background:       oklch(0.10 0.02 260);
  --surface-1:        oklch(0.14 0.02 260);
  --surface-2:        oklch(0.18 0.02 260);
  --surface-3:        oklch(0.22 0.025 260);
  --muted-foreground: oklch(0.70 0.01 260);
  --border:           oklch(0.26 0.02 260);
  --border-strong:    oklch(0.32 0.025 260);
}
```

All dark neutrals must share the blue tint. Increase border contrast slightly so cards don't melt together. Avoid heavy shadows in dark mode — rely on border + surface differentiation instead.

---

## 10. Priority & Effort

| # | Task | Effort | Impact |
|---|------|--------|--------|
| 1 | Fix Card border bug + introduce surface tokens in `styles.css` | M (1-3h) | **Highest** — stops reading like a template |
| 2 | Unify interactions: remove global `active:scale`, define 2 tiers | S (30min) | High — immediately feels more polished |
| 3 | Restyle core primitives (Button cta variant, Input, Tabs, FilterPills) | M (2-3h) | High |
| 4 | Typography pass: tabular-nums, reduce bold, tighten scale | S (1h) | Medium |
| 5 | Bottom Nav + Header cleanup (icon sizes, material, Radix popovers) | M (2h) | Medium |
| 6 | Restyle dashboard modules (StreakCard, QuickActions, VolumeSummary) | L (1d) | Medium |
| 7 | Dark mode token unification | S (30min) | Medium |

**Total estimate: 2-3 days for the full pass.**

---

## Accessibility Guardrails

- After OKLCH tweaks, verify contrast ratios for `muted-foreground` on all surface levels (WCAG AA minimum)
- Ensure interactive states are distinguishable without color alone (border + background shift, not just hue)
- Test reduced-motion: wrap scale/translate interactions in `@media (prefers-reduced-motion: no-preference)`

---

## References

- Apps to study: **Strong**, **Hevy**, **JEFIT** (all premium fitness apps with restrained, instrument-panel aesthetics)
- Current stack: Tailwind CSS v4, Radix UI, class-variance-authority, Geist font
