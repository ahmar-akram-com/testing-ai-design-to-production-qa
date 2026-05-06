# GitHub Update Guide

Use this checklist when publishing dashboard changes to `ahmar-akram-com/testing-ai-design-to-production-qa`.

## Files To Include

- `dashboard.html`
- `vite.config.js`
- `package.json`
- `package-lock.json`
- `.env.example`
- `.github/ISSUE_TEMPLATE/qa-design-comparison.yml`
- `.github/ISSUE_TEMPLATE/config.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/design-qa.yml`
- `.github/workflows/dashboard-ci.yml`
- `.github/workflows/pages.yml`
- `.github/dependabot.yml`
- `docs/frontend-ui-ux-testing.md`
- `docs/qa-agent-execution-setup.md`
- `docs/qa-rules/client-qa-checklist.md`
- `docs/qa-rules/ui-ux-rules.md`
- `scripts/sync-dashboard-markdown.js`
- `src/qa/`
- `src/run-design-qa.js`
- `tests/ui-audit.spec.js`
- `public/dashboard-markdown.json`
- `public/docs/`

## Files Not To Commit

- `.env`
- `node_modules/`
- `dist/`
- `reports/`
- `test-results/`
- `playwright-report/`
- `*.log`

## Before Push

```bash
npm run build
npm run qa
npm run qa:design
git status --short
```

Review `security-preflight.json` from the latest run and remove any exposed secret-like values before pushing.

