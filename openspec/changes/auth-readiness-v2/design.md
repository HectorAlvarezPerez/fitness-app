# Design: Auth Readiness v2

## Approach

`App.tsx` owns readiness, one user-scoped in-flight run, and an explicit initial auth-resolution phase. While direct `getSession()` is pending, `INITIAL_SESSION` is recorded but not applied. A successful direct result confirms authenticated or signed-out state; a resolved error or rejection commits recoverable error. Later non-initial auth events supersede the lookup through a sequence guard.

```mermaid
sequenceDiagram
  participant D as Direct getSession
  participant E as Auth event
  participant A as App coordinator
  participant L as Seven loaders
  D->>A: lookup pending
  E->>A: INITIAL_SESSION(null)
  A->>A: hold paired event
  alt direct lookup error/rejection
    D-->>A: indeterminate
    A-->>A: preserve state; show error
  else direct lookup success
    D-->>A: session or confirmed null
    A->>L: hydrate session or confirm sign-out
  end
```

## Decisions

| Decision | Rationale |
|---|---|
| Direct lookup owns initial resolution | Avoids deriving sign-out from event ordering after auth read failure. |
| Only `INITIAL_SESSION` is held | Explicit later `SIGNED_IN`/`SIGNED_OUT` events may supersede pending lookup. |
| App-local state and refs | Routing/auth ownership stays local; Unit 1 store API remains unchanged. |
| Retry owner comparison | Prevents a stale error action hydrating another account. |

## Files

- `src/App.tsx`: coordinator and protected gate.
- `src/pages/LandingPage.tsx`: replace-navigation.
- `src/App.auth.test.tsx`: twelve integration scenarios.

## Validation and Rollback

Focused integration tests, exact lint/type checks, project type baseline, build, and diff-check. Runtime harness is N/A without authenticated credentials. Rollback the three source/test files as one autonomous stacked-to-main work unit.

Lifecycle refresh/recovery remains out of scope.
