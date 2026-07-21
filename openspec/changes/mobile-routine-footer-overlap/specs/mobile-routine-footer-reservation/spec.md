# Mobile Routine Footer Reservation Specification

## Purpose

Define the mobile workout-content reservation required for each conditional fixed-footer configuration so that workout controls remain reachable and visible.

## Requirements

### Requirement: Conditional Mobile Footer Reservation

The system MUST reserve scrollable bottom space in the mobile workout content that corresponds to the fixed footer configuration currently shown. When a rest timer is visible, the reservation MUST be sufficient for the final exercise and its lower controls to scroll completely above the timer and action controls. When no rest timer is visible, the system MUST retain the compact reservation used for the action-controls-only configuration.

#### Scenario: Rest timer is visible on a narrow viewport

- GIVEN a narrow mobile viewport with an active workout and a visible rest timer
- WHEN the user scrolls to the final exercise
- THEN the final exercise and its lower controls can be scrolled completely above the fixed footer
- AND no part of those controls is obscured by the timer or workout action controls

#### Scenario: Rest timer is absent on a narrow viewport

- GIVEN a narrow mobile viewport with an active workout and no visible rest timer
- WHEN the workout content is displayed
- THEN the content uses the compact reservation for the action-controls-only footer
- AND the established footer behavior remains unchanged

### Requirement: Mobile Footer Inset Preservation

The system MUST preserve bottom safe-area clearance in every mobile content reservation. The system MUST also preserve keyboard-inset clearance in every mobile content reservation so that the reserved content space and fixed footer remain aligned when the visual viewport changes.

#### Scenario: Bottom safe area is present

- GIVEN a mobile device viewport with a nonzero bottom safe-area inset
- WHEN the workout content is displayed with or without a rest timer
- THEN the content reservation includes the bottom safe-area clearance
- AND the fixed footer does not obscure content within that safe-area clearance

#### Scenario: Workout input opens the keyboard

- GIVEN a mobile workout input is focused and a keyboard inset is present
- WHEN the visual viewport changes for the keyboard
- THEN the fixed footer and the content's bottom reservation rise by the same keyboard inset
- AND the final exercise remains scrollable above the footer
