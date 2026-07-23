# Proposal: Auth Readiness v2

## Intent

Gate protected routes on a trustworthy initial auth decision and complete user-scoped hydration, including the real Supabase pairing of direct `getSession()` with `INITIAL_SESSION`.

## Scope

- App-owned resolving, signed-out, checking, error, and ready states.
- Seven contextual loaders before protected content renders.
- Explicit initial-resolution policy: direct lookup decides the initial result; paired `INITIAL_SESSION` is held while that lookup is pending.
- Recoverable lookup errors without clearing retained state.
- Same-run coalescing, stale user/generation rejection, same-owner retry, and login replace-navigation.

Excluded: lifecycle refresh/recovery, store changes, persistence/schema/service-worker work, and warning-driven refactors.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Paired null event races a failed direct lookup and falsely signs out. | Buffer `INITIAL_SESSION` until direct lookup settles; direct failure becomes recoverable error. |
| Old user/run updates readiness. | Bind loader context and completion to mounted state, user, and generation. |
| Failed-user retry hydrates a different session. | Compare resolved retry user with the failed owner. |

## Rollback

Revert `src/App.tsx`, `src/pages/LandingPage.tsx`, `src/App.auth.test.tsx`, and this change directory. Unit 1 and persisted data remain unchanged.

## Success Criteria

- [x] Protected content waits for all seven loaders.
- [x] Confirmed null signs out; indeterminate lookup failure remains recoverable.
- [x] Paired `INITIAL_SESSION(null)` cannot override a direct lookup failure.
- [x] Duplicate and stale runs cannot duplicate or commit obsolete UI.
- [x] Retry is same-owner and successful login replace-navigates.
