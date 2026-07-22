## Exploration: robust-auth-bootstrap

### Current State
`App.tsx` starts a session lookup on mount and subscribes to Supabase auth events. For an authenticated user, `syncSessionState` launches seven store loaders in parallel, but it does not expose bootstrap status, capture a failure, serialize or cancel overlapping runs, or retry after the app returns to the foreground. Navigation after password login happens immediately in `LandingPage.tsx`; the auth listener is expected to start hydration independently.

The existing PWA lifecycle handling is limited to active-workout persistence: `visibilitychange`/`pagehide` flush with a cached token and `online` flushes the pending workout. `useStore.ts` preserves local active-workout state on transient fetch failures and reconciles it on an explicit `loadActiveWorkout`, but the broader initial user-data bootstrap can still complete partially or fail silently. There is no App-level auth/bootstrap test; current sync tests exercise active-workout reconciliation only.

### Affected Areas
- `src/App.tsx` — owns session bootstrap, auth subscription, lifecycle listeners, and route rendering.
- `src/pages/LandingPage.tsx` — redirects immediately after successful password authentication.
- `src/store/useStore.ts` — owns the seven loaders and active-workout reconciliation used by bootstrap.
- `src/store/useStore.sync.test.ts` — existing mock and reconciliation patterns relevant to retry-safe loading tests.
- `src/lib/supabaseClient.ts` — session/token cache used during suspended-PWA lifecycle work.
- `vite.config.ts` — confirms standalone PWA behavior; no service-worker retry mechanism exists for auth bootstrap.

### Approaches
1. **App-owned bootstrap state machine** — Track `checking`, `ready`, and recoverable `error` around the session lookup plus user-scoped hydration; deduplicate runs and retry the same bootstrap on `focus`, visible `visibilitychange`, `pageshow`, and `online` when a session exists.
   - Pros: Keeps auth orchestration at the existing owner, enables an explicit loading/error UI, handles iOS/PWA resume paths, and avoids changing every loader.
   - Cons: Requires careful stale-run/duplicate-event guards and new component-level tests.
   - Effort: Medium.

2. **Store-owned bootstrap action** — Add a single `bootstrapAuthenticatedUser` action that invokes the seven loaders, tracks its own status, and let `App.tsx` call it for auth and lifecycle events.
   - Pros: Centralizes data-hydration behavior and makes store-level testing direct.
   - Cons: Expands the store API and still needs App lifecycle/UI coordination; greater scope than the current defect requires.
   - Effort: Medium.

3. **Retry each loader independently** — Add retries/error flags to all seven loaders.
   - Pros: Can improve individual data resiliency.
   - Cons: More invasive, produces inconsistent partially-ready screens, and does not solve bootstrap sequencing or post-login visibility.
   - Effort: High.

### Recommendation
Use the App-owned bootstrap state machine. Treat a successful `getSession` plus completion of all required loaders as readiness; retain the last usable user-scoped state during a recoverable refresh failure, show a bounded loading/error experience before first readiness, and provide a manual retry. Coalesce concurrent auth/lifecycle triggers and only retry on foreground/online when authentication is present. Reuse the existing `loadActiveWorkout` reconciliation rather than altering its persistence semantics.

### Risks
- Auth events, `pageshow`, `focus`, visibility changes, and `online` can arrive together; unguarded retries can duplicate Supabase reads or let an older run win.
- A loader may swallow an error or return partial data today, so the implementation must define which failures block first readiness and preserve local active-workout recovery.
- Tests must mock browser lifecycle events and Supabase auth transitions without relying on real network timing.

### Ready for Proposal
Yes — propose an App-level, deduplicated authenticated bootstrap with explicit loading/error/retry UI and focused tests for initial session resolution, post-login hydration, and foreground/online retry behavior.
