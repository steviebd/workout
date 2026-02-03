# Women's Programs & Video Tutorials Implementation Plan

## Overview

This document outlines the implementation of two new strength programs designed for women (Stronger by the Day and Lift Weights Faster) with an integrated video tutorial system.

## Background

**Current State:**
- Existing programs are all powerlifting-focused (StrongLifts 5x5, 5/3/1, Madcow, nSuns, Sheiko, Candito, Nuckols)
- No programs specifically targeting women
- No video tutorial system for exercise guidance

**Target State:**
- Add 2 strength programs specifically designed for women
- Integrate YouTube video tutorials linked to default exercise library
- Users can access tutorials via click-to-open modal

---

## Programs to Add

### 1. Stronger by the Day (Megsquats)

**Source:** Meg Gallagher's popular program designed specifically for women

**Structure:** 3 days/week, Upper/Lower split

| Day | Focus | Main Lifts | Accessories |
|-----|-------|------------|-------------|
| 1 | Lower A | Squat (TM%), Hip Thrust | RDL, Leg Press, Core |
| 2 | Upper A | Bench Press (TM%), Barbell Row | Pull-ups, Triceps, Rear Delt |
| 3 | Full | Deadlift (TM%), OHP | Lunges, Accessories |

**Progression:** Training Max percentages (5/3/1 wave style, starting at 85% TM)

**Duration:** 12-week cycles

**Difficulty:** Beginner to Intermediate

**References:**
- megsquats.com/stronger-by-the-day
- Stronger by the Day app

### 2. Lift Weights Faster (Jen Sinkler)

**Source:** Jen Sinkler's hybrid strength + conditioning program

**Structure:** 3 days/week, Full Body with conditioning

| Day | Focus | Main Lifts | Conditioning |
|-----|-------|------------|--------------|
| 1 | Lower Strength | Squat 5x5, Deadlift 3x5 | Leg circuit (3 rounds) |
| 2 | Upper Strength | Bench 5x5, Row 4x6 | Upper body circuit (3 rounds) |
| 3 | Full Body | OHP 4x6, Accessory focus | Complex + Core finisher |

**Progression:** Linear progression on main lifts, wave loading for accessories

**Duration:** 8-week cycles

**Difficulty:** Intermediate

**References:**
- jen sinkler.com/lift-weights-faster
- Jen Sinkler's "Lift Weights Faster" book/program

---

## Video Tutorial System

### Architecture

**Data Model:** Extend `ExerciseLibraryItem` in `src/lib/exercise-library.ts`

```typescript
export interface VideoTutorial {
  youtubeId: string;      // e.g., "dQw4w9WgXcQ"
  title: string;          // "How to Squat Properly"
  coachName: string;      // "Megsquats", "Jen Sinkler", etc.
  keyCues: string[];      // ["Keep chest up", "Break at hips", "Knees out"]
  difficulty?: string;    // "beginner", "intermediate"
}

export interface ExerciseLibraryItem {
  id: string;
  name: string;
  muscleGroup: string;
  description: string;
  videoTutorial?: VideoTutorial;  // NEW: Optional video
}
```

### Videos to Include (Phase 1)

| Exercise | Creator | YouTube ID | Full Link | Title |
|----------|---------|------------|-----------|-------|
| Barbell Squat | LISAFIITT | Lq9bf_QUSns  | https://www.youtube.com/shorts/Lq9bf_QUSns | How to Squat with Perfect Form |
| Bench Press | LIndseyReneeBell | JvOJdUtx6UQ | https://www.youtube.com/shorts/7GtUE1MAniY | How to Bench Press (Barbell) |
| Deadlift | bodybuildingcom | O1lJXVUh2Pk | https://www.youtube.com/shorts/O1lJXVUh2Pk | How To Deadlift  |
| Overhead Press | Megsquats | YD7xwkprtTA | https://www.youtube.com/shorts/YD7xwkprtTA | 4 OVERHEAD PRESS TIPS FOR A NEW PR |
| Barbell Row | Melissa Kendter | SBA5DY_HfUU | https://www.youtube.com/shorts/SBA5DY_HfUU | Barbell Row |
| Hip Thrust | ArielYu_Fit | x_q2iQ4H5cY | https://www.youtube.com/shorts/_i6qpcI1Nw4 | Hip Thrust Tips
| Romanian Deadlift | ArielYu_Fit | CBOhr6H7BEY | https://www.youtube.com/shorts/CBOhr6H7BEY| How to Romanian Deadlift |
| Lunges | Melissa_Kendter | LdJg-qV0zJ0 | https://www.youtube.com/shorts/2ea3_b9rFdM | Walking Lunges |
| Pull-ups | KenziieJohnson | e4BvPZW6Iqk | https://www.youtube.com/shorts/j-H5VmNj-Iw | How to Do An Assissted Pull-Up |
| Dips | Jen Sinkler | naAv3nWlZFE | https://www.youtube.com/shorts/naAv3nWlZFE | How to Do Dips |
| Leg Press | Squat University | OlWE5rOjS5o | https://www.youtube.com/shorts/OlWE5rOjS5o | Leg Press Form Tips |
| Face Pulls | ArielYu_Fit | I41wK3wTZlo | https://www.youtube.com/shorts/I41wK3wTZlo | How to Face Pull |
| Plank | MarieKme | pSHjTRCQx5I | https://www.youtube.com/shorts/Pkp3SOvipZ0 | How to Plank Correctly |

**Notes on Video Selection:**
- Prioritize Megsquats and Jen Sinkler for women's-specific mechanics
- Squat University for evidence-based form cues
- All videos are 5-15 minutes (good for quick reference)
- All creators have established tutorial series

### UI Requirements

1. **Tutorial Button:** Add icon button next to exercise name (e.g., `<Play className="h-4 w-4" />`)

2. **Video Modal:** Create `VideoTutorialModal.tsx`
   - YouTube embed (responsive iframe)
   - Coach name and video title
   - Key cues list
   - Close button
   - Mobile-friendly

3. **Display Locations:**
   - Program workout page (programs.cycle.$cycleId_.tsx)
   - Exercise search/selection
   - Active workout screen

---

## Implementation Steps

### Phase 1: Program Data & Types (1-2 days)

- [ ] Update `src/lib/programs/types.ts` - Add `category` field
- [ ] Update `src/lib/programs/program-data.ts` - Add program entries
- [ ] Create `src/lib/programs/megsquats.ts` - Program logic
- [ ] Create `src/lib/programs/jen-sinkler.ts` - Program logic
- [ ] Update `src/lib/programs/index.ts` - Export new programs

### Phase 2: Database (0.5 day)

- [ ] Create Drizzle migration for `program_category` column
- [ ] Apply migration to dev/staging/prod databases

### Phase 3: Video System Data (1 day)

- [ ] Update `src/lib/exercise-library.ts` - Add video tutorials to 20-30 exercises
- [ ] Create `src/lib/programs/video-tutorials.ts` - Helper functions (optional)

### Phase 4: UI Components (2-3 days)

- [ ] Create `src/components/VideoTutorialModal.tsx`
- [ ] Update `ExerciseItem.tsx` - Add tutorial button
- [ ] Update `programs.cycle.$cycleId_.tsx` - Show tutorial button
- [ ] Update program card UI - Add category badges
- [ ] Add category filter to programs index page

### Phase 5: Testing (1 day)

- [ ] Test program generation with various 1RM inputs
- [ ] Verify video embeds work
- [ ] Test modal interactions
- [ ] Test on mobile devices
- [ ] Lint and typecheck

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/lib/programs/types.ts` | Modify | Add `category` field to ProgramInfo |
| `src/lib/programs/program-data.ts` | Modify | Add 2 program entries |
| `src/lib/programs/megsquats.ts` | Create | Stronger by the Day implementation |
| `src/lib/programs/jen-sinkler.ts` | Create | Lift Weights Faster implementation |
| `src/lib/programs/index.ts` | Modify | Export new programs |
| `src/lib/db/schema.ts` | Modify | Add program_category column |
| `src/lib/exercise-library.ts` | Modify | Add videoTutorial to exercises |
| `src/components/VideoTutorialModal.tsx` | Create | Video player modal |
| `src/components/ExerciseItem.tsx` | Modify | Add tutorial button |
| `src/routes/programs.cycle.$cycleId_.tsx` | Modify | Show tutorial button on exercises |
| `src/routes/programs._index.tsx` | Modify | Add category badges/filters |

---

## Key Design Decisions

### 1. Program-Specific vs Global Tutorials

**Decision:** Tutorials are attached to the **default exercise library**, not specific programs.

**Rationale:**
- Users copy exercises from library to their personal library
- Videos are pre-loaded for default exercises
- Simple to maintain (one source of truth)
- Works across all programs

### 2. YouTube Embeds

**Decision:** Use YouTube embeds with video ID only.

**Rationale:**
- No hosting costs
- High-quality content from established creators
- Familiar to users
- Mobile-friendly

**Implementation:**
```tsx
<iframe
  src={`https://www.youtube.com/embed/${youtubeId}`}
  allowFullScreen
/>
```

### 3. Tutorial Access

**Decision:** Click-to-open modal (not auto-play or permanent player).

**Rationale:**
- User controls when to watch
- Doesn't clutter workout interface
- Works in gym setting (tap when needed)

### 4. Program Difficulty

**Decision:** Both programs tagged as `beginner` to `intermediate`.

**Rationale:**
- Both are accessible to beginners
- Neither is as technically demanding as powerlifting programs
- Broad appeal to target demographic

---

## API Changes

No new API endpoints required for Phase 1.

Video tutorials are embedded client-side from YouTube.

If videos need to be stored server-side in the future:
- Add `video_tutorials` table
- `GET /api/video-tutorials?libraryId=xxx`

---

## Timeline Estimate

| Phase | Effort |
|-------|--------|
| Phase 1: Programs | 2 days |
| Phase 2: Database | 0.5 day |
| Phase 3: Video Data | 1 day |
| Phase 4: UI | 2-3 days |
| Phase 5: Testing | 1 day |
| **Total** | **6.5-7.5 days** |

---

## Testing Checklist

- [ ] Programs generate correct workouts for various 1RM inputs
- [ ] Video modal opens and closes properly
- [ ] YouTube embed loads and plays
- [ ] Tutorial button only shows when video exists
- [ ] Mobile responsive design
- [ ] Category badges display correctly
- [ ] Lint passes
- [ ] TypeScript compiles without errors

---

## Resources

### YouTube Creators for Tutorials

- **Megsquats** - megsquats.com, YouTube: @megsquats
- **Jen Sinkler** - jen sinkler.com, YouTube: @JenSinkler
- **Squat University** - YouTube: @SquatUniversity
- **Alan Thrall** - YouTube: @AlanThrall
- **Bret Contreras** - glutes study, hip thrust expert

### Program Resources

- Stronger by the Day: https://megsquats.com/stronger-by-the-day/
- Lift Weights Faster: https://jensinkler.com/lift-weights-faster/

---

## Open Questions

1. **Video Selection Criteria:** Prioritize creators who specifically address women's mechanics/form (Megsquats, Jen Sinkler). Fall back to high-quality general tutorials only when women's-specific content isn't available.

2. **Video Updates:** How should we handle video deprecation (creators removing videos)? Auto-fail or graceful fallback?

3. **Accessibility:** Should videos have closed captions support? (YouTube handles this)

4. **Offline Support:** Should we support downloading videos for offline gym use? (Out of scope for Phase 1)

---

## Implementation Status

### Video Tutorial Status

| Exercise | Creator | YouTube ID | Title | Status |
|----------|---------|------------|-------|--------|
| Barbell Squat | Megsquats | FVV98MS7xJ8 | How to Squat with Perfect Form | NOT STARTED |
| Bench Press | Megsquats | IOVA5JdAqqE | How to Bench Press (Barbell) | NOT STARTED |
| Deadlift | Megsquats | wTSBUl9T92s | How to Deadlift (Conventional) | NOT STARTED |
| Overhead Press | Megsquats | QAQ64hJ2jHs | How to Overhead Press | NOT STARTED |
| Barbell Row | Megsquats | 6SP1C10yL2U | How to Barbell Row | NOT STARTED |
| Hip Thrust | Megsquats | x_q2iQ4H5cY | How to Hip Thrust (Glute Bridge) | NOT STARTED |
| Romanian Deadlift | Megsquats | UC5F_4gB1Ks | How to Romanian Deadlift | NOT STARTED |
| Lunges | Jen Sinkler | LdJg-qV0zJ0 | How to Lunge Properly | NOT STARTED |
| Pull-ups | Megsquats | e4BvPZW6Iqk | How to Do a Pull-Up | NOT STARTED |
| Dips | Jen Sinkler | c4DAnQ6DtF8 | How to Do Dips | NOT STARTED |
| Leg Press | Squat University | IZO7k-1h6s4 | Leg Press Form Tips | NOT STARTED |
| Face Pulls | Megsquats | h7oW7zJ6Q3c | How to Face Pull | NOT STARTED |
| Plank | Jen Sinkler | pSHjTRCQx5I | How to Plank Correctly | NOT STARTED |

### Program Implementation Status

- [ ] **Phase 1: Programs & Types** - NOT STARTED
  - [ ] Update `src/lib/programs/types.ts` - Add `category` field
  - [ ] Update `src/lib/programs/program-data.ts` - Add program entries
  - [ ] Create `src/lib/programs/megsquats.ts` - Program logic
  - [ ] Create `src/lib/programs/jen-sinkler.ts` - Program logic
  - [ ] Update `src/lib/programs/index.ts` - Export new programs

- [ ] **Phase 2: Video System Data** - NOT STARTED
  - [ ] Update `src/lib/exercise-library.ts` - Add VideoTutorial interface
  - [ ] Add video tutorials to 20-30 exercises
  - [ ] Create `src/lib/programs/video-tutorials.ts` - Helper functions

- [ ] **Phase 3: UI Components** - NOT STARTED
  - [ ] Create `src/components/VideoTutorialModal.tsx`
  - [ ] Update `ExerciseItem.tsx` - Add tutorial button
  - [ ] Update `programs.cycle.$cycleId_.tsx` - Show tutorial button
  - [ ] Update program card UI - Add category badges
  - [ ] Add category filter to programs index page

- [ ] **Phase 4: Testing** - NOT STARTED
  - [ ] Test program generation with various 1RM inputs
  - [ ] Verify video embeds work
  - [ ] Test modal interactions
  - [ ] Test on mobile devices
  - [ ] Lint and typecheck

### YouTube Video Links Reference

| Exercise | Full Link |
|----------|-----------|
| Barbell Squat | https://youtu.be/FVV98MS7xJ8 |
| Bench Press | https://youtu.be/IOVA5JdAqqE |
| Deadlift | https://youtu.be/wTSBUl9T92s |
| Overhead Press | https://youtu.be/QAQ64hJ2jHs |
| Barbell Row | https://youtu.be/6SP1C10yL2U |
| Hip Thrust | https://youtu.be/x_q2iQ4H5cY |
| Romanian Deadlift | https://youtu.be/UC5F_4gB1Ks |
| Lunges | https://youtu.be/LdJg-qV0zJ0 |
| Pull-ups | https://youtu.be/e4BvPZW6Iqk |
| Dips | https://youtu.be/c4DAnQ6DtF8 |
| Leg Press | https://youtu.be/IZO7k-1h6s4 |
| Face Pulls | https://youtu.be/h7oW7zJ6Q3c |
| Plank | https://youtu.be/pSHjTRCQx5I |

---

## Architecture Decisions to Resolve

### 1. Static vs DB-Backed Programs

**Decision:** Use static-only. Category lives in `ProgramInfo` type only. No database migration required.

### 2. Conditioning Circuits Schema

**Decision:** Use `notes` field for circuit instructions (e.g., "3 rounds, 30s each"). Make circuit notes visually prominent in the workout UI (highlighted, distinct styling). Add structured circuit support in Phase 2 if needed.

### 3. Video Data Durability

**Issue:** YouTube videos can be removed, region-locked, or embedding-disabled. Single `youtubeId` is fragile.

**Enhanced VideoTutorial model:**

```typescript
export interface VideoTutorial {
  youtubeId: string;
  title: string;
  coachName: string;
  keyCues: string[];
  difficulty?: string;
  // NEW: durability fields
  lastValidatedAt?: string;      // ISO date when embed was verified
  fallbackUrl?: string;          // Direct YouTube link if embed fails
  alternateVideoId?: string;     // Backup video if primary removed
}
```

**Fallback behavior:**
1. If embed fails to load → show "Open in YouTube" button + key cues
2. If `alternateVideoId` exists → try that first
3. Never show broken iframe

**Future consideration:** Support array of tutorials per exercise for user choice (beginner vs advanced, different coaches).

### 4. Modal Accessibility Requirements

**Required a11y features for VideoTutorialModal:**

- [ ] Focus trap (tab stays within modal)
- [ ] ESC key closes modal
- [ ] `aria-modal="true"` and `role="dialog"`
- [ ] `aria-labelledby` pointing to modal title
- [ ] Return focus to trigger button on close
- [ ] "Open in YouTube" fallback link (for restricted networks/gym Wi-Fi)
- [ ] `loading="lazy"` on iframe (don't mount until modal opens)

**CSP/iframe considerations:**
- Add `https://www.youtube.com` to Content-Security-Policy `frame-src`
- Use `youtube-nocookie.com` embed domain for privacy

### 5. Women's Category

**Decision:** Use "women's" as an explicit category for programs targeting women.

**Rationale:**
- Clear signal to users about program intent
- Programs are designed specifically for women (form cues, accessibility)
- Users can filter and find programs that match their goals

**Category Types:**
- `powerlifting` - Competition-focused powerlifting programs
- `general-strength` - General strength programs
- `women's` - Programs specifically designed for women

---

## Revised Timeline Estimate

Original estimate of 6.5-7.5 days is optimistic. Accounting for:
- Video content verification (20-30 videos): +1 day
- Modal a11y + cross-surface integration: +1 day
- Circuit representation decisions: +0.5 day
- QA across existing programs (regression): +0.5 day

| Phase | Original | Revised |
|-------|----------|---------|
| Phase 1: Programs | 2 days | 2.5 days |
| Phase 2: Database | 0.5 day | 0 days (static-only) |
| Phase 3: Video Data | 1 day | 2 days |
| Phase 4: UI | 2-3 days | 3-4 days |
| Phase 5: Testing | 1 day | 1.5 days |
| **Total** | **6.5-7.5 days** | **9-10 days** |

---

## Notes

- All video URLs must be valid YouTube embeds
- Respect creator licensing - use official videos or fair use
- Consider attribution in UI (e.g., "Tutorial by Megsquats")
- Start with 20-30 videos, expand based on user feedback
