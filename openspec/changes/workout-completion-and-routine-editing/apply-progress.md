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

## Slice 2: Terminal Finish and Originating Template

- Completed tasks: 2.1–2.4 (8/12 total).
- Next pending: task 3.1.
- Boundary: store-owned terminal finish sequencing, typed result, recovery/compensation, durable live-to-template mapping, and explicit authenticated originating-routine update.
- UI startup/navigation and prompt rendering remain assigned to Slice 3 and were intentionally untouched.

### Slice 2 TDD Evidence

| Stage                 | Exact result                                                                                                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Safety net            | Existing Slice-1 suite remained green: 15/15 tests                                                                                                                                                                                                |
| RED                   | 25 tests: 16 passed, 9 failed on the missing typed result, terminal failure recovery/compensation, candidate mapping, explicit routine update, missing-template handling, and free/failed prompt eligibility                                      |
| GREEN                 | 25/25 passed after serialized terminal cleanup and the separate authenticated template-update operation                                                                                                                                           |
| REFACTOR/final        | Tests consume the exported typed contract without casts; template mapping excludes live completion/timer/image/session fields; focused suite remained 25/25                                                                                       |
| Focused command       | `npm test -- --run src/store/useStore.workoutFlow.test.ts` — PASS, 1 file / 25 tests                                                                                                                                                              |
| Exact-path lint       | `npx eslint src/store/useStore.ts src/store/useStore.workoutFlow.test.ts` — PASS, 0 errors / 17 pre-existing store warnings                                                                                                                       |
| Exact-file TypeScript | `npx tsc --noEmit --skipLibCheck --jsx react-jsx --target ES2022 --module ESNext --moduleResolution bundler --lib ES2022,DOM,DOM.Iterable --types vitest/globals,vite/client src/store/useStore.ts src/store/useStore.workoutFlow.test.ts` — PASS |
| Format / diff check   | Exact-file Prettier checks and `git diff --check` — PASS                                                                                                                                                                                          |

### Slice 2 Identity

- Initial candidate tree: `1ee83a24deee7294ba09844e81d71adbb7aae1b9`.
- Initial store blob: `a7f1e7c73b6c49c6d8829ef166ccef6927d2b2b2`.
- Initial test blob: `ba202962200355c79fb3ed743dd2e3c45b4f61e5`.
- Initial tasks blob: `e303bd7c1dcc95520c6f8ed8550d5a42ce4acba8`.
- Corrected store blob: `86e9fb8ca289ed48fe8b2986fe3b0c4ad159ae50`.
- Corrected test blob: `3176f6d23fbd922dce1539eba258094ea352e8aa`.
- Corrected tasks blob: `036ec1f1fce935b7b06463f95d43950048c2ef8c`.
- Store/test Slice-2 delta SHA-256: `1bf9e212b6e5203dbc94385103cd2ee382c8d73dca7dc099d8cbc2d6c3ada024`.

### Slice 2 Rollback

Revert only the Slice-2 delta after candidate tree `1ee83a24deee7294ba09844e81d71adbb7aae1b9`: restore the prior void `finishWorkout`, remove `WorkoutFinishResult`, the durable mapper, `updateRoutineFromWorkout`, and the ten Slice-2 tests, then uncheck tasks 2.1–2.4. Slice 1 and its correction batches remain intact.

Remaining bounded risk: if active-row deletion and the compensating history deletion both fail, the active workout remains locally recoverable but the inserted history row may require later reconciliation. No schema or production changes were authorized for stronger atomicity.

### Slice 2 Final Identity Addendum

The final GREEN refactor suppresses prompt eligibility when the originating routine is already missing. It does not change the 25/25 focused result or the Slice-2 boundary. The following final hashes supersede the pre-refactor store/test hashes above:

- Final store blob: `08d157bd008c7817a80efc5b5894be4e5468a07c`.
- Final test blob: `45d500940e6386ef74bebba51a75107d1c26650e`.
- Final store/test Slice-2 delta SHA-256: `89102453b0e5c35e49a7e6ddfda3a200bfe2cc3b580a4bca4337fd7c17e64178`.

## Frozen Severe Slice 2 Correction

- Frozen IDs corrected: `RISK-001`, `RISK-002`, `RESILIENCE-001`, `RESILIENCE-002`, `RELIABILITY-001`, `RELIABILITY-002`.
- Informational findings intentionally untouched.
- Schema gate: the live Supabase OpenAPI confirms UUID primary keys on `active_workouts.id` and `workout_sessions.id`, plus immutable `active_workouts.started_at`; no schema change is required.
- Boundary: stable history identity, ambiguous-insert reconciliation, owner/workout-conditional active deletion with returned-row proof, inspected compensation, and post-await local ownership guards.

### Severe Correction TDD Evidence

| Stage                 | Exact result                                                                                                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Safety net            | Existing Slice-1/2 focused suite remained green: 25/25 tests                                                                                                                                                                                      |
| RED                   | 30 tests: 25 passed, 5 failed on duplicate history after ambiguous commit/retry, ignored fulfilled compensation error, deletion of a newer cross-tab row, and local owner/workout overwrite after deferred history/delete writes                  |
| GREEN                 | 30/30 passed after stable-ID history reconciliation, conditional returned-row deletion, compensation inspection, and captured-local guards                                                                                                        |
| Focused command       | `npm test -- --run src/store/useStore.workoutFlow.test.ts` — PASS, 1 file / 30 tests                                                                                                                                                              |
| Exact-path lint       | `npx eslint src/store/useStore.ts src/store/useStore.workoutFlow.test.ts` — PASS, 0 errors / 17 pre-existing store warnings                                                                                                                       |
| Exact-file TypeScript | `npx tsc --noEmit --skipLibCheck --jsx react-jsx --target ES2022 --module ESNext --moduleResolution bundler --lib ES2022,DOM,DOM.Iterable --types vitest/globals,vite/client src/store/useStore.ts src/store/useStore.workoutFlow.test.ts` — PASS |
| Format / diff check   | Exact-file Prettier check and `git diff --check` — PASS                                                                                                                                                                                           |

### Per-Finding Closure

- `RISK-001`: each completion history row now uses the captured active-workout UUID, preventing retry duplicates.
- `RISK-002`: active deletion now requires captured owner, active UUID, and `started_at`, then requires a returned deleted row.
- `RESILIENCE-001`: an insert error/rejection is reconciled by the same history UUID and owner before deciding whether completion failed.
- `RESILIENCE-002`: fulfilled and rejected compensation failures are inspected; the active workout remains recoverable and a stable-ID retry reconciles the retained history row.
- `RELIABILITY-001`: a zero-row conditional delete is a conflict; history is compensated and a newer server active row is preserved.
- `RELIABILITY-002`: deferred history/delete completion clears or notifies only when the captured owner and workout still own local state.

### Severe Correction Identity

- Initial candidate tree: `3e3e481c763bed9c3120039a443c9929169fd2c9`.
- Initial store blob: `08d157bd008c7817a80efc5b5894be4e5468a07c`.
- Initial test blob: `45d500940e6386ef74bebba51a75107d1c26650e`.
- Corrected store blob: `c46becf27f351a4fc68582c55e4ab331bbd0900f`.
- Corrected test blob: `a6eddc556bc8b38c0b76bdf13afa83ed5ea57282`.
- Store/test correction delta SHA-256: `87ed55b152a61153a3eb6c0394a0988563bb4b9f46fce28e5385280205cfdeed`.

### Severe Correction Rollback

Revert only the correction delta after candidate tree `3e3e481c763bed9c3120039a443c9929169fd2c9`: remove the stable-ID reconciliation, conditional returned-row delete, compensation-result handling, captured-local guards, and five correction tests. Tasks 2.1–2.4 and the original 25 Slice-1/2 tests remain intact.

Remaining bounded risk: if compensation fails, the stable history row intentionally remains for retry reconciliation. Atomic history-insert/active-delete semantics would require a database transaction or RPC, which is outside the authorized no-schema boundary.
