# Apply Progress: Robust Auth Bootstrap — Unit 1

## Status

- State: all done; ready for native `sdd-verify`
- Tasks: 7/7 complete
- Requirements: 3
- Scenarios: 12
- Artifact store: OpenSpec
- Delivery boundary: contextual guards/results for seven existing loaders and context-bound active-workout flushes
- Excluded: App coordinator, route gate, lifecycle listeners, recovery/retry UI, and login navigation

## Completed Tasks

- [x] Safety net established for existing active-workout behavior.
- [x] Contextual loader and active-workout guard tests written RED-first.
- [x] `LoadContext`/`LoadResult` implemented across all seven loaders.
- [x] Shared identity, stale, and completion helpers consolidated.
- [x] Severe auth-error and cross-user flush findings reproduced.
- [x] Auth error inspection and context-bound flush correction completed and triangulated.
- [x] Focused validation, rollback boundary, and Unit-1-only artifacts recorded.

## Initial Strict TDD Cycle

| Stage | Exact result |
|---|---|
| Safety net | Existing `src/store/useStore.sync.test.ts` passed: 1 file, 7/7 tests |
| RED | Focused command failed as intended: 2 files, 17 tests; 10 failed, 7 passed |
| GREEN | Minimal contextual implementation passed: 2 files, 17/17 tests |
| TRIANGULATE | Added distinct non-empty success coverage: 2 files, 18/18 tests |
| REFACTOR/final | Consolidated identity/result helpers: 2 files, 18/18 tests |

The initial tests covered signed-out and different-user results, pre-query and post-query staleness, query-failure retention, empty and non-empty success for all seven loaders, stale active-workout query/flush behavior, transient-error retention, and unchanged no-context behavior.

## Frozen Severe Correction Transaction

The correction stayed bounded to the five severe IDs frozen after Unit 1 review.

| Frozen IDs | Defect | Correction |
|---|---|---|
| RISK-002, RELIABILITY-001, RESILIENCE-001 | Contextual auth resolution ignored Supabase auth `.error` and could classify an errored empty auth envelope as `signed-out`. | Contextual identity resolution returns `request-failed` for `getSession`/`getUser` errors before inspecting auth data. |
| RISK-001, RESILIENCE-002 | Reconciliation captured a `u1` workout, then an unbound flush re-resolved `u2` and could upsert the captured workout under `u2`. | Both flush branches receive the load context and revalidate session identity, generation, and captured persisted ownership before upsert. |

### Correction Strict TDD Evidence

| Stage | Exact result |
|---|---|
| Safety net | Focused command passed: 2 files, 18/18 tests |
| First RED | 2 files, 20 tests: 1 failed, 19 passed. Cross-user flush upserted captured `u1` workout with `user_id: u2`; the literal `{ data: null, error }` case already passed through the existing catch. |
| Complete RED | Added the empty-data-envelope auth case: 2 files, 21 tests; 2 failed, 19 passed. Auth errors returned `signed-out`, and the cross-user upsert remained reproducible. |
| GREEN | Minimal correction passed: 2 files, 21/21 tests |
| TRIANGULATE | Added generation-stale-during-flush coverage: 2 files, 22/22 tests |
| REFACTOR/final | No further abstraction was needed; focused command remained 2 files, 22/22 tests |

## Final Validation Receipt

| Evidence | Result |
|---|---|
| Focused tests | `npm test -- --run src/store/useStore.bootstrap.test.ts src/store/useStore.sync.test.ts` — PASS, 2 files / 22 tests |
| Exact-path lint | `npx eslint src/store/useStore.ts src/store/useStore.bootstrap.test.ts src/store/useStore.sync.test.ts` — PASS with 0 errors; 17 existing warnings in `useStore.ts` |
| Exact-file type check | `npx tsc --noEmit --skipLibCheck --jsx react-jsx --target ES2022 --module ESNext --moduleResolution bundler --lib ES2022,DOM,DOM.Iterable --types vitest/globals,vite/client src/store/useStore.ts src/store/useStore.bootstrap.test.ts src/store/useStore.sync.test.ts` — PASS |
| Project type check | `npx tsc --noEmit` — FAIL only on pre-existing errors in `BodyHeatmap.tsx`, `ErrorBoundary.tsx`, and `MuscleStats.tsx`; no changed-file error remains |
| Artifact counts | 3 requirements, 12 scenarios, 7/7 completed tasks, 0 incomplete tasks |
| Runtime harness | N/A: this unit adds a contextual API but intentionally has no runtime coordinator/caller |

No tests or source checks were rerun while narrowing the artifacts; this receipt records the completed Unit 1 evidence above.

## Files Changed by Unit 1

| File | Action | Summary |
|---|---|---|
| `src/store/useStore.ts` | Modified | Context/result guards for seven loaders, including contextual auth errors and identity/generation/ownership-bound active-workout flushes. |
| `src/store/useStore.bootstrap.test.ts` | Created | Seven-loader identity, failure retention, empty/non-empty success, stale rejection, auth-error, and no-context coverage. |
| `src/store/useStore.sync.test.ts` | Modified | Reconciliation baseline, transient retention, stale query, cross-user flush, and generation-stale flush coverage. |
| `openspec/changes/robust-auth-bootstrap/proposal.md` | Modified | Narrows intent, success criteria, and scope to Unit 1. |
| `openspec/changes/robust-auth-bootstrap/design.md` | Modified | Documents the implemented store-only design. |
| `openspec/changes/robust-auth-bootstrap/tasks.md` | Modified | Records one complete seven-task work unit. |
| `openspec/changes/robust-auth-bootstrap/specs/authenticated-bootstrap/spec.md` | Modified | Specifies only the three implemented requirement groups. |
| `openspec/changes/robust-auth-bootstrap/apply-progress.md` | Modified | Preserves cumulative TDD, correction, validation, and handoff evidence. |

## Deviations and Risks

- No production-behavior deviation from the narrowed Unit 1 design.
- The runtime scenario is inapplicable until a later change supplies a contextual caller.
- Project-wide TypeScript checking retains the unrelated baseline failures above; exact changed-file checking passed.
- Unexpected thrown query exceptions retain legacy propagation; Supabase auth/query error results are normalized for contextual loads.
- The coherent seven-loader test matrix exceeds the default review budget; rollback remains limited to the store and two focused test files.

## Rollback Boundary

Revert `src/store/useStore.ts`, `src/store/useStore.bootstrap.test.ts`, and the Unit 1 additions in `src/store/useStore.sync.test.ts`. This removes the contextual contract and correction without changing App routing, persistence schema, runtime data, or external state. OpenSpec artifacts can be reverted independently.

## Deferred Independent Changes

Protected-route gating and initial-readiness UI move to a later independent change. Auth/lifecycle event coalescing, recovery/retry UI, and immediate post-login navigation also move to later independent changes.

## External State

No commit, push, branch change, runtime data write, container action, or remote publication occurred.
