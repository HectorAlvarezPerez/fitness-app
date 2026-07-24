# Tasks: Workout Completion and Routine Editing

## Review Workload Forecast

| Field                   | Value                       |
| ----------------------- | --------------------------- |
| Estimated changed lines | 430–560                     |
| 400-line budget risk    | High                        |
| Chained PRs recommended | Yes                         |
| Suggested split         | Slice 1 → Slice 2 → Slice 3 |
| Delivery strategy       | ask-on-risk                 |
| Chain strategy          | stacked-to-main             |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal                                | Likely PR | Focused test command                                       | Runtime harness               | Rollback boundary          |
| ---- | ----------------------------------- | --------- | ---------------------------------------------------------- | ----------------------------- | -------------------------- |
| 1    | Store edit persistence/repair       | Slice 1   | `npm test -- --run src/store/useStore.workoutFlow.test.ts` | Resume edited session         | Store mutations/tests      |
| 2    | Terminal finish/template contract   | Slice 2   | `npm test -- --run src/store/useStore.workoutFlow.test.ts` | Finish then Yes/No            | Finish/template code/tests |
| 3    | Route guard and accessible controls | Slice 3   | `npm test -- --run src/pages/WorkoutSession.test.tsx`      | 375×812 timer scroll/keyboard | Session page/tests         |

Apply routing: wait for explicit approval of the three stacked-to-main slices; then commit each slice directly to main in order.

## Phase 1: Store edits (Slice 1)

- [x] 1.1 RED: create `src/store/useStore.workoutFlow.test.ts` for delete-resume order, reorder-resume order, and failed flush reporting/recoverability.
- [x] 1.2 GREEN: in `src/store/useStore.ts`, add ID delete/reorder plus boolean flush; persist via existing payload and retain local snapshot on error.
- [x] 1.3 RED: add focused/timed two-member-superset deletion and unrelated reorder-reference cases.
- [x] 1.4 GREEN→REFACTOR: repair focus/set clamp, timer/push, and singleton supersets; preserve reorder IDs; run Slice 1 command.

## Phase 2: Completion ownership (Slice 2)

- [x] 2.1 RED: add one-history/no-active/no-restart success, unresolved startup, failed-save recovery, and delete-after-insert compensation cases.
- [x] 2.2 GREEN: make `finishWorkout` return the typed result; cancel debounce/rest push, delete active row, compensate history deletion on failure, and clear only on success.
- [x] 2.3 RED: add originating-only mapped-template Yes; No/dismissal; missing template; and free/cancelled/failed-no-prompt cases.
- [x] 2.4 GREEN→REFACTOR: map only durable exercise fields and add authenticated `routines.exercises` update; run Slice 2 command.

## Phase 3: Session wiring and viewport (Slice 3)

- [ ] 3.1 RED: extend `src/pages/WorkoutSession.test.tsx` with deferred loads/no start before both resolve and no post-finish restart.
- [ ] 3.2 GREEN: add per-mount consumed initialization guard in `src/pages/WorkoutSession.tsx`; accept restore or start once.
- [ ] 3.3 RED: add keyboard-capable reorder/delete labels, prompt eligibility/Yes/No/dismissal, and 375px timer reservation/focusability tests.
- [ ] 3.4 GREEN→REFACTOR: wire sortable exercise cards and template choice after success; retain exactly `19rem`, desktop `9rem`, safe-area and keyboard reservation; run Slice 3 command and manually check 375×812 scrolling/keyboard.
