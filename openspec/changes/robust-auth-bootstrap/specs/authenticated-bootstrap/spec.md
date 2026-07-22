# Authenticated Bootstrap Specification

## Purpose

Define identity-safe store primitives for loading authenticated user-scoped data. Route readiness, UI gating, lifecycle coalescing, and retry presentation are reserved for later independent changes.

## Requirements

### Requirement: Contextual Loader Identity and Results

The seven bootstrap loaders MUST accept an optional `LoadContext`. A contextual call MUST resolve auth, classify the outcome as `ok`, `signed-out`, `request-failed`, or `stale`, and MUST NOT query or mutate for an invalid identity.

#### Scenario: Current authenticated identity

- GIVEN a contextual loader targets the current authenticated user
- WHEN auth and a non-empty data request succeed
- THEN the loader commits the returned slice
- AND it returns `{ ok: true }`

#### Scenario: Empty successful read

- GIVEN a contextual loader targets the current authenticated user
- WHEN the request succeeds with an empty result
- THEN the loader commits the slice's empty value
- AND it returns `{ ok: true }`

#### Scenario: Signed-out identity

- GIVEN a contextual loader has a target user
- WHEN auth resolves without a user
- THEN it returns `signed-out`
- AND it performs no data query or mutation

#### Scenario: Different authenticated identity

- GIVEN a contextual loader targets one user
- WHEN auth resolves a different user
- THEN it returns `stale`
- AND it performs no data query or mutation

#### Scenario: Explicit auth failure

- GIVEN a contextual loader targets a user
- WHEN `getSession` or `getUser` returns an error with null or empty auth data
- THEN it returns `request-failed`
- AND it performs no data query or mutation

### Requirement: Contextual Failure and Stale Protection

Contextual loaders MUST preserve the previously usable slice when a request fails or becomes obsolete. They MUST check generation before querying and immediately before committing.

#### Scenario: Data request failure

- GIVEN a prior slice exists for the current user
- WHEN its contextual data request returns an error
- THEN the loader returns `request-failed`
- AND the prior slice remains unchanged

#### Scenario: Obsolete before query

- GIVEN auth resolves the requested user
- WHEN `isCurrent()` is false before the data query
- THEN the loader returns `stale`
- AND it performs no data query or mutation

#### Scenario: Obsolete after query

- GIVEN a contextual request has returned data
- WHEN `isCurrent()` becomes false before commit
- THEN the loader returns `stale`
- AND it does not replace the prior slice or trigger an active-workout flush

### Requirement: Active-Workout Ownership and Legacy Compatibility

Contextual active-workout reconciliation MUST bind any resulting flush to the requested user and generation. Calls without context MUST retain the established loader and reconciliation behavior.

#### Scenario: Session changes during contextual flush

- GIVEN reconciliation captured a locally newer workout for one user
- WHEN the session resolves a different user during the asynchronous flush
- THEN no upsert occurs for either identity

#### Scenario: Generation changes during contextual flush

- GIVEN reconciliation captured a locally newer workout for the requested user
- WHEN the generation becomes stale during the asynchronous flush
- THEN no upsert occurs

#### Scenario: Existing reconciliation outcomes

- GIVEN `loadActiveWorkout` is called without context
- WHEN local-newer, server-newer, no-server-row, empty, or transient-error conditions occur
- THEN the established keep, adopt, recreate, clear, or retain behavior remains unchanged

#### Scenario: Existing signed-out outcomes

- GIVEN the seven loaders are called without context while signed out
- WHEN auth resolves without a user
- THEN `loadUserData` clears `userData` and `loadActiveWorkout` clears workout identity
- AND the other user-scoped loaders return without mutating their prior slices
