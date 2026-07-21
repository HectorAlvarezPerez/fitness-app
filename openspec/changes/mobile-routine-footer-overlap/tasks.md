# Tasks: Prevent Mobile Workout Footer Overlap

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 150–230 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Test and condition the reservation | Single PR | `npm test -- --run src/pages/WorkoutSession.test.tsx` | 375×812 viewport: timer/no-timer, then focus input | Revert test and conditional class in the two changed files |

## Phase 1: RED — Reservation Regression Tests

- [x] 1.1 Create `src/pages/WorkoutSession.test.tsx`; mock the store, DnD, and heavyweight children, and render `WorkoutSession` through `MemoryRouter` with a minimal active workout.
- [x] 1.2 RED: assert the no-timer scroll wrapper has exactly `pb-[calc(9rem+env(safe-area-inset-bottom)+var(--keyboard-inset,0px))]`, proving compact reservation and both inset terms remain.
- [x] 1.3 RED: assert the timer-present wrapper has exactly `pb-[calc(19rem+env(safe-area-inset-bottom)+var(--keyboard-inset,0px))]` and `lg:pb-[calc(9rem+env(safe-area-inset-bottom)+var(--keyboard-inset,0px))]`, proving timer clearance, safe area, keyboard alignment, and desktop compact override.
- [x] 1.4 Run `npm test -- --run src/pages/WorkoutSession.test.tsx`; confirm these new assertions fail before production code changes.

## Phase 2: GREEN — Conditional Reservation

- [x] 2.1 In `src/pages/WorkoutSession.tsx`, derive a local named padding-class choice from `Boolean(activeWorkout.restTimer)`: 9rem compact without timer; 19rem mobile plus `lg:` 9rem override with timer.
- [x] 2.2 Apply that choice only to the existing scroll-content wrapper; preserve the fixed footer, `env(safe-area-inset-bottom)`, and `var(--keyboard-inset,0px)`.
- [x] 2.3 Run `npm test -- --run src/pages/WorkoutSession.test.tsx`; confirm both reservation states pass.

## Phase 3: REFACTOR — Focused Verification

- [x] 3.1 Keep the conditional local and readable; make no `RestTimer`, `MainLayout`, desktop-layout, or action-flow changes. Rerun the focused test.
- [x] 3.2 Manual runtime harness: at 375×812, with and without a timer, scroll the final exercise and controls above the footer; with timer visible, focus a numeric/notes input and confirm footer and clearance rise together. (Maintainer waiver: visual/runtime validation omitted and residual risk explicitly accepted because the candidate was not deployed and no safe authenticated workout state was available.)
- [x] 3.3 Rollback: revert only `src/pages/WorkoutSession.tsx` conditional padding and `src/pages/WorkoutSession.test.tsx`; no data, API, migration, or deployment rollback is needed.
