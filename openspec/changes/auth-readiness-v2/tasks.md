# Tasks: Auth Readiness v2

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: High

Size exception is resolved by the user's direct-to-main instruction and prior workload choice. This is independent commit 2 after `fae2dad`.

## Strict TDD Work Unit

- [x] 1.1 SAFETY: confirm no relevant App/Landing tests exist on clean `origin/main`.
- [x] 1.2 RED: add twelve focused scenarios, including both paired `INITIAL_SESSION(null)` failure reproductions.
- [x] 1.3 GREEN: implement the protected gate, seven-loader readiness, and explicit direct/event resolution policy.
- [x] 1.4 TRIANGULATE: cover duplicate signals, obsolete runs/lookups, confirmed sign-out, and both lookup failure forms.
- [x] 1.5 RECOVERY: implement same-owner retry refusal and successful replace-navigation from its RED tests.
- [x] 1.6 REFACTOR: keep the coordinator bounded without Unit 3 listeners or store changes.
- [x] 1.7 VERIFY: run focused tests, lint/type checks, project baseline, build, diff-check, record hashes, and remove the temporary dependency symlink.
