# Design: Prevent Mobile Workout Footer Overlap

## Technical Approach

In `WorkoutSession`, derive a clearly named bottom-padding class from `Boolean(activeWorkout.restTimer)`. Keep the current `9rem` reservation when the timer is absent and use `19rem` when the mobile footer renders the timer card. Both formulas retain `env(safe-area-inset-bottom)` and `var(--keyboard-inset,0px)`. Because the conditional timer also renders in the desktop sidebar, the expanded branch adds a large-screen override back to `9rem`; the fixed mobile footer remains `lg:hidden` and otherwise unchanged.

This implements `openspec/changes/mobile-routine-footer-overlap/specs/mobile-routine-footer-reservation/spec.md` without runtime measurement or footer changes. The actual narrow layout is approximately 129px for the compact footer plus 159px for the timer section, or 288px total. `19rem` is 304px, preserving about 16px of clearance; `18rem` would equal the footer height and provide no margin.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| Conditional static reservation | Small and deterministic; must be revisited if footer markup grows | Use `9rem` compact / `19rem` with timer, co-located with the footer in `WorkoutSession.tsx` |
| `ResizeObserver` measurement | Tracks arbitrary height but adds refs, state, effects, and cleanup | Reject as disproportionate for two known footer configurations |
| Non-fixed footer | Removes overlay structurally but changes keyboard and viewport behavior | Reject; preserve established fixed positioning |
| Apply expanded padding at every breakpoint | Simplest class branch but changes desktop scroll space | Reject; add `lg:` compact override in the timer-visible branch |

## Data Flow

```text
activeWorkout.restTimer
        |
        +-- absent  -> compact 9rem reservation
        +-- present -> expanded 19rem mobile reservation
                         +-- lg breakpoint -> compact 9rem reservation

safe-area inset + keyboard inset -> added to the selected reservation
keyboard inset                  -> fixed footer bottom offset (unchanged)
```

## File Changes

| File | Action | Description |
|---|---|---|
| `src/pages/WorkoutSession.tsx` | Modify | Select the content padding class from timer visibility; preserve the footer, safe-area term, keyboard term, and desktop spacing. |
| `src/pages/WorkoutSession.test.tsx` | Create | Render minimal timer-present and timer-absent workout states and assert the exact reservation classes. |

`src/components/RestTimer.tsx` and `src/components/MainLayout.tsx` remain unchanged.

## Interfaces / Contracts

No public API, store type, component prop, or persisted-data change. The existing contract is the source of truth: `activeWorkout.restTimer` being truthy renders the mobile `RestTimer`, and the same condition selects the expanded reservation.

## Testing Strategy

Strict TDD order:

1. **RED** — Add `WorkoutSession.test.tsx`, mock the store and heavyweight child components, render through `MemoryRouter`, and assert that the scroll-content wrapper has:
   - no timer: `pb-[calc(9rem+env(safe-area-inset-bottom)+var(--keyboard-inset,0px))]`;
   - timer: `pb-[calc(19rem+env(safe-area-inset-bottom)+var(--keyboard-inset,0px))]` plus `lg:pb-[calc(9rem+env(safe-area-inset-bottom)+var(--keyboard-inset,0px))]`.
2. **GREEN** — Add the named conditional class selection and use it on the existing wrapper; run only `npm test -- --run src/pages/WorkoutSession.test.tsx`.
3. **REFACTOR** — Keep the class selection local and remove no existing behavior; rerun the same focused test.

Manual verification at a narrow viewport (for example 375x812): with and without a timer, scroll the final exercise and its controls above the footer. With the timer visible, focus a numeric input or notes field and confirm the footer and content clearance rise together with `--keyboard-inset`. jsdom cannot validate real CSS geometry, so this check is required.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration, feature flag, or phased rollout required. Rollback is the single conditional-padding change plus its focused test.

## Open Questions

None.
