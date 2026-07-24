# Workout Session Completion Specification

## Purpose

Define terminal completion of a routed workout session and explicit ownership of any originating routine template.

## Requirements

### Requirement: Successful completion is terminal

The system MUST create exactly one completed-workout history record for a successful finish, clear its active workout, and leave the routed live-workout session without creating another active workout for that mounted session. Initial session creation or restoration MUST remain available only after restoration and routed-routine availability are resolved.

#### Scenario: Successful finish does not reopen the session

- GIVEN a restored active workout for a routed routine
- WHEN the user successfully finishes it
- THEN exactly one completed-workout history record exists
- AND no active workout remains
- AND the user is navigated away from the live-workout session without a replacement active workout

#### Scenario: Initial startup waits for required state

- GIVEN a routed routine while active-workout restoration or routine loading is unresolved
- WHEN the live-workout route renders
- THEN the system MUST NOT create a workout until both prerequisites resolve

### Requirement: Routine updates require an explicit successful-finish choice

After a successful finish of a routine-backed workout, the system MUST offer an explicit Yes/No choice to copy the final live exercise configuration to that originating routine. It MUST NOT update a template before Yes, and a copied configuration MUST exclude transient session state.

#### Scenario: Yes updates only the originating template

- GIVEN a successful routine-backed finish and an existing originating template
- WHEN the user chooses Yes
- THEN that template contains the final live exercise configuration
- AND unrelated templates and transient session state are unchanged

#### Scenario: No or dismissal preserves the template

- GIVEN a successful routine-backed finish and an existing originating template
- WHEN the user chooses No or dismisses the choice
- THEN the template remains unchanged

#### Scenario: A non-successful or free session offers no update

- GIVEN a free workout, a cancelled workout, or a finish that fails to save
- WHEN the finish flow ends
- THEN no template-update choice is offered
- AND no template is changed

#### Scenario: Finish failure remains recoverable

- GIVEN an active routine-backed workout
- WHEN its finish cannot be saved
- THEN the active workout remains recoverable
- AND no completed-workout record, template update, or terminal navigation occurs
