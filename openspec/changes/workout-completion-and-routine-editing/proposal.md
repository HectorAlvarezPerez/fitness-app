# Proposal: Workout Completion and Routine Editing

## Intent

Make completion terminal for its routed session, let users edit a live workout’s exercise list, and preserve explicit ownership of routine templates.

## Scope

### In Scope

- Prevent a successful routine-backed finish from recreating an active workout before navigation.
- Add live exercise delete/reorder mutations with active-workout persistence and deterministic focus, timer, and superset cleanup.
- After a successful routine-backed finish, ask **Yes/No** whether to copy final live exercises to its template; No or dismissal leaves it unchanged.
- Preserve and verify timer-aware mobile footer reservation so the final exercise remains scrollable above the timer.

### Out of Scope

- Automatic/template changes during a live workout; free-workout, failed-save, and cancelled-workout prompts.
- Database schema, deployment, or changes to the established footer reservation values.

## Capabilities

### New Capabilities

- `workout-session-completion`: terminal finish behavior and explicit post-success template-update choice.
- `live-workout-exercise-editing`: delete/reorder exercise behavior and persisted active-session state.

### Modified Capabilities

None — `openspec/specs/` contains no canonical capability specs. The current `mobile-routine-footer-reservation` change is regression scope only.

## Approach

Use a one-time route/session initialization guard that waits for restoration and routine availability. Add explicit store mutations that reuse active-workout persistence. On successful finish, map the captured final live exercise configuration to the original template only after Yes; transient session fields are excluded.

## Affected Areas

| Area                                | Impact   | Description                                                             |
| ----------------------------------- | -------- | ----------------------------------------------------------------------- |
| `src/pages/WorkoutSession.tsx`      | Modified | Terminal init, exercise controls/DnD, confirmation, viewport regression |
| `src/store/useStore.ts`             | Modified | Live mutations, cleanup, persistence, template-update contract          |
| `src/lib/activeWorkout.ts`          | Modified | Persist exercise order/removal if extraction is needed                  |
| `src/pages/WorkoutSession.test.tsx` | Modified | Completion and narrow-footer coverage                                   |

## Risks

| Risk                                 | Likelihood | Mitigation                                     |
| ------------------------------------ | ---------- | ---------------------------------------------- |
| Guard blocks valid startup           | Medium     | Arm only after restoration and routine resolve |
| Delete leaves stale references       | Medium     | Test focus, timer, and superset cleanup        |
| Template copy includes session state | Medium     | Explicit mapping and missing-template handling |

## Rollback Plan

Revert the route guard, live mutations/UI, and post-finish prompt together; existing explicit routine-editor saves and active-workout persistence remain intact. Retain completed history rows.

## Dependencies

- Existing active-workout persistence and RoutineEditor exercise controls.

## Success Criteria

- [ ] One successful finish creates one history row, clears the active workout, and navigates without reopening it.
- [ ] Delete/reorder survives reload/resume and leaves valid focus/timer/superset state.
- [ ] Only a successful routine-backed finish prompts; Yes updates that template, No/default does not.
- [ ] On a narrow viewport with a rest timer, final exercise controls scroll above the footer.
