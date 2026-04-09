# Branch Protection Rules

This document describes the branch protection rules configured for the `main` branch to ensure code quality and prevent broken code from being merged.

## Overview

All pull requests to the `main` branch must pass required status checks before merging. This ensures that:
- All unit tests pass (Vitest)
- All end-to-end tests pass (Playwright)
- The build succeeds
- TypeScript type checking passes

## GitHub Actions Workflow

The `.github/workflows/deploy.yml` workflow runs on every pull request and performs the following checks:

1. **Unit Tests** - Runs Vitest test suite (`npm run test`)
2. **Build Validation** - Ensures TypeScript compiles and Vite builds successfully (`npm run build`)
3. **E2E Tests** - Runs Playwright end-to-end tests against a preview server (`npm run test:e2e`)

## Required Configuration

### Step 1: Enable Branch Protection Rules

Navigate to your GitHub repository settings:

1. Go to **Settings** → **Branches**
2. Click **Add branch protection rule** (or edit existing rule)
3. Enter branch name pattern: `main`

### Step 2: Configure Required Status Checks

Enable the following settings:

#### Required Status Checks
- ☑️ **Require status checks to pass before merging**
- ☑️ **Require branches to be up to date before merging**

Select the following required status checks:
- `validate` (this is the job name from our GitHub Actions workflow)

#### Pull Request Requirements
- ☑️ **Require a pull request before merging**
- ☑️ **Require approvals** (recommended: at least 1)
- ☑️ **Dismiss stale pull request approvals when new commits are pushed** (recommended)

#### Additional Restrictions
- ☑️ **Do not allow bypassing the above settings**
- ☐ **Allow force pushes** (keep this UNCHECKED)
- ☐ **Allow deletions** (keep this UNCHECKED)

### Step 3: Configure Repository Settings

Additional recommended settings:

1. Go to **Settings** → **General** → **Pull Requests**
   - ☑️ Allow squash merging (recommended for clean history)
   - ☑️ Automatically delete head branches (cleanup after merge)

## Testing the Configuration

### Verify Rules Are Active

1. Create a test branch and make a change that breaks tests
2. Open a pull request
3. Wait for the `validate` workflow to run
4. Confirm that:
   - The workflow fails due to test failures
   - The "Merge pull request" button is disabled
   - GitHub shows "Required status checks must pass before merging"

### Example Test Failure Scenarios

You can test branch protection by:

```bash
# Break a unit test
# Edit a test file to make it fail, commit, and push

# Break the build
# Introduce a TypeScript error, commit, and push

# Break an E2E test
# Change application behavior without updating E2E tests
```

## What Happens When Tests Fail

When the `validate` job fails:

1. ❌ The workflow run will be marked as failed
2. 🚫 The "Merge pull request" button will be disabled
3. 📝 GitHub will display: "Some checks were not successful"
4. 🔍 Click "Details" next to the failed check to view logs
5. ✅ Fix the issue, commit, and push - GitHub will re-run checks automatically

## Workflow Details

### Job: `validate`

This job runs on:
- Every pull request targeting `main`
- Every push to `main` (post-merge validation)
- Manual workflow dispatch

**Steps:**
1. Checkout code
2. Setup Node.js 20
3. Install dependencies (`npm ci`)
4. Install Playwright browsers
5. **Run unit tests** (`npm run test`)
6. **Build production bundle** (`npm run build`)
7. Start preview server
8. **Run E2E tests** (`npm run test:e2e`)
9. Upload artifacts if tests fail

### Job: `deploy`

This job runs only:
- After `validate` succeeds
- When pushing to `main` or manual workflow dispatch

## Bypassing Rules (Emergency Only)

Repository administrators can bypass branch protection rules in emergencies:

⚠️ **Use with extreme caution** - this defeats the purpose of automated quality checks.

1. Navigate to the PR
2. As an admin, you'll see "Merge without waiting for requirements to be met"
3. Document the reason for bypassing in the PR comments

## Maintaining Test Quality

To ensure branch protection remains effective:

1. **Keep tests reliable** - Flaky tests undermine trust
2. **Fix failing tests immediately** - Don't let broken tests linger
3. **Update tests with features** - Tests should evolve with code
4. **Monitor test execution time** - Slow tests delay merges
5. **Review test coverage** - Ensure critical paths are tested

## Status Badge

Add a status badge to README.md to show test status:

```markdown
[![Validate & Deploy](https://github.com/uptaclaw/opr-terrain/actions/workflows/deploy.yml/badge.svg)](https://github.com/uptaclaw/opr-terrain/actions/workflows/deploy.yml)
```

## Troubleshooting

### "Merge" button is disabled but checks passed

**Solution:** Click "Update branch" to merge latest `main` into your PR branch.

### Required check is not showing up

**Solution:** 
1. Ensure the workflow has run at least once on a PR
2. Check that the job name matches exactly: `validate`
3. Re-save the branch protection rule to refresh available checks

### Workflow is not running

**Solution:**
1. Verify the workflow file syntax is correct
2. Check that the PR targets the `main` branch
3. Review Actions tab for workflow execution logs

### Tests pass locally but fail in CI

Common causes:
- Environment differences (Node version, dependencies)
- Missing environment variables
- Timing issues in E2E tests
- Browser differences (Playwright uses Chromium in CI)

## References

- [GitHub Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Actions Status Checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
