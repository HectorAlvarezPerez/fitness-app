# Design

## Coordinator

Add a ready-state refresh mode to the existing bootstrap coordinator. Initial hydration continues to own the blocking `checking` and `error` states. A refresh leaves `ready` content mounted, records a separate refresh error, and reuses generation/user ownership checks.

Before starting loaders, a lifecycle request resolves the current Supabase session. It proceeds only when the gate is ready and the resolved user matches the current owner. A single in-flight lifecycle request coalesces ordinary overlapping signals; the existing bootstrap run coalesces same-user loader work.

## Recovery

Refresh failures render an accessible alert above the protected outlet. Retry resolves the session again and proceeds only for the failed/current user. Missing or changed sessions do not let a stale recovery action mutate or hydrate another user's state; auth-state events remain responsible for ownership transitions.

## Events and cleanup

Listen to `focus`, `pageshow`, `online`, and `visibilitychange`. Visibility refreshes only when the document is visible. Cleanup removes all four listeners. Existing active-workout hide, pagehide, and online persistence listeners remain independent.

## Alternatives rejected

- Reloading the page would discard retained client state and obscure recoverable failures.
- Refreshing directly from each event would duplicate session reads and loader runs during browser event bursts.
