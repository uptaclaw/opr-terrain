# Pull Request

## Description
<!-- Brief description of what this PR does -->

## Type of Change
<!-- Mark relevant items with [x] -->

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)

## Testing Checklist

Before requesting review, verify:

- [ ] Unit tests pass locally (`npm run test`)
- [ ] E2E tests pass locally (`npm run test:e2e`)
- [ ] Build succeeds (`npm run build`)
- [ ] GitHub Actions "PR Tests" workflow shows ✅ green
- [ ] No test failures or CI errors

## Reviewer Checklist

Reviewers must verify:

- [ ] All GitHub Actions checks are green
- [ ] Code changes are clear and well-documented
- [ ] Tests cover new functionality or bug fixes
- [ ] No shortcuts or bypasses of test requirements

---

**Note:** This repository uses policy-based test enforcement. PRs should only be merged when all CI checks pass.
