# Contributing

## Test admission

Tests protect justified requirements. Existing tests and generated output describe behavior, not what must be preserved. A code change or reproduced bug does not automatically justify a permanent test.

Before adding or retaining a test, explain:

1. What requirement does it protect, and what justifies it independently of the code?
2. What consequential regression would it catch that other tests do not?
3. Does it exercise the relevant behavior, rather than reconstructing it in mocks?
4. Is permanent protection worth the fixture, brittleness and runtime cost, or would a simpler test or one-off check suffice?

**Dependencies:** Exercise our real configured integration, limited to features and interfaces we use or support. Keep Markdown compatibility checks; assert exact markup only where our consumers depend on it.

**Our code:** Set a higher bar: protect meaningful observable outcomes, not trivial helper logic, call sequences or incidental output. Use supported inputs and meaningful failures, not invented cases for branch coverage.

**Cleanup:** Rewrite a weak test only when the behavior merits permanent coverage. Otherwise remove it. Remove genuine duplication without losing distinct failure protection; sharing a plugin or function does not establish duplication.

The goal is useful protection, not test counts or coverage percentages.
