# Apply progress

Status: complete
Completed: 7/7
Current task: Ready for independent verification.

## Validation

- Safety baseline: `npm test -- --run src/App.auth.test.tsx` — PASS (12/12).
- RED: focused auth tests — expected FAIL (9 lifecycle failures; 14 existing/guard tests passed).
- GREEN: focused auth tests — PASS (23/23).
- Triangulation: focused auth tests — PASS (25/25), including hidden-ready and lifecycle signed-out no-ops.
- ESLint: `npx eslint src/App.tsx src/App.auth.test.tsx` — PASS.
- Changed-file TypeScript command: no errors in changed files; exit 2 only from the established project baseline in `BodyHeatmap.tsx`, `ErrorBoundary.tsx`, and `MuscleStats.tsx`.
- Project TypeScript baseline: `npx tsc --noEmit` — expected exit 2 with the same pre-existing errors.
- Production build: `npm run build` — PASS.
- Diff check: `git diff --check -- src/App.tsx src/App.auth.test.tsx` — PASS.

## Apply result

- Added lifecycle refresh for focus, pageshow, visible visibilitychange, and online.
- Coalesced overlapping session resolution and same-user bootstrap work.
- Preserved ready protected content on refresh failure with an accessible same-session retry.
- Reused generation/user ownership guards and removed lifecycle listeners on cleanup.
- Preserved the initial-session policy and active-workout persistence listeners.

## Focused correction: RESILIENCE-001

Status: corrected
Frozen finding mapping: `RESILIENCE-001` → lifecycle request ownership is now keyed by user, invalidated on owner/sign-out transitions, and cleared only by the promise that owns the current slot.
Review lineage: `auth-lifecycle-recovery-unit-3`, generation `1`, fix batch `1`.
Failed evidence revision: `sha256:384b9d96cc3872efa00faca86370a174f841bdae43bb3165706d5f5ea423a0dd`.

### TDD cycle evidence

| Task | Test file | Layer | Safety net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| Correct `RESILIENCE-001` | `src/App.auth.test.tsx` | Integration with auth/store harness | PASS 25/25 | Expected FAIL 1; 25 passed | PASS 26/26 | PASS 27/27: direct u1→u2 ownership change and sign-out invalidation | No broader refactor; minimum keyed-slot change |

### Work unit evidence

| Evidence | Result |
|---|---|
| Focused test | `npm test -- --run src/App.auth.test.tsx` — PASS 27/27 |
| Runtime harness | N/A — this coordinator boundary requires authenticated Supabase/store state; the focused integration harness exercises the complete event/auth/loader sequence without credentials or external writes |
| Rollback boundary | Revert the keyed lifecycle slot and the two focused tests in `src/App.tsx` and `src/App.auth.test.tsx`; no store, service, route, or review artifact behavior is coupled to the correction |

### Correction validation

- Safety: PASS 25/25 before correction.
- RED: PASS as evidence — 1 expected failure (`getSession` remained at 2 instead of starting the u2 lookup), 25 existing tests passed.
- GREEN: PASS 26/26.
- Triangulation: PASS 27/27.
- ESLint: `npx eslint src/App.tsx src/App.auth.test.tsx` — PASS.
- Changed-file TypeScript filter: PASS; transitive project baseline remains exit 2 with no diagnostic in either changed file.
- Production build: `npm run build` — PASS.
- Warning findings `RISK-001` and `RELIABILITY-001`: intentionally not changed.
