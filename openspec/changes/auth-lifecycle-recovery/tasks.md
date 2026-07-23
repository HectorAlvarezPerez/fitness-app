# Tasks

## Workload guard

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: High
Size exception: Resolved — the existing integration harness and required lifecycle/recovery matrix make the focused test delta exceed the nominal budget; production scope remains one coordinator file.

## Implementation

- [x] 1. Verify the clean Unit 2 baseline and run its 12 focused auth tests.
- [x] 2. Add lifecycle, coalescing, failure, retry, stale-owner, and cleanup integration tests.
- [x] 3. Capture RED failures before production changes.
- [x] 4. Implement lifecycle session resolution and ready-state refresh coordination.
- [x] 5. Add accessible refresh recovery while preserving protected content.
- [x] 6. Run focused tests, lint, changed-file TypeScript, project baseline, build, and diff checks.
- [x] 7. Record apply progress and hand off for independent verification.
