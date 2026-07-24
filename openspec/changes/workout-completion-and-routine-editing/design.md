# Design: Workout Completion and Routine Editing

## Technical Approach

Keep the active workout as the live source of truth. `WorkoutSession` gets a per-mount initialization guard, exercise-level sortable cards, delete controls, and a post-success routine choice. `useStore` owns edit cleanup, persistence, completion sequencing, and the one-way `ActiveWorkoutExercise` → `Exercise` mapping. `buildActiveWorkoutDataPayload` already persists the complete ordered exercise array, so `src/lib/activeWorkout.ts` remains unchanged. Preserve the existing timer-aware `19rem` mobile reservation, `9rem` desktop override, safe-area inset, and keyboard inset.

## Architecture Decisions

| Option                                                | Tradeoff                                                                    | Decision                                                                                                                                                                                |
| ----------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Per-mount initialization ref plus resolved-load flags | Local to the routed session; requires explicit arming                       | Mark initialization consumed only after active-workout restoration and routine loading resolve, before accepting a restored workout or starting one. A terminal clear cannot re-arm it. |
| Store-owned delete/reorder                            | Centralizes invariants and persistence                                      | Add ID-based mutations; UI only supplies dragged/deleted IDs.                                                                                                                           |
| Finish result carries mapped template candidate       | Keeps transient state out of the prompt and survives `activeWorkout = null` | Return the candidate only after successful history save and active-row deletion.                                                                                                        |
| Update only `routines.exercises`                      | Preserves name, folder, defaults, and unrelated routines                    | Use a dedicated authenticated update by routine and user ID; do not reuse editor draft state.                                                                                           |

## Data Flow

```text
loads resolve -> initialization guard -> restore/start once

delete/reorder -> repair local ActiveWorkout -> saveActiveWorkoutProgress
               -> flushActiveWorkoutNow -> success | visible unsaved error

Finish -> capture/map snapshot -> insert history -> delete active row
       -> clear local/timer state -> return routine candidate
       -> Yes: update originating exercises -> dashboard
       -> No/dismissal or free workout: dashboard
```

If active-row deletion fails after history insertion, `finishWorkout` uses the returned history ID for compensating deletion, retains the active workout, reports failure, and returns no candidate. No prompt or navigation occurs. Successful cleanup also cancels the pending debounce and rest notification before follow-up history/PR refreshes.

## Cleanup Invariants

- Delete selects the exercise now at the removed index, otherwise the previous exercise; its set index is clamped, or both focus fields clear when no valid set remains.
- A timer whose `exerciseId` was removed becomes `null` and its scheduled push is cancelled.
- After deletion, every `supersetId` with fewer than two remaining members is removed. Reorder preserves ID-based focus, timer, and superset references.
- A failed edit flush returns `false`, raises the existing error notification, and keeps the timestamped local snapshot for reconciliation/retry; the UI never reports it as persisted.
- Template mapping copies IDs, names, muscles, notes, rest, tracking/bodyweight fields, supersets, set reps/weights/types, and dropsets. It strips `completed`, dropset completion, live focus, timer, timestamps, pause state, and session IDs.

## File Changes

| File                                     | Action | Description                                                                                                                                         |
| ---------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/store/useStore.ts`                  | Modify | Add result/types, mapper, delete/reorder/update-template methods, boolean flush result, cleanup, and terminal finish sequencing.                    |
| `src/pages/WorkoutSession.tsx`           | Modify | Gate initialization, render sortable exercise cards/delete controls, preserve reservation, and render Yes/No choice even after active state clears. |
| `src/store/useStore.workoutFlow.test.ts` | Create | Store RED tests for cleanup, order persistence, flush failure, completion/compensation, mapping, and originating-only update.                       |
| `src/pages/WorkoutSession.test.tsx`      | Modify | Page RED tests for resolved startup, no restart, prompt eligibility/Yes/No/dismissal, accessible exercise controls, and narrow timer reservation.   |

## Interfaces / Contracts

```ts
type WorkoutFinishResult =
  | { ok: true; routineUpdate?: { routineId: string; exercises: Exercise[] } }
  | { ok: false };

removeActiveWorkoutExercise(exerciseId: string): Promise<boolean>;
reorderActiveWorkoutExercises(activeId: string, overId: string): Promise<boolean>;
updateRoutineFromWorkout(candidate: { routineId: string; exercises: Exercise[] }): Promise<boolean>;
finishWorkout(): Promise<WorkoutFinishResult>;
flushActiveWorkoutProgress(): Promise<boolean>;
```

## Testing Strategy

Strict TDD: run `npm test -- --run src/store/useStore.workoutFlow.test.ts src/pages/WorkoutSession.test.tsx`. Store tests inspect persisted payload order/removal and all cleanup branches. RTL tests use deferred loaders, stateful store mocks, keyboard-capable labeled drag/delete controls, and a 375px viewport with a timer; assert the final controls remain focusable inside content carrying the exact `19rem + safe-area + keyboard` reservation. Because jsdom cannot prove geometry, manually verify 375×812 scrolling and focused-input keyboard inset.

## Threat Matrix

| Boundary                 | Applicability / RED tests           |
| ------------------------ | ----------------------------------- |
| Documentation-like paths | N/A — no executable classification. |
| Git repository selection | N/A — no VCS invocation.            |
| Commit state             | N/A — no VCS invocation.            |
| Push state               | N/A — no VCS invocation.            |
| PR commands              | N/A — no PR automation.             |

## Migration / Rollout

No schema migration or feature flag. Roll back the two production-file changes together; history already completed remains intact, and existing active-workout JSON stays compatible.

## Open Questions

None.
