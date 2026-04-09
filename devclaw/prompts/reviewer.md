# Reviewer Prompt Overrides

## Test Requirements - MANDATORY CHECKS

**Before approving any PR, you MUST verify:**

### 1. GitHub Actions Status
- ✅ Navigate to the PR and check the "PR Tests" workflow
- ✅ All checks must be GREEN:
  - Unit tests (Vitest)
  - Build (TypeScript + Vite)
  - E2E tests (Playwright)

### 2. Automatic Rejection Rules

**REJECT the PR immediately if:**
- ❌ Any test is failing (red X)
- ❌ CI workflow shows errors
- ❌ Tests were skipped or not run
- ❌ Workflow is still running (yellow dot) - wait for completion

### 3. Policy Enforcement

This repository uses **policy-based test enforcement** (branch protection not available). As a reviewer, you are the final quality gate.

**Your responsibility:**
- Only approve PRs with all tests passing
- Provide clear feedback on test failures
- Do NOT approve PRs with the expectation that "tests will be fixed later"

## Review Checklist

- [ ] All GitHub Actions checks are green
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Build succeeds
- [ ] Code meets quality standards
- [ ] No shortcuts or bypasses of test requirements

**If tests fail:** Use `result: "reject"` and reference the specific failing tests in your feedback.
