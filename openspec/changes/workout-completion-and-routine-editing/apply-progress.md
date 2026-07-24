# Apply Progress: Workout Completion and Routine Editing

## Status

- Mode: Strict TDD
- Artifact store: OpenSpec
- Delivery: stacked-to-main, Slice 1 of 3
- Completed: tasks 1.1–1.4 (4/12 total)
- Next pending: task 2.1
- Boundary: persisted live exercise deletion/reordering and dependent-state repair only

## Completed Tasks

- [x] 1.1 Store RED coverage for delete/reorder resume and observable failed persistence.
- [x] 1.2 ID-based store edits, boolean flush result, immediate persistence, and recoverable local snapshot.
- [x] 1.3 Store RED coverage for focus/timer/superset cleanup and unrelated reorder stability.
- [x] 1.4 Deterministic focus clamp/clear, timer push cancellation, singleton-superset cleanup, and reorder preservation.

## TDD Cycle Evidence

| Task | Test file / layer                                            | Safety net                           | RED                                      | GREEN                                              | TRIANGULATE                                                                         | REFACTOR                                                  |
| ---- | ------------------------------------------------------------ | ------------------------------------ | ---------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1.1  | `src/store/useStore.workoutFlow.test.ts` / store integration | 1/1 payload flush-resume test passed | 1 passed, 3 failed: mutations absent     | 4/4 passed                                         | Delete and reorder resume plus both failure paths                                   | Helpers consolidated; 9/9 final                           |
| 1.2  | Same / store integration                                     | 1/1                                  | Covered by 1.1 RED                       | 4/4 passed with minimal ID edits and boolean flush | Delete/reorder failure retains retryable snapshot                                   | Boolean persistence path kept on existing payload builder |
| 1.3  | Same / store integration                                     | 4/4 prior cycle                      | 7 passed, 2 failed: stale focus remained | Covered by 1.4 GREEN                               | Next/clamped focus, previous/clear, 3-member superset, unrelated reorder references | Test setup compacted without behavior change              |
| 1.4  | Same / store integration                                     | 7/9 before implementation            | Covered by 1.3 RED                       | 9/9 passed                                         | Timer-owner vs unrelated timer; singleton cleanup vs valid two-member remainder     | Extracted pure removal/clamp helpers; 9/9 remained green  |

## Test Summary

- Total tests written: 9 (8 Slice-1 behavior tests, 1 approval/safety-net test)
- Total tests passing: 9
- Layer: store integration (Zustand + real active-workout serializer/load path; Supabase network boundary mocked)
- Pure functions created: 2

## Work Unit Evidence

| Evidence                   | Result                                                                                                                                                                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused tests              | `npm test -- --run src/store/useStore.workoutFlow.test.ts` — PASS, 1 file / 9 tests                                                                                                                                                               |
| Resume/persistence harness | `npm test -- --run src/store/useStore.workoutFlow.test.ts -t "resume\|restores"` — PASS, 3 tests / 6 skipped; delete and reorder round-trip through flush payload and load reconciliation                                                         |
| Exact-path lint            | `npx eslint src/store/useStore.ts src/store/useStore.workoutFlow.test.ts` — PASS, 0 errors / 17 pre-existing store warnings                                                                                                                       |
| Exact-file type check      | `npx tsc --noEmit --skipLibCheck --jsx react-jsx --target ES2022 --module ESNext --moduleResolution bundler --lib ES2022,DOM,DOM.Iterable --types vitest/globals,vite/client src/store/useStore.ts src/store/useStore.workoutFlow.test.ts` — PASS |
| Rollback boundary          | Revert the Slice-1 additions in `src/store/useStore.ts`, remove `src/store/useStore.workoutFlow.test.ts`, and uncheck tasks 1.1–1.4; no UI, schema, completion, template, or deployment behavior is involved                                      |

## Implementation Notes

- Delete selects the exercise now at the removed index, otherwise the previous exercise; it clamps the existing set index or clears both focus fields when the selected exercise has no set.
- Deleting a timer owner clears the timer and cancels its scheduled push.
- Superset IDs with fewer than two remaining members are removed; valid supersets remain.
- Reorder moves by stable exercise IDs and preserves exercise objects plus focus, timer, and superset references.
- Every edit stamps local state, cancels the debounce through the immediate flush, returns persistence success/failure, and leaves a failed local snapshot available for retry.

## Deviations and Risks

- No design deviation.
- The store runtime boundary is covered with the real serializer/load path and a mocked Supabase network boundary; no browser UI exists in Slice 1.
- Project-wide tests and type checking were intentionally not run; validation stayed limited to changed files and the assigned focused command.
- Tasks 2.1–3.4 remain untouched.

## Frozen Severe Correction Batch 1

- Transaction: `workout-editing-slice-1`, generation 1, ordinary 4R.
- Frozen IDs corrected: `RISK-001`, `RESILIENCE-001`, `RELIABILITY-001`.
- Informational findings intentionally untouched: `RISK-002`, `READABILITY-001`.
- Boundary: serialize active-workout flushes, bind each queued flush to its invocation-time persisted owner, revalidate the authenticated and current store owner after awaited auth, and suppress stale failure notifications after ownership/session reset.

### Correction TDD Evidence

| Stage                 | Exact result                                                                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Safety net            | Original Slice-1 suite passed 9/9 before correction tests                                                                                    |
| RED                   | 12 tests: 9 passed, 3 failed; the older overlapping write became final, and both awaited-auth owner-switch cases incorrectly returned `true` |
| GREEN                 | 12/12 passed after owner-bound serialization                                                                                                 |
| REFACTOR/final        | Queue recovery remains internal while the caller still receives its own result; focused suite remained 12/12                                 |
| Focused command       | `npm test -- --run src/store/useStore.workoutFlow.test.ts` — PASS, 1 file / 12 tests                                                         |
| Exact-path lint       | PASS, 0 errors / 17 pre-existing store warnings                                                                                              |
| Exact-file TypeScript | PASS with the Slice-1 command recorded above                                                                                                 |
| Diff check            | PASS for the tracked store and new focused test file                                                                                         |

### Correction Identity

- Initial candidate tree: `42ee1cbcd6ed6c08332003300c7d7ec995914b97`.
- Initial store blob: `7ca14310b08a10b241f6c4bb524ee46d1ee93d43`.
- Initial test blob: `9d4f9bcfaea49d9806ceb04ea7da0d266eb4846e`.
- Corrected store blob: `21f6616fe0e643d943908b35318fc4c071070cf8`.
- Corrected test blob: `12392890a7b26d9ea2cc0f57561351fd2d2c84e6`.
- Store/test correction delta SHA-256: `077f86df62f511f0e8c61a43dff5f0c2047f35f894fe59c45c18118915ea5298`.

### Correction Rollback

Revert only the correction delta after candidate tree `42ee1cbcd6ed6c08332003300c7d7ec995914b97`: remove the active-workout flush queue/owner checks/stale-notification guards and the three `monotonic owner-bound persistence` tests. The original nine Slice-1 tests and tasks 1.1–1.4 remain intact.

No fix-caused severe issue was observed in the bounded focused suite.

## Frozen Severe Correction Batch 2

- Transaction: `workout-editing-slice-1-v2`, generation 1, ordinary 4R.
- Frozen IDs corrected: `RESILIENCE-001`, `RELIABILITY-001`.
- Informational findings intentionally untouched: `RISK-001`, `RELIABILITY-002`, `READABILITY-001`, `READABILITY-002`.
- Boundary: owner-scoped persistence queues, bounded abortable writes, and lifecycle PATCH serialization with a server-side client-timestamp precondition.

### V2 Correction TDD Evidence

| Stage                 | Exact result                                                                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Safety net            | Existing corrected Slice-1 suite passed 12/12 before v2 tests                                                                                                                  |
| RED                   | 14 tests: 12 passed, 2 failed; the delayed lifecycle PATCH restored the pre-edit payload, and the unresolved old-owner write prevented the new owner from reaching persistence |
| GREEN                 | 14/14 passed after owner-scoped bounded queues and queued lifecycle persistence                                                                                                |
| REFACTOR/final        | The same timeout/abort helper bounds both Supabase writes and keepalive PATCHes; focused suite remained 14/14                                                                  |
| Focused command       | `npm test -- --run src/store/useStore.workoutFlow.test.ts` — PASS, 1 file / 14 tests                                                                                           |
| Exact-path lint       | PASS, 0 errors / 17 pre-existing store warnings                                                                                                                                |
| Exact-file TypeScript | PASS with the Slice-1 command recorded above                                                                                                                                   |
| Diff check            | PASS for the tracked store and new focused test file                                                                                                                           |

### V2 Correction Identity

- Initial candidate tree: `d32138c9076fcf07a6af14d44894068963c6d95b`.
- Initial store blob: `21f6616fe0e643d943908b35318fc4c071070cf8`.
- Initial test blob: `12392890a7b26d9ea2cc0f57561351fd2d2c84e6`.
- Corrected store blob: `3d7b0c8195ef220c332a40af215230f7ed97acfc`.
- Corrected test blob: `13ab5a85e432e77da49a9a16f1edbde726da4125`.
- Store/test correction delta SHA-256: `ba9fcc8e3db818c434f001195e23b2fd0af5c4d504e1856e7a11d9497f421d0c`.

### V2 Correction Rollback

Revert only the correction delta after candidate tree `d32138c9076fcf07a6af14d44894068963c6d95b`: restore the single queue, remove the bounded write helper and conditional queued lifecycle PATCH, and remove the two final v2 tests. The original twelve tests and prior severe corrections remain intact.

No fix-caused severe issue was observed in the bounded v2 focused suite.

## Frozen Severe Correction Batch 3

- Frozen IDs corrected: `RISK-001`, `RESILIENCE-001`.
- Informational warnings and suggestions intentionally untouched.
- Boundary: ordinary same-owner active-workout upserts wait for the underlying write to settle; owner partitioning and the guarded, bounded lifecycle PATCH path remain unchanged.

### V3 Correction TDD Evidence

| Stage                 | Exact result                                                                                                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RED                   | Targeted regression failed: after 10,001 ms the unresolved first same-owner upsert had timed out and the newer edit had started (`pendingUpserts` was 2; expected 1)                     |
| GREEN                 | Targeted regression passed after removing the lifecycle timeout from ordinary upserts                                                                                                    |
| Focused command       | `npm test -- --run src/store/useStore.workoutFlow.test.ts` — PASS, 1 file / 15 tests                                                                                                     |
| Exact-path lint       | `npx eslint src/store/useStore.ts src/store/useStore.workoutFlow.test.ts` — PASS, 0 errors / 17 pre-existing store warnings                                                              |
| Exact-file TypeScript | `npx tsc --noEmit --skipLibCheck --jsx react-jsx --target ES2022 --module ESNext --moduleResolution bundler --lib ES2022,DOM,DOM.Iterable --types vitest/globals,vite/client ...` — PASS |
| Format / diff check   | Exact-file Prettier check and `git diff --check` — PASS                                                                                                                                  |

### V3 Correction Identity

- Initial candidate tree: `cbc8c9d8e3110a46c5f6cefc6b3a69bf446c8663`.
- Initial store blob: `3d7b0c8195ef220c332a40af215230f7ed97acfc`.
- Initial test blob: `13ab5a85e432e77da49a9a16f1edbde726da4125`.
- Corrected store blob: `a7f1e7c73b6c49c6d8829ef166ccef6927d2b2b2`.
- Corrected test blob: `ba202962200355c79fb3ed743dd2e3c45b4f61e5`.
- Store/test correction delta SHA-256: `bc7142a892df733e533f4dfda21e8026dd3d7d39a6224a8ee7135a793a8146c6`.

### V3 Correction Rollback

Revert only the batch-3 delta after candidate tree `cbc8c9d8e3110a46c5f6cefc6b3a69bf446c8663`: restore the bounded wrapper around ordinary active-workout upserts and remove the same-owner pending-write regression. Owner partitioning, lifecycle PATCH serialization, and all earlier Slice-1 corrections remain intact.

No fix-caused severe issue was observed in the focused batch-3 validation.
