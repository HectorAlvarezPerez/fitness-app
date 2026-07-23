# Apply Progress: Auth Readiness v2

## Status

- State: all done; ready for `sdd-verify`
- Base: clean `origin/main` at `fae2dad23524e48791ff8e21897593a04dac1e5d`
- Delivery: stacked-to-main, independent commit 2, resolved size exception
- Tasks: 7/7
- Requirements/scenarios: 3/12
- Mode: Strict TDD

## TDD Cycle Evidence

| Task | Test | Layer | Safety | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| Initial readiness and explicit auth resolution | `src/App.auth.test.tsx` | Integration | No App/Landing tests existed on clean base | Fresh focused run: 12/12 failed before production edits; both lookup-failure cases emitted paired `INITIAL_SESSION(null)` | Coordinator implementation reached 11/12; the remaining fixture incorrectly expected held `INITIAL_SESSION` to start hydration | Obsolete-run fixture used later `SIGNED_IN`, matching policy that only non-initial events supersede lookup; 12/12 passed | Direct lookup, auth-signal, user, generation, and mounted guards remain one App-local coordinator |
| Recovery ownership and login | Same | Integration | Included in fresh RED | Same-owner retry, different-owner refusal, sign-out-after-error, and history replacement all failed on base | Same-owner retry, owner refusal, and replace-navigation passed in final 12/12 | `u1` success and `u2` refusal exercise distinct retry branches | No Landing or coordinator abstraction beyond the required behavior |

## Explicit Bootstrap Resolution Policy

- Direct `getSession()` is authoritative for initial resolution.
- `INITIAL_SESSION` never mutates initial readiness; it cannot convert direct failure into sign-out regardless of arrival order.
- A successful direct null result is confirmed sign-out.
- Later non-initial auth events increment the auth sequence and may supersede a pending direct lookup.
- Resolved auth error or rejected direct lookup preserves retained state and commits recoverable error.

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused tests | `npm test -- --run src/App.auth.test.tsx` — PASS, 1 file / 12 tests |
| Exact lint | `npx eslint src/App.tsx src/pages/LandingPage.tsx src/App.auth.test.tsx` — PASS, 0 errors/warnings |
| Changed-file TypeScript | Exact App/Landing/test command — PASS, 0 diagnostics |
| Project TypeScript | Existing failures only in `BodyHeatmap.tsx`, `ErrorBoundary.tsx`, and `MuscleStats.tsx`; no changed-file diagnostic |
| Build | `npm run build` — PASS, 760 modules, 22.38 seconds |
| Runtime | N/A: authenticated credentials were unavailable and external data writes were out of scope; MemoryRouter/auth/store integration covers the runtime boundary |
| Rollback | Revert `src/App.tsx`, `src/pages/LandingPage.tsx`, `src/App.auth.test.tsx`, and this change directory |

## Files Changed

- `src/App.tsx`: protected gate, seven-loader coordinator, explicit direct/event policy, stale guards, and retry ownership.
- `src/pages/LandingPage.tsx`: successful login replace-navigation.
- `src/App.auth.test.tsx`: twelve focused integration cases.
- `openspec/changes/auth-readiness-v2/**`: complete proposal, spec, design, tasks, and receipt.

## Boundaries and Risks

- No Unit 1 store file, lifecycle recovery behavior, configuration, dependency, service, or data change.
- Project-wide TypeScript retains unrelated baseline failures listed above.
- No authenticated runtime harness ran because credentials/external writes were unavailable.
- No commit, push, deployment, or publication occurred.

## Snapshot Hashes

- Base `App.tsx`: `1ba9737a55f07423495419757642b3062cad172fce5c7079bc1812b744e32e6e`
- Base `LandingPage.tsx`: `d9306e23b9200d56543b7f2aaff93e1d60c82be83eb32b4b74a8d95b9a060096`
- Final `App.tsx`: `62cdaedb9d8aa23657d9bbac1c602c742382099453c30da12f60c9cb8716ae46`
- Final `LandingPage.tsx`: `1f94096e9d7dc622f135f05dbb67f44a7d025796d483a6471d5619cb447f9c2f`
- Final `App.auth.test.tsx`: `8701850016db5fba869f993d217001b86e3760a28ba1b6994da666bd2d037777`
- Proposal/design/tasks/spec: `2db8002a47e3cc19284b6de56ffe724c2dfa7adc467a558be9beb6a4613e21bc`, `934dc15722952409c8cc47f40856a547cb78c1b9b0416390a60a4d7ad33bef2c`, `ef1f0a826d779d99473497cf1ec98a1172c50001885146af88f292a6760247e4`, `9b2ece8a6549291431d43b7d3e6d0a315138fc26ca2ed2cc9f213a549abe8a41`.

## Verification Scenario 2.2 Correction

- Failed verification revision: `3f8bc3b3692bfc80675a18b8085668a336b4fbd3a68418b4aa220889b38b696c`.
- The rejected-lookup test now keeps `getSession()` pending, emits `INITIAL_SESSION(null)`, then rejects the lookup before asserting retained state, recoverable alert, no reset, and no redirect.
- Corrected-order execution passed immediately: `npm test -- --run src/App.auth.test.tsx` — 1 file, 12/12 tests.
- No production RED occurred because the existing explicit policy already ignores paired `INITIAL_SESSION` and satisfies this ordering. `src/App.tsx` and `LandingPage.tsx` were not changed.
- Focused test lint and exact test TypeScript check both passed with 0 diagnostics. Build was not rerun because production did not change.
