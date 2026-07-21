## Exploration: Mobile routine footer overlap

### Current State
`WorkoutSession` renders the workout content in a scrollable mobile pane and reserves bottom scroll space with `pb-[calc(9rem+env(safe-area-inset-bottom)+var(--keyboard-inset,0px))]`. Its mobile action area is independently `fixed` at the bottom (raised by `--keyboard-inset`) and always contains finish/cancel controls. When `activeWorkout.restTimer` exists, it also renders the larger `RestTimer` footer card above those controls.

The fixed footer can therefore exceed the fixed 9rem content reservation while a rest timer is active. The scroll range ends before the final exercise can clear the overlay, so its lower controls can be obscured. The page already calculates `--keyboard-inset` from `window.visualViewport`; both the content padding and footer position include it, so the keyboard behavior is intentional and should remain paired.

### Affected Areas
- `src/pages/WorkoutSession.tsx` - owns both the scrollable exercise list, its bottom padding, and the fixed mobile footer; this is the defect and primary fix location.
- `src/components/RestTimer.tsx` - defines the conditional footer timer whose mobile layout increases the fixed footer height.
- `src/components/MainLayout.tsx` - establishes `--keyboard-inset` and visual-viewport/focus behavior that the fix must preserve.
- `src/components/MobileNav.tsx` - documents the normal mobile safe-area convention, although workout routes hide this navigation.
- `src/lib/restTimer.test.ts` - only existing rest-timer coverage; it tests timer arithmetic, not rendered layout. No `WorkoutSession` layout test currently exists.

### Approaches
1. **Reserve bottom space based on whether the rest timer is visible** - In `WorkoutSession.tsx`, keep the current fixed footer and keyboard/safe-area formula, but select a larger mobile bottom reservation while `activeWorkout.restTimer` is present.
   - Pros: Small, local change; directly matches the two known footer configurations; preserves the current fixed controls, safe-area handling, and keyboard lift; no cross-component API or measurement lifecycle.
   - Cons: The larger value must be sized from the actual mobile footer; it leaves additional blank scroll space while the timer is shown; a future footer-height change would need the matching reservation updated.
   - Effort: Low.

2. **Measure the footer and reserve its actual height** - Add a ref/measurement (for example, `ResizeObserver`) so the exercise pane's bottom padding tracks the mounted fixed footer plus safe-area and keyboard insets.
   - Pros: Automatically follows footer content and responsive height changes; avoids a hard-coded timer-specific amount.
   - Cons: More state/effect complexity in the session screen, needs lifecycle cleanup and layout-focused test coverage, and is disproportionate for a footer with two currently known layouts.
   - Effort: Medium.

3. **Make the footer a non-overlapping flex sibling instead of fixed** - Put the action area outside the scroll region so it consumes layout height, with explicit keyboard handling.
   - Pros: Removes the overlay class of bug structurally.
   - Cons: Changes the established mobile layout model and creates iOS visual-viewport/keyboard risk because a flex footer does not inherently rise above the on-screen keyboard; broader regression surface.
   - Effort: Medium.

### Recommendation
Use approach 1. In `WorkoutSession.tsx`, condition the existing exercise pane's bottom padding on `activeWorkout.restTimer`: retain the current compact reservation when no timer is rendered and use a larger reservation that covers the rendered rest-timer card plus the finish/cancel controls when it is rendered. Keep `env(safe-area-inset-bottom)` and `var(--keyboard-inset,0px)` in both formulas, and keep the footer's fixed `bottom-[var(--keyboard-inset,0px)]` behavior unchanged.

This is the smallest robust fix for the concrete mismatch: it changes the scrollable content's available tail space to match the only conditional footer height, without guessing at keyboard product behavior or introducing measurement machinery. The implementation should choose the expanded spacing from the actual narrow-mobile rendered footer and verify the final exercise can scroll above it both with and without a rest timer.

### Risks
- A fixed expanded token can drift if the rest-timer footer's mobile markup, typography, or controls grow later; keep the padding and footer co-located in `WorkoutSession.tsx` and name the conditional clearly.
- Visual viewport behavior differs across mobile browsers. Preserving the existing keyboard inset in both the fixed footer and content padding avoids regressing the current focus/keyboard lift, but should be manually checked on a narrow viewport with a focused exercise field.
- No component/page test currently covers this layout relationship; a focused rendered-layout or browser/manual viewport check will be needed in the implementation/verification phases.

### Ready for Proposal
Yes - propose a scoped `WorkoutSession.tsx` mobile bottom-reservation adjustment, with a focused regression check for the rest-timer-visible state and a narrow-viewport keyboard sanity check.
