# Live Workout Exercise Editing Specification

## Purpose

Define deletion and reordering of exercises in an active workout while preserving a valid, resumable session.

## Requirements

### Requirement: Live exercise edits persist with the active session

The system MUST let a user delete and reorder exercises during an active workout. Each successful edit MUST be retained when that active workout is reloaded or resumed. A persistence failure MUST be observable and MUST NOT be represented as a persisted edit.

#### Scenario: Deleted exercise stays deleted after resume

- GIVEN an active workout with multiple exercises
- WHEN the user deletes one exercise and reloads or resumes the workout
- THEN the deleted exercise is absent from the restored workout
- AND the remaining exercises retain their order

#### Scenario: Reordered exercises stay ordered after resume

- GIVEN an active workout with three or more exercises
- WHEN the user moves an exercise to a new position and reloads or resumes the workout
- THEN the restored exercise order matches the edited order

#### Scenario: Edit persistence fails

- GIVEN an active workout
- WHEN an exercise deletion or reorder cannot be persisted
- THEN the system reports that the edit was not persisted
- AND the session remains recoverable without claiming saved state

### Requirement: Live edits repair dependent session state

The system MUST leave focus, rest-timer, and superset state valid after an exercise deletion or reorder. If the focused exercise is deleted, focus MUST deterministically select a remaining exercise/set or clear when none remain. If the timer's exercise is deleted, the rest timer MUST clear. A superset MUST NOT retain a single member.

#### Scenario: Deleting the focused timed exercise cleans references

- GIVEN the focused exercise owns the active rest timer and belongs to a two-member superset
- WHEN the user deletes that exercise
- THEN focus references a remaining exercise/set or is clear
- AND the rest timer is clear
- AND the remaining exercise has no one-member superset

#### Scenario: Reordering preserves valid references

- GIVEN a focused exercise or active rest timer in a multi-exercise workout
- WHEN the user reorders a different exercise
- THEN focus and timer references remain associated with existing exercises

### Requirement: Final exercise controls remain reachable above a timer footer

The live-workout screen MUST keep the final exercise controls reachable and operable on a narrow viewport while a rest timer footer is visible, including applicable safe-area and keyboard insets.

#### Scenario: Narrow viewport with active rest timer

- GIVEN a narrow viewport, an active rest timer, and a final exercise below the initial visible area
- WHEN the user scrolls to the final exercise
- THEN its controls are visible above the footer
- AND they can receive keyboard focus and be operated
