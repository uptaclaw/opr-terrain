# Developer Prompt Overrides

## Test Requirements

**CRITICAL: Before calling work_finish with result="done":**

1. **Check GitHub Actions CI status** - Navigate to your PR and verify the "PR Tests" workflow shows ✅ green
2. **All checks must pass:**
   - ✅ Unit tests (Vitest)
   - ✅ Build (TypeScript + Vite)
   - ✅ E2E tests (Playwright)
3. **Do NOT merge PRs with failing tests** - If any test fails, fix the issue and wait for CI to re-run
4. **Do NOT call work_finish until CI is green** - Failing tests = blocked, not done

## Why This Matters

This repository uses **policy-based test enforcement** (branch protection is not available). You are responsible for ensuring quality by checking CI status before completing work.

## If Tests Fail

- Use `result: "blocked"` if you cannot fix the issue
- Include the failing test details in your summary
- Do NOT bypass test failures by merging anyway
