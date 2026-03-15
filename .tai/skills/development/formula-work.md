# Skill: Formula Work

## Role Access
- Architect
- Developer

## Trigger
Developer works on formulas, calculations, computed values, or business logic involving numeric operations.

## Pre-conditions
- Project stack and commands defined in `.tai/config/project.yaml`
- The formula's purpose and expected behavior are understood
- Input data sources and output consumers are identified

## Steps

1. Document the formula: its purpose, mathematical definition, input types, and expected output type.
2. Identify all edge cases:
   - Zero values (division by zero, zero inputs)
   - Negative values (where applicable)
   - Overflow/underflow conditions
   - Null or undefined inputs
   - Boundary values (min/max of expected ranges)
   - Floating-point precision concerns
3. Determine cache implications: will this value be cached? What invalidates the cache? Document the cache strategy.
4. Create a test matrix covering every identified edge case and boundary value.
5. Implement the formula following patterns from `.tai/context/patterns.md`.
6. Handle all identified edge cases explicitly in the implementation (no silent failures).
7. Run all tests using the command from `.tai/config/project.yaml` → `commands.test`.
8. Verify the cache strategy works correctly if caching is involved.
9. Log skill completion to `.tai/telemetry/sessions.jsonl`.

## Verification Gate
- [ ] Formula is documented with purpose, inputs, and outputs
- [ ] Edge cases are documented (zero, negative, overflow, null)
- [ ] Test matrix covers all identified boundary values
- [ ] Cache strategy is defined (or explicitly marked as not cached)
- [ ] All tests pass
