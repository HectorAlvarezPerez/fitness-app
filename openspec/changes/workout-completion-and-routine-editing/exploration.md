## Exploration: Workout completion and routine editing

### Current State

A routine workout is created by `WorkoutSession` only after `loadActiveWorkout()` resolves. Its initialization effect starts `startWorkout(routine)` whenever the routed screen has no `activeWorkout`. Completing a workout calls `finishWorkout()`, which inserts the history row, deletes `active_workouts`, and sets `activeWorkout` to `null` before subsequently loading history and personal records. During those awaited follow-up loads, the same routed `WorkoutSession` re-renders with `activeWorkout === null`; its initialization effect therefore starts the routine again. The finish handler then sees a newly-created active workout and does not navigate away. This is the concrete post-save reopening defect.

The mobile workout footer is fixed and conditionally contains `RestTimer`. `WorkoutSession` now selects a 19rem mobile content reservation when the timer is visible (9rem otherwise), including the existing safe-area and keyboard insets. This was added in `b549da4`; the prior mismatch was that a 9rem reservation did not cover the larger timer-plus-actions footer. The current helper test covers the two reservation modes, but no rendered narrow-viewport interaction test proves that the final exercise clears the overlay.

Live workouts can add exercises and reorder/delete individual sets, but cannot delete or reorder exercises: `WorkoutSession` renders plain exercise cards with no exercise drag context or delete action, and `useStore` exposes no active-workout exercise removal/reorder mutation. Routine editing already has exercise drag/delete controls, and it persists only on explicit Save. Active workout changes are persisted as the whole JSON payload in `active_workouts`, so live exercise mutations can use the same immediate local update plus existing debounced/flush persistence path.

### Affected Areas

- `src/pages/WorkoutSession.tsx` — route/session initialization must be single-shot across a terminal finish; owns live exercise card UI, existing set DnD, timer-dependent reservation, and completion confirmation flow.
- `src/store/useStore.ts` — owns active-workout mutation/persistence and `finishWorkout`; needs live exercise delete/reorder operations and a deliberate template-update operation or result contract.
- `src/lib/activeWorkout.ts` — persists/restores the full active-workout exercise order; likely helper location only if extraction makes the live-to-template mapping clearer.
- `src/pages/RoutineEditor.tsx` — established reference for exercise-level DnD/delete and the editable routine exercise shape; should not be used to mutate a template implicitly.
- `src/pages/RoutinesList.tsx` and `src/components/ActiveWorkoutFooter.tsx` — rely on `activeWorkout` to show resume affordances; regression scope for terminal completion.
- `src/pages/WorkoutSession.test.tsx` — current reservation-only test; primary page regression test location.
- `src/store/useStore.sync.test.ts` and `src/store/useStore.bootstrap.test.ts` — reference patterns for active-workout load/persistence tests; no current coverage for exercise deletion/reordering or completion race.
- `src/lib/activeWorkout.test.ts` — payload round-trip coverage; add order/deletion persistence assertions if helper behavior changes.

### Approaches

1. **Guard terminal session initialization; add explicit live-exercise mutations; ask after a successful finish**
   - Make workout route initialization eligible only once per mounted route/session attempt, so a post-finish `activeWorkout: null` cannot start another workout. Keep normal startup/resume semantics intact.
   - Add store operations that remove/reorder active exercises, repair current exercise/rest-timer/superset references when needed, and persist through the existing active-workout path. Add exercise-card delete control and exercise-level DnD in the live screen.
   - After `finishWorkout` has succeeded, present an explicit yes/no choice to update the originating routine template from the captured final live exercise order/content. `No` preserves the template; free workouts have no template update option.
   - Pros: Directly fixes all observed behavior with bounded changes; preserves the explicit-save template model; avoids database schema work.
   - Cons: Requires clear edge-case rules for deleting the focused/timer exercise and for handling a routine deleted or unavailable at finish time.
   - Effort: Medium.

2. **Treat active workouts as a bidirectional live draft of their routine**
   - Mirror every add/delete/reorder mutation into the routine automatically, then finish without a decision prompt.
   - Pros: Fewer end-of-workout prompts.
   - Cons: Violates the required explicit yes/no template choice; changes a template while a user is only logging a session; makes cancellation and concurrent edits risky.
   - Effort: Medium/High.

3. **Move exercise editing into the routine editor only**
   - Keep live sessions immutable at exercise level and ask users to leave the session to edit its template.
   - Pros: Minimal active-workout state change.
   - Cons: Does not satisfy in-workout exercise deletion/reordering and disrupts workout flow.
   - Effort: Low, but incomplete.

### Recommendation

Use approach 1. Keep the active workout as an independent session snapshot. Add a one-time initialization guard to `WorkoutSession` so only initial route entry may create a session; completion must remain terminal for that mounted route. Implement live exercise delete/reorder through explicit store mutations that immediately update local state and reuse `saveActiveWorkoutProgress`/flush behavior. At successful completion of a routine-backed workout, ask whether to copy the final live exercise configuration to its template; the user must explicitly choose Yes or No, and the app must never update the template before that choice or for free workouts.

Proposal acceptance boundaries:

- A successful workout finish creates one history row, clears the active workout, navigates away, and does not recreate the routed routine.
- While a workout is in progress, the user can delete and reorder exercises; mutations survive reload/resume through `active_workouts` persistence.
- Deleting the current exercise selects a valid remaining exercise/set or clears the current position when none remain; deleting the timer's exercise clears the rest timer; supersets do not retain a single-member group.
- The existing mobile reservation remains timer-aware, preserves safe-area and keyboard insets, and lets the final exercise scroll above the timer footer.
- After a routine-backed workout saves successfully, the user receives an explicit Yes/No template-update choice. Yes updates only that routine with the final live exercise configuration; No leaves it unchanged. No prompt is shown after a failed save, canceled workout, or free workout.

### Risks

- The one-time initialization guard must still wait for both active-workout restoration and routine availability; setting it before those prerequisites resolve would prevent legitimate initial starts.
- Deleting/reordering exercises changes navigation semantics: current focus, an active rest timer, and two-member supersets require deterministic cleanup.
- A template update must map `ActiveWorkoutExercise` back to `Exercise` without accidentally persisting transient fields such as completion state or rest-timer state; it must also handle a missing/deleted routine without undoing a completed session.
- The current 19rem reservation is intentional and already deployed in this HEAD. Altering it unnecessarily risks reintroducing the footer overlap; verification should include a narrow mobile viewport, active rest timer, and focused input/keyboard inset.

### Ready for Proposal

Yes. Product semantics are sufficiently evidenced for the three requested behaviors. The only decision that must remain in the product flow, rather than be assumed by implementation, is the explicit post-success Yes/No template update; default behavior before a choice is no template change.
