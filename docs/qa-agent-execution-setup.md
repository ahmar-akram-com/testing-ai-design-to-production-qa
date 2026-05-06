# CLI Design QA Agent Execution Setup

## One-Line Goal

Build and run a CLI-based AI QA agent where QA provides a required Figma design URL, required developed page URL, and Markdown QA rules, then receives a UI/UX mismatch report, screenshots, DOM/CSS evidence, and GitHub-ready bugs.

## Repository Structure

```text
GitHub Repo
|-- docs/qa-rules/                 # Markdown QA rules
|-- src/qa/figma-extractor.js      # Figma REST extraction
|-- src/qa/website-scanner.js      # Playwright screenshot/DOM/CSS capture
|-- src/qa/comparison-engine.js    # Design vs implementation checks
|-- src/qa/ai-review.js            # Optional OpenAI/Claude review
|-- src/qa/report-generator.js     # Markdown/JSON report output
|-- src/qa/github-issues.js        # Optional GitHub issue creation
|-- src/run-design-qa.js           # Single-command orchestrator
`-- .github/workflows/design-qa.yml
```

## Install

```bash
npm install
npx playwright install
```

## Configure

Copy `.env.example` to `.env`, then set:

```bash
FIGMA_TOKEN=your_figma_token
FIGMA_URL=https://www.figma.com/design/EXV5Pmw3DFPKyUwVvM6rZP/Rival-Website?node-id=13331-2&p=f&t=fy1LQiasuW4JTImj-0
QA_CHECKLIST_PATH=C:\Users\ahmar\OneDrive\Desktop\QA checklist.md
TARGET_URL=http://127.0.0.1:4173/
HTTP_AUTH_USERNAME=
HTTP_AUTH_PASSWORD=
GITHUB_TOKEN=your_github_token
GITHUB_REPO=ahmar-akram-com/testing-ai-design-to-production-qa
CREATE_GITHUB_ISSUES=true
```

`CREATE_GITHUB_ISSUES=false` keeps the run local and writes GitHub-ready issue Markdown files under `reports/`.

## Run

```bash
npm run qa:design
```

Local override:

```bash
npm run qa:local
```

Direct CLI override:

```bash
node src/run-design-qa.js --figma-url "https://www.figma.com/design/..." --target-url "http://127.0.0.1:4173/" --github-repo "ahmar-akram-com/testing-ai-design-to-production-qa" --create-issues
```

## What The Command Does

1. Reads `.env`, CLI args, Markdown QA rules, the optional `QA_CHECKLIST_PATH` checklist file, and optional HTTP basic auth credentials.
2. Runs security/access preflight for the Figma URL, developed page URL, Figma API access, and Markdown checklist files.
3. Extracts Figma node JSON and a frame image when `FIGMA_TOKEN` is available.
4. Opens the website URL with Playwright, including HTTP credentials when configured.
5. Captures screenshots, DOM, CSS summary, console errors, network failures, and axe accessibility results.
6. Compares the Figma design source against the developed page URL, including screenshots, DOM/CSS evidence, accessibility results, visual diff where exact data is available, checklist rules, and security/access findings.
7. Applies Markdown QA rules.
8. Generates a timestamped QA report under `reports/design-qa/`.
9. Creates GitHub issues when `CREATE_GITHUB_ISSUES=true` and `GITHUB_TOKEN` has access to `GITHUB_REPO`.

The GitHub issue form requires both the Figma design URL and developed page URL. This keeps every defect traceable to the approved design source and the exact implementation under test.

## Output

Each run creates:

```text
reports/design-qa/{timestamp}/
|-- report.md
|-- summary.json
|-- ai-review.md
|-- figma/
|-- website/
`-- issues/
```

## Recommended Execution Model

```text
Developer builds frontend locally
        |
QA runs npm run qa:design
        |
Agent compares Figma with local/staging URL
        |
Report generated
        |
GitHub issues created
        |
Codex/Claude review output suggests fixes
```
