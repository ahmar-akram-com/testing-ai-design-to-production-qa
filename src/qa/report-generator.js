import fs from 'node:fs/promises';
import path from 'node:path';
import { writeDashboardMarkdownDataset } from '../../scripts/sync-dashboard-markdown.js';

const STANDARDS_BASELINE = [
  'WCAG 2.2 AA accessibility baseline',
  'Responsive layout coverage for desktop, tablet, and mobile',
  'Visual fidelity for layout, spacing, typography, color, imagery, and component states',
  'Semantic HTML, keyboard support, accessible names, headings, and landmarks',
  'Runtime stability with no unexpected console errors, network failures, or missing assets',
  'Client QA checklist coverage for logo, navigation, links, metadata, forms, images, and responsive behavior',
];

function requiredValue(value) {
  return value || 'Required but not configured';
}

function figmaReference(config) {
  return config.figmaUrl || `${config.figmaFileKey}/${config.figmaNodeId}`;
}

function mdList(items, fallback = '- None') {
  return items?.length ? items.map((item) => `- ${item}`).join('\n') : fallback;
}

function screenshotMarkdown(items = []) {
  if (!items.length) {
    return '- No screenshot evidence attached.';
  }

  return items
    .map((item, index) => {
      const normalized = String(item).replace(/\\/g, '/');
      return `- Screenshot ${index + 1}: ${item}\n\n  ![Screenshot ${index + 1}](${normalized})`;
    })
    .join('\n');
}

function comparisonMode(figma) {
  if (figma.available && figma.screenshotPath) {
    return 'Exact Figma node extraction with screenshot evidence';
  }

  if (figma.available) {
    return 'Figma node extraction available; frame screenshot unavailable';
  }

  return 'Limited comparison; provide FIGMA_TOKEN with file access for exact design extraction';
}

function issueBody(issue, config) {
  return `## Summary
${issue.summary}

## Design Source vs Developed Page
- Figma design URL: ${requiredValue(config.figmaUrl)}
- Figma file key: ${requiredValue(config.figmaFileKey)}
- Figma frame/node ID: ${requiredValue(config.figmaNodeId)}
- Developed page URL: ${requiredValue(config.targetUrl)}
- Source of truth: Approved Figma design file and frame/node above

## Figma vs Developed Page Comparison
- Expected from Figma/design source: ${issue.expected}
- Actual on developed page: ${issue.actual}
- Difference to resolve: ${issue.summary}
- Evidence: ${issue.evidence.length ? issue.evidence.join('; ') : 'See generated report artifacts.'}

## QA Docs Rules Applied
${mdList(issue.ruleRefs, '- No specific markdown rule match was attached; see the full QA rule dataset in the report.')}

## Screenshot Evidence
${screenshotMarkdown(issue.screenshots)}

## Standards Baseline
${STANDARDS_BASELINE.map((item) => `- ${item}`).join('\n')}

## Environment
- Developed page: ${config.targetUrl}
- Build/commit: ${process.env.GITHUB_SHA || 'Local run'}
- Browser/device: Playwright Chromium
- Viewport: Desktop, tablet, mobile scan
- Figma reference: ${figmaReference(config)}

## Severity / Priority
- Severity: ${issue.severity}
- Priority: ${issue.priority}

## Preconditions
- Figma design URL is configured and points to the approved source design.
- Developed page URL is configured and reachable.
- FIGMA_TOKEN has access to the Figma file when exact design extraction is required.
- If the developed page uses HTTP authentication, valid HTTP_AUTH_USERNAME and HTTP_AUTH_PASSWORD are configured.
- Run \`npm run qa:design\`.

## Steps To Reproduce
1. Open the developed page URL: ${config.targetUrl}
2. Open the Figma design URL: ${figmaReference(config)}
3. Compare the affected section/component at desktop, tablet, and mobile where applicable.
4. Review attached screenshots, visual diff, DOM/CSS, console, and axe evidence in the QA report.

## Actual Result
${issue.actual}

## Expected Result
${issue.expected}

## Impact
${issue.impact}

## Evidence
${issue.evidence.length ? issue.evidence.map((item) => `- ${item}`).join('\n') : '- See generated report artifacts.'}

## Acceptance Criteria
${issue.acceptance.map((item) => `- [ ] ${item}`).join('\n')}
`;
}

export function toGithubIssue(issue, config) {
  return {
    title: issue.title,
    body: issueBody(issue, config),
  };
}

export async function generateReport({ config, rules, figma, website, comparison, aiReview, preflight }) {
  const issuesDir = path.join(config.outputDir, 'issues');
  await fs.mkdir(issuesDir, { recursive: true });

  const githubIssues = comparison.issues.map((item) => toGithubIssue(item, config));

  for (let index = 0; index < githubIssues.length; index += 1) {
    const issue = githubIssues[index];
    const slug = issue.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-|-$/g, '');
    const issuePath = path.join(issuesDir, `${String(index + 1).padStart(3, '0')}-${slug}.md`);
    await fs.writeFile(issuePath, `# ${issue.title}\n\n${issue.body}`);
  }

  const summary = {
    targetUrl: config.targetUrl,
    figmaUrl: config.figmaUrl,
    figmaFileKey: config.figmaFileKey,
    figmaNodeId: config.figmaNodeId,
    figmaAvailable: figma.available,
    comparisonMode: comparisonMode(figma),
    preflightPath: preflight?.outputPath || '',
    preflight: preflight
      ? {
          basicAuthConfigured: preflight.auth.basicAuthConfigured,
          urls: preflight.urls.map((item) => ({
            name: item.name,
            accessible: item.accessible,
            status: item.status,
            requiresAuthentication: item.requiresAuthentication,
            authProvided: item.authProvided,
            securityFindings: item.securityFindings,
          })),
          figmaApi: preflight.figmaApi,
          inaccessibleFiles: preflight.files.filter((file) => !file.accessible).map((file) => file.file),
        }
      : null,
    issueCount: comparison.issues.length,
    issues: comparison.issues.map((item) => ({
      title: item.title,
      severity: item.severity,
      priority: item.priority,
      viewport: item.viewport,
      screenshots: item.screenshots,
      evidence: item.evidence,
      ruleRefs: item.ruleRefs,
    })),
    reportDir: config.outputDir,
    aiReviewPath: aiReview.reviewPath,
  };

  await fs.writeFile(path.join(config.outputDir, 'summary.json'), JSON.stringify(summary, null, 2));

  const report = `# Design QA Report

Generated: ${new Date().toISOString()}

## Inputs

- Figma design URL: ${requiredValue(config.figmaUrl)}
- Figma file key: ${requiredValue(config.figmaFileKey)}
- Figma node ID: ${requiredValue(config.figmaNodeId)}
- Developed page URL: ${requiredValue(config.targetUrl)}
- GitHub repo: ${config.githubRepo}
- Create GitHub issues: ${config.createIssues}
- HTTP auth configured: ${Boolean(config.httpAuth.username && config.httpAuth.password)}

## Design vs Developed Page Comparison

- Comparison mode: ${comparisonMode(figma)}
- Design source: ${figmaReference(config)}
- Developed page: ${config.targetUrl}
- Visual diff: ${
    comparison.visualComparison
      ? comparison.visualComparison.comparable
        ? `${(comparison.visualComparison.mismatchRatio * 100).toFixed(2)}% mismatch (${comparison.visualComparison.diffPath})`
        : `Not comparable: ${comparison.visualComparison.reason}`
      : 'Not generated'
  }
- Required baseline: ${STANDARDS_BASELINE.join('; ')}

## Security And Access Preflight

- Preflight artifact: ${preflight?.outputPath || 'Not generated'}
- HTTP basic auth configured: ${preflight?.auth?.basicAuthConfigured ?? false}

${preflight?.urls
  ?.map(
    (item) => `### ${item.name}

- URL: ${item.url}
- Accessible: ${item.accessible}
- Status: ${item.status || 'Unavailable'}
- Requires authentication: ${item.requiresAuthentication}
- Auth provided: ${item.authProvided}
- Auth challenge: ${item.authChallenge || 'None'}
- Security findings: ${item.securityFindings?.length ? item.securityFindings.join('; ') : 'None'}
- Headers checked: ${Object.keys(item.headers || {}).length ? JSON.stringify(item.headers) : 'None'}`,
  )
  .join('\n\n') || 'No URL preflight data.'}

### Figma API

- Accessible: ${preflight?.figmaApi?.accessible ?? false}
- Status: ${preflight?.figmaApi?.status || 'Unavailable'}
- Auth provided: ${preflight?.figmaApi?.authProvided ?? false}
- Error: ${preflight?.figmaApi?.error || 'None'}

### Markdown / Checklist Files

${preflight?.files
  ?.map((file) => `- ${file.accessible ? 'OK' : 'BLOCKED'}: ${file.file}${file.error ? ` (${file.error})` : ''}`)
  .join('\n') || '- No file preflight data.'}

## Rule Files

${rules.map((rule) => `- ${rule.file}`).join('\n') || '- No rule files loaded'}

## QA Docs Dataset Applied To Scan

${rules
  .map(
    (rule) => `### ${path.basename(rule.file)}

- Source: ${rule.file}
- Characters loaded: ${rule.content.length}
- Sample rules:
${rule.content
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => /^[-*]\s+/.test(line))
  .slice(0, 8)
  .map((line) => `  ${line}`)
  .join('\n') || '  - No bullet rules found.'}`,
  )
  .join('\n\n') || 'No markdown QA docs were loaded.'}

## Figma Extraction

- Available: ${figma.available}
- Node JSON: ${figma.nodePath || 'Not generated'}
- Frame screenshot: ${figma.screenshotPath || 'Not generated'}
- Warnings: ${figma.warnings.length ? figma.warnings.join('; ') : 'None'}

## Website Capture

${website.scans
  .map(
    (scan) => `### ${scan.viewport.name}

- Screenshot: ${scan.screenshotPath}
![${scan.viewport.name} screenshot](${scan.screenshotPath.replace(/\\/g, '/')})

- DOM: ${scan.domPath}
- Axe: ${scan.axePath}
- Console/network: ${scan.consolePath}
- Status: ${scan.statusCode}
- Document size: ${scan.dom.scroll.width}x${scan.dom.scroll.height}
- Axe violations: ${scan.axe.violations.length}`,
  )
  .join('\n\n')}

## Findings

${comparison.issues.length ? comparison.issues.map((item, index) => `### ${index + 1}. ${item.title}

- Severity: ${item.severity}
- Priority: ${item.priority}
- Viewport: ${item.viewport || 'All / preflight'}
- Summary: ${item.summary}
- Expected from Figma/design/rules: ${item.expected}
- Actual on developed page: ${item.actual}
- QA docs matched:
${mdList(item.ruleRefs, '  - No direct markdown rule match attached.')}
- Evidence:
${mdList(item.evidence, '  - See generated artifacts.')}
- Screenshots:
${screenshotMarkdown(item.screenshots)}
- Acceptance criteria:
${item.acceptance.map((acceptance) => `  - [ ] ${acceptance}`).join('\n') || '  - [ ] Re-run QA and confirm the issue is resolved.'}`).join('\n\n') : 'No issues detected by automated checks.'}

## AI Review

${aiReview.reviewPath}

## GitHub-Ready Issue Files

${githubIssues.length ? githubIssues.map((item, index) => {
    const slug = item.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-|-$/g, '');
    return `- issues/${String(index + 1).padStart(3, '0')}-${slug}.md`;
  }).join('\n') : '- None'}
`;

  const reportPath = path.join(config.outputDir, 'report.md');
  await fs.writeFile(reportPath, report);
  await writeDashboardMarkdownDataset([], { writeDist: true });

  return {
    reportPath,
    summary,
    githubIssues,
  };
}

