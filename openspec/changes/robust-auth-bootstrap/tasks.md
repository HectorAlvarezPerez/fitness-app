# Tasks: Robust Auth Bootstrap — Unit 1

## Delivery Boundary

| Field | Value |
|---|---|
| Work unit | Guarded loader primitives |
| Delivery strategy | Independently mergeable store slice |
| Review budget risk | High: seven-loader behavior is covered as one coherent matrix |
| Runtime harness | N/A until a later coordinator consumes the contextual API |
| Rollback boundary | Store guard/result changes and the two focused test files |

This change contains one complete work unit. It does not include route gating, initial-readiness UI, lifecycle coalescing, recovery/retry behavior, or post-login navigation.

## Unit 1: Guarded Loader Contract

- [x] 1.1 SAFETY: run the existing active-workout sync tests before production changes.
- [x] 1.2 RED: add contextual signed-out, identity-mismatch, auth/query-failure, empty/non-empty success, stale-query, and active-workout flush tests.
- [x] 1.3 GREEN: add `LoadContext` and `LoadResult` to all seven loaders while preserving no-context behavior.
- [x] 1.4 REFACTOR: consolidate identity, stale, and completion helpers without widening ownership.
- [x] 1.5 CORRECTION RED: reproduce explicit Supabase auth-error misclassification and cross-user active-workout upsert.
- [x] 1.6 CORRECTION GREEN/TRIANGULATE: inspect auth `.error`, bind flushes to context, and cover generation changes during flush.
- [x] 1.7 HANDOFF: record focused test, lint, exact-file type-check, baseline project-check, rollback, and runtime evidence in `apply-progress.md`; narrow all change artifacts to Unit 1.

## Verification Receipt

The native verification input is complete:

- 3 requirements and 12 scenarios map to the current focused tests.
- 7/7 tasks are complete.
- Final focused evidence is 2 files, 22/22 tests passing.
- Exact-path lint passed with 0 errors and 17 existing warnings.
- Exact-file TypeScript checking passed.
- Project-wide TypeScript checking has only the unrelated baseline failures recorded in `apply-progress.md`.

## Deferred Independent Changes

Protected-route gating and initial readiness will be specified and delivered separately. Lifecycle/auth-event coalescing, recovery/retry UI, and immediate login navigation will also be separate changes; they are not incomplete tasks in this change.
