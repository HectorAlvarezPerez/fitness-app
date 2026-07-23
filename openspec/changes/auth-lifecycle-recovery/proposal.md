# Proposal: Auth lifecycle recovery

## Problem

Authenticated data is hydrated only during auth bootstrap. Returning to a stale tab, restoring a page, or reconnecting does not refresh the seven user-scoped datasets unless auth emits another event.

## Change

- Refresh authenticated context on window focus, page restore, visible document state, and reconnect.
- Coalesce overlapping lifecycle signals and reject stale or wrong-session work.
- Keep ready content mounted when a refresh fails and expose an accessible same-session retry.
- Remove lifecycle listeners when the route gate unmounts.

## Scope

Only the authenticated coordinator and its integration tests change. Store loaders, auth services, route pages, and active-workout persistence behavior remain unchanged.

## Impact

The existing initial-session policy remains authoritative. Lifecycle recovery starts only after authenticated readiness and uses the existing seven contextual loaders.
