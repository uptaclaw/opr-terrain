# Branch Protection Setup Checklist

**⚠️ Repository admin access required**

This checklist guides repository administrators through enabling branch protection rules for the `main` branch.

## Prerequisites

- [ ] Repository admin or owner access
- [ ] `.github/workflows/deploy.yml` has been updated to run unit tests
- [ ] At least one successful workflow run exists on a pull request (so the `validate` check appears in the list)

## Setup Steps

### 1. Navigate to Branch Protection Settings

- [ ] Go to the repository on GitHub
- [ ] Click **Settings** tab
- [ ] Click **Branches** in the left sidebar
- [ ] Under "Branch protection rules", click **Add rule** (or **Edit** if a rule exists for `main`)

### 2. Configure Basic Protection

- [ ] Enter branch name pattern: `main`
- [ ] Check **Require a pull request before merging**
  - [ ] Optionally set "Required approvals" to `1` or more
  - [ ] Check "Dismiss stale pull request approvals when new commits are pushed" (recommended)

### 3. Configure Required Status Checks

- [ ] Check **Require status checks to pass before merging**
- [ ] Check **Require branches to be up to date before merging**
- [ ] In the search box under "Status checks found in the last week", search for and select:
  - [ ] `validate` (this is the job name from our workflow)

**Note:** If `validate` doesn't appear, you need to:
1. Open a test pull request
2. Wait for the workflow to run at least once
3. Return to this settings page (the check should now appear)

### 4. Configure Additional Restrictions

- [ ] Check **Do not allow bypassing the above settings** (recommended)
- [ ] Ensure **Allow force pushes** is UNCHECKED
- [ ] Ensure **Allow deletions** is UNCHECKED

### 5. Save and Verify

- [ ] Click **Save changes** at the bottom of the page
- [ ] Branch protection rules are now active

## Testing the Configuration

### Create a Test PR with Failing Tests

1. [ ] Create a new branch from `main`
2. [ ] Add a failing test (e.g., modify a test file to make an assertion fail)
3. [ ] Commit and push
4. [ ] Open a pull request
5. [ ] Wait for the `validate` workflow to run
6. [ ] Verify:
   - [ ] Workflow fails (red X)
   - [ ] "Merge pull request" button is disabled
   - [ ] Message shows: "Required status check(s) must pass before merging"

### Verify Normal Flow

1. [ ] Fix the failing test
2. [ ] Push the fix
3. [ ] Wait for the workflow to run again
4. [ ] Verify:
   - [ ] Workflow succeeds (green checkmark)
   - [ ] "Merge pull request" button is enabled
   - [ ] PR can be merged successfully

## What Gets Validated

When a PR is opened or updated, the `validate` job runs:

1. **Unit Tests (Vitest)**
   - All `*.test.ts` and `*.test.tsx` files in `src/`
   - Command: `npm run test`

2. **Build Validation**
   - TypeScript type checking (`tsc --noEmit`)
   - Vite production build
   - Command: `npm run build`

3. **End-to-End Tests (Playwright)**
   - All `*.spec.ts` files in `e2e/tests/`
   - Command: `npm run test:e2e`

**Any failure blocks the merge.**

## Troubleshooting

### Status check `validate` not appearing in the list

**Solution:** Open a PR and let the workflow run once. The check will then appear in the settings.

### "Merge" button still enabled despite failing checks

**Solution:** 
- Verify the rule is saved and active
- Check that the correct check (`validate`) is selected as required
- Try refreshing the page

### Want to bypass temporarily (emergency only)

**As an admin:**
- You can click "Merge without waiting for requirements"
- ⚠️ **Document why in PR comments** - this should be rare

## Ongoing Maintenance

- [ ] Monitor workflow runs for flaky tests
- [ ] Keep test execution time reasonable (< 5 minutes ideal)
- [ ] Update this checklist if workflow job names change
- [ ] Review and update required checks if new workflows are added

## References

- [Branch Protection Documentation](docs/BRANCH_PROTECTION.md) - Detailed guide
- [GitHub Actions Workflow](.github/workflows/deploy.yml) - Current CI configuration
- [GitHub Docs: Protected Branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)

---

**Setup completed:** Date: _____________ | Admin: _____________
