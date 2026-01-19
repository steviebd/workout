# Security Assessment Report

**Date:** 20 January 2026
**Target:** Workout Application Codebase
**Reviewer:** Gemini CLI Agent

## Executive Summary

A comprehensive security review of the application's codebase was conducted, focusing on data isolation and user authorization. The authentication mechanism using JWTs and WorkOS integration appears robust. Top-level resource access (e.g., fetching or deleting a whole workout) is correctly protected.

However, **critical Insecure Direct Object Reference (IDOR)** vulnerabilities were identified in the handling of nested resources (Workout Exercises and Workout Sets). These vulnerabilities allow authenticated users to view, modify, or delete data belonging to other users if they can guess or obtain the relevant IDs (UUIDs).

## detailed Findings

### 1. Authentication & Session Management
*   **Status:** ✅ **Secure**
*   **Mechanism:** The application uses `jose` for JWT handling with `HS256` signing. Tokens include `sub` (WorkOS ID), `userId` (Local DB ID), and `email`.
*   **Session Retrieval:** The `getSession` helper correctly parses the cookie and validates the JWT signature before returning user details. This foundation is solid.

### 2. Top-Level Resource Authorization (Workouts)
*   **Status:** ✅ **Secure**
*   **Observation:** Operations on the `workouts` table (GET, PUT, DELETE) consistently enforce user ownership.
*   **Evidence:** Functions in `src/lib/db/workout.ts` like `getWorkoutById`, `updateWorkout`, and `deleteWorkout` all include the clause `and(eq(workouts.id, workoutId), eq(workouts.userId, userId))`.

### 3. Nested Resource Authorization (Exercises & Sets)
*   **Status:** ❌ **Critical Vulnerability**
*   **Description:** API routes handling child resources do not verify that the parent resource belongs to the requesting user.

#### A. Adding Exercises to Workouts
*   **Vulnerability:** IDOR
*   **Location:** `src/routes/api/workouts.$id.exercises.ts` (POST handler)
*   **Details:** The route accepts a `workoutId` (via URL params) and adds an exercise to it. It checks if the user is authenticated but **does not** verify that the target `workoutId` belongs to that user.
*   **Impact:** A malicious user can inject exercises into another user's workout.

#### B. Creating Workout Sets
*   **Vulnerability:** IDOR
*   **Location:** `src/routes/api/workouts.sets.ts` (POST handler)
*   **Details:** The route accepts a `workoutExerciseId` and creates a set. It **does not** verify that the `workoutExerciseId` is linked to a workout owned by the requesting user.
*   **Impact:** Users can add sets to exercises they do not own.

#### C. Updating & Deleting Workout Sets
*   **Vulnerability:** IDOR
*   **Location:** `src/routes/api/workouts.sets.$setId.ts` (PUT and DELETE handlers)
*   **Details:** These routes perform operations based solely on `setId`. There is **no verification** that the set belongs to a workout owned by the current user.
*   **Impact:** Users can modify or delete workout sets belonging to other users.

## Recommendations

### Immediate Remediation

1.  **Refactor Data Access Layer:**
    Update `src/lib/db/workout.ts` to require `userId` for all modification operations, or create validation helpers.

    *   **`createWorkoutExercise`:** Should accept `userId` and verify `workoutId` ownership before insertion.
    *   **`createWorkoutSet`:** Should accept `userId`, look up the parent `workout_exercise` -> `workout`, and verify `workout.userId`.
    *   **`updateWorkoutSet` / `deleteWorkoutSet`:** Should accept `userId`, look up the parent chain (`set` -> `workout_exercise` -> `workout`), and verify ownership.

2.  **Patch API Routes:**
    If modifying the DB functions directly is too invasive immediately, perform an ownership check in the API route before calling the DB function.

    *Example Fix for `src/routes/api/workouts.sets.$setId.ts`:*
    ```typescript
    // BEFORE
    await updateWorkoutSet(db, params.setId, updateData);

    // AFTER
    const isOwner = await verifySetOwnership(db, params.setId, session.userId);
    if (!isOwner) return Response.json({ error: 'Unauthorized' }, { status: 403 });
    await updateWorkoutSet(db, params.setId, updateData);
    ```

### Long-Term Improvements

1.  **Row-Level Security (RLS):** If the database technology supports it (D1 is SQLite-based, so app-level RLS is common), consider a middleware or ORM plugin that automatically scopes all queries to `session.userId`.
2.  **UUID Randomness:** While UUIDs are hard to guess, they are not a security control. The application currently relies on UUIDs (`crypto.randomUUID()`), which prevents casual enumeration but does not stop targeted attacks or leaked IDs. Authorization checks are mandatory.

## Conclusion

The application has a strong auth foundation but incomplete authorization logic for nested data. Prioritize fixing the endpoints related to **Sets** and **Workout Exercises** to prevent data tampering.
