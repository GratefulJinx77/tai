# Skill: New Endpoint

## Role Access
- Architect
- Developer

## Trigger
Developer requests a new API route or endpoint.

## Pre-conditions
- Project stack and commands defined in `.tai/config/project.yaml`
- API patterns documented in `.tai/context/patterns.md` (route structure, middleware, response format)
- Boundary rules defined in `.tai/context/boundaries.md`
- Sprint ISC in `.tai/context/sprint-current.md` includes work that requires this endpoint

## Steps

1. Read `.tai/context/patterns.md` to identify existing route, middleware, error handling, and response format conventions.
2. Read existing route files to confirm actual patterns match documented patterns.
3. Confirm with the developer: HTTP method, path, auth requirements (which roles), request/response shape.
4. Create a validation schema for all request inputs (params, query, body) following project conventions.
5. Create the route handler file following the project's file naming and organization conventions from `patterns.md`.
6. Wire in auth middleware with the correct role checks for this endpoint.
7. Use parameterized SQL for all database queries — no string interpolation or template literals in queries.
8. Follow the project's standard error response format for all error paths (validation, auth, not found, server error).
9. Register the route in the project's route registry or router configuration.
10. Create or update shared types so request/response types are available to both client and server.
11. Write integration tests covering at minimum:
    - Happy path (valid request, authorized user, expected response)
    - Auth rejection (unauthenticated request, wrong role)
    - Validation failure (missing required fields, invalid types, boundary values)
12. Run the test suite using the command from `.tai/config/project.yaml` → `commands.test`.
13. Run the type checker using the command from `.tai/config/project.yaml` → `commands.type_check`.
14. Log skill completion to `.tai/telemetry/sessions.jsonl`.

## Verification Gate
- [ ] Validation schema covers all request inputs
- [ ] Auth middleware checks the correct roles for this endpoint
- [ ] All SQL queries use parameterized statements
- [ ] Error responses follow the project's standard format
- [ ] At least 3 test scenarios exist (happy path, auth rejection, validation failure)
- [ ] Shared types are registered and importable by client code
- [ ] All tests pass
- [ ] Type checker passes
