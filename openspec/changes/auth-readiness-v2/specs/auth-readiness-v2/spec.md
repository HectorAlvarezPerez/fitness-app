# Auth Readiness v2 Specification

## ADDED Requirements

### Requirement: Protected Initial Readiness

The application MUST withhold protected content until auth is confirmed and all seven contextual loaders succeed.

#### Scenario: Hydration remains pending
- GIVEN an authenticated protected route
- WHEN a required loader is pending
- THEN checking is shown and protected content is withheld

#### Scenario: Hydration succeeds
- GIVEN the current authenticated run
- WHEN all seven loaders succeed
- THEN protected content is shown

#### Scenario: Hydration fails
- GIVEN no ready state exists
- WHEN a required loader fails
- THEN a recoverable error is shown and content remains withheld

#### Scenario: Genuine null session
- GIVEN direct session lookup succeeds
- WHEN it confirms no session
- THEN retained user state is reset and the public experience is shown

### Requirement: Explicit Initial Auth Resolution

The application MUST treat the direct `getSession()` result as authoritative while initial lookup is pending and MUST NOT infer confirmed sign-out from a paired `INITIAL_SESSION(null)` when direct lookup fails.

#### Scenario: Resolved lookup error with paired null event
- GIVEN retained user state and a pending direct lookup
- WHEN `INITIAL_SESSION(null)` arrives and direct lookup resolves with an error
- THEN retained state is preserved and a recoverable error is shown

#### Scenario: Rejected lookup with paired null event
- GIVEN retained user state and a pending direct lookup
- WHEN `INITIAL_SESSION(null)` arrives and direct lookup rejects
- THEN retained state is preserved and the same recoverable error is shown

#### Scenario: Duplicate authenticated initial signals
- GIVEN hydration is active for one user
- WHEN duplicate initial/authenticated signals report that user
- THEN they reuse one run

#### Scenario: Obsolete user or lookup result
- GIVEN a newer authenticated user/run exists
- WHEN an older run or lookup completes
- THEN it MUST NOT change current readiness or error UI

### Requirement: Recovery Ownership and Login Transition

The application MUST recover only for the failed owner and MUST replace history after successful password login.

#### Scenario: Sign-out after error
- GIVEN an authenticated initial error
- WHEN auth confirms sign-out
- THEN retry is removed and no additional hydration starts

#### Scenario: Same-owner retry
- GIVEN hydration failed for user `u1`
- WHEN retry resolves `u1` and hydration succeeds
- THEN protected content is shown

#### Scenario: Different-owner retry
- GIVEN hydration failed for user `u1`
- WHEN retry resolves `u2`
- THEN the old recovery action starts no `u2` hydration

#### Scenario: Successful password login
- GIVEN valid credentials
- WHEN login succeeds
- THEN navigation replaces the current entry with `/home`
