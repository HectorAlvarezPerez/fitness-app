# Proposal: Robust Auth Bootstrap

## Intent

Make the seven existing user-scoped store loaders safe for a future authenticated bootstrap coordinator. Contextual calls report explicit outcomes and cannot query, commit, or flush for an obsolete or different authenticated identity.

## Scope

### In Scope

- Add optional `LoadContext` and explicit `LoadResult` contracts to the seven bootstrap loaders.
- Reject signed-out, different-user, auth-error, request-error, and stale contextual work without clearing prior slices.
- Guard every contextual commit and active-workout reconciliation flush.
- Revalidate identity, generation, and persisted ownership before a contextual active-workout upsert.
- Preserve all existing no-context loader and reconciliation behavior.

### Out of Scope

- Authenticated route gating, checking/error UI, manual retry, and post-login navigation.
- Auth, focus, visibility, pageshow, and online event coalescing.
- App-owned bootstrap state or coordinator logic.
- Database, schema, API, Supabase persistence, or service-worker changes.
- Per-loader retry policies or loader ownership changes.

## Capabilities

### New Capabilities

- `authenticated-bootstrap`: Identity-safe, result-bearing store loader primitives.

### Modified Capabilities

None; no main OpenSpec capabilities exist yet.

## Approach

Each loader accepts an optional `{ userId, isCurrent }` context. Contextual execution resolves auth first, classifies auth/query outcomes, verifies identity before querying, and rechecks generation before committing. Active-workout flushes carry the same context and revalidate session identity plus persisted ownership before upsert. Calls without context follow the prior behavior exactly.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/store/useStore.ts` | Modified | Context/result contract, identity/commit guards, and bound active-workout flushes. |
| `src/store/useStore.bootstrap.test.ts` | Created | Seven-loader result, retention, success, stale, and legacy coverage. |
| `src/store/useStore.sync.test.ts` | Modified | Reconciliation, stale flush, cross-user, and generation-race coverage. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Obsolete work overwrites a current user's slice. | Medium | Pre-query identity and post-query generation guards. |
| A captured workout is upserted for a later session user. | Medium | Context-bound flush revalidates identity, generation, and ownership. |
| Existing page callers change behavior. | Low | Optional context preserves the no-context path and dedicated regression coverage. |

## Rollback Plan

Revert the store guard/result changes and the two focused test changes together. No App, route, persisted data, or schema change requires rollback.

## Dependencies

- Existing Supabase auth APIs and active-workout reconciliation.

## Success Criteria

- [x] All seven contextual loaders return `ok`, `signed-out`, `request-failed`, or `stale` truthfully.
- [x] Contextual identity/auth failures stop before query; request/stale failures preserve prior slices.
- [x] Empty and non-empty successful reads commit and return `ok`.
- [x] Active-workout flushes cannot cross session identity or generation ownership.
- [x] No-context signed-out and reconciliation behavior remains covered.

## Later Independent Changes

Route gating and initial readiness belong in a later App-gate change. Lifecycle coalescing, foreground recovery, retry UI, and login navigation belong in later independently reviewable changes and are not implied complete here.
