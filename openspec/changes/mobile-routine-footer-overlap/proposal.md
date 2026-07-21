# Proposal: Prevent Mobile Workout Footer Overlap

## Intent

On narrow workout screens, a visible rest timer increases the fixed footer beyond the exercise pane's current 9rem bottom reservation. Let users scroll the final exercise and its controls fully above that footer while preserving the established fixed action bar, safe-area handling, and keyboard lift.

## Scope

### In Scope
- In `src/pages/WorkoutSession.tsx`, select the mobile exercise-list bottom reservation from `activeWorkout.restTimer`.
- Retain the current compact formula when no timer is rendered; use an expanded reservation covering the footer rest-timer card plus finish/cancel controls when it is rendered.
- Preserve `env(safe-area-inset-bottom)` and `var(--keyboard-inset,0px)` in both reservations; verify the rest-timer state on a narrow viewport.

### Out of Scope
- Measuring footer height with refs or `ResizeObserver`.
- Changing the fixed footer's layout, `RestTimer` API/markup, keyboard-inset calculation, desktop layout, or workout actions.
- Redesigning the timer or general mobile navigation.

## Capabilities

### New Capabilities
- `mobile-routine-footer-reservation`: The mobile workout content MUST reserve enough scrollable bottom space for each conditional fixed-footer configuration, including an active rest timer.

### Modified Capabilities
- None; `openspec/specs/` contains no existing capability to amend.

## Approach

Keep the fixed footer at `bottom-[var(--keyboard-inset,0px)]`. Co-locate a clearly named timer-conditional padding choice in `WorkoutSession.tsx`: the existing compact calc without a timer and a larger calc with one. Both retain safe-area and keyboard-inset terms, so content clearance remains paired with the footer as the visual viewport changes.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/pages/WorkoutSession.tsx` | Modified | Conditional mobile content reservation. |
| `src/components/RestTimer.tsx` | Preserved | Existing footer card determines expanded spacing. |
| `src/components/MainLayout.tsx` | Preserved | Existing `--keyboard-inset` behavior remains unchanged. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Footer grows later | Medium | Keep timer condition and reservation co-located; reassess on footer changes. |
| Mobile viewport variance | Low | Manually check focused inputs with timer visible. |

## Rollback Plan

Revert the conditional reservation in `WorkoutSession.tsx` to the current single compact formula. This restores prior layout without data, API, or migration impact.

## Dependencies

- None.

## Success Criteria

- [ ] At a narrow mobile viewport with a rest timer, the final exercise and lower controls can scroll completely above the fixed footer.
- [ ] Without a timer, the compact reservation and footer behavior remain unchanged.
- [ ] With a focused workout input, the footer and reserved content space continue to rise together with `--keyboard-inset`.
