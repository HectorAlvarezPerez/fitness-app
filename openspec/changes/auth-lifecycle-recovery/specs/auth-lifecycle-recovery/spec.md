# Auth lifecycle recovery

## Requirements

### Requirement: Ready authenticated data refreshes on lifecycle recovery

The application MUST resolve the current session and rerun all seven contextual loaders when a ready authenticated route receives a supported lifecycle signal.

#### Scenario: Window regains focus

- **WHEN** a ready authenticated window receives `focus`
- **THEN** the current session is resolved and all contextual loaders refresh

#### Scenario: Page is restored

- **WHEN** a ready authenticated window receives `pageshow`
- **THEN** the current session is resolved and all contextual loaders refresh

#### Scenario: Document becomes visible

- **WHEN** a ready authenticated document receives `visibilitychange` while visible
- **THEN** the current session is resolved and all contextual loaders refresh

#### Scenario: Connectivity returns

- **WHEN** a ready authenticated window receives `online`
- **THEN** the current session is resolved and all contextual loaders refresh

#### Scenario: Hidden or signed-out lifecycle signal

- **WHEN** the document is hidden or the gate is signed out
- **THEN** lifecycle signals do not start authenticated hydration

#### Scenario: Overlapping lifecycle signals

- **WHEN** multiple supported signals arrive while lifecycle session resolution is pending
- **THEN** they share one session resolution and one loader run

### Requirement: Refresh failure is recoverable without hiding ready content

The application MUST preserve ready protected content when refresh fails and MUST expose an accessible retry action.

#### Scenario: Loader refresh fails

- **WHEN** any required contextual loader fails during refresh
- **THEN** protected content remains rendered and an accessible refresh error is shown

#### Scenario: Same-session retry succeeds

- **WHEN** the user retries and session resolution returns the same owner
- **THEN** all contextual loaders rerun and the refresh error clears on success

#### Scenario: Retry resolves a different owner

- **WHEN** refresh retry resolves a different user
- **THEN** no hydration starts and the existing ready state is not reassigned

### Requirement: Recovery work respects ownership and component lifetime

Lifecycle recovery MUST NOT commit obsolete results and MUST remove its listeners when unmounted.

#### Scenario: Refresh result becomes stale

- **WHEN** ownership or generation changes before a refresh finishes
- **THEN** that refresh result does not alter the current UI state

#### Scenario: Gate unmounts

- **WHEN** the authenticated coordinator unmounts
- **THEN** later lifecycle events do not resolve sessions or start loaders
