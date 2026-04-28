# CLI Design QA Agent Execution Setup

## One-Line Goal

Build and run a CLI-based AI QA agent where QA provides a Figma URL, website URL, and Markdown QA rules, then receives a UI/UX mismatch report, screenshots, DOM/CSS evidence, and GitHub-ready bugs.

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
TARGET_URL=http://127.0.0.1:9001/
GITHUB_TOKEN=your_github_token
GITHUB_REPO=ComputanTeam/uoft-facilities-services
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
node src/run-design-qa.js --figma-url "https://www.figma.com/design/..." --target-url "http://127.0.0.1:9001/" --github-repo "ComputanTeam/uoft-facilities-services" --create-issues
```

## What The Command Does

1. Reads `.env` and CLI args.
2. Extracts Figma node JSON and a frame image when `FIGMA_TOKEN` is available.
3. Opens the website URL with Playwright.
4. Captures screenshots, DOM, CSS summary, console errors, network failures, and axe accessibility results.
5. Compares Figma vs website where exact data is available.
6. Applies Markdown QA rules.
7. Generates a timestamped QA report under `reports/design-qa/`.
8. Creates GitHub issues when `CREATE_GITHUB_ISSUES=true` and `GITHUB_TOKEN` has access.

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
