import fs from 'node:fs/promises';
import path from 'node:path';

function issueBody(issue, config) {
  return `## Summary
${issue.summary}

## Environment
- Page: ${config.targetUrl}
- Build/commit: ${process.env.GITHUB_SHA || 'Local run'}
- Browser/device: Playwright Chromium
- Viewport: Desktop, tablet, mobile scan
- Figma reference: ${config.figmaUrl || `${config.figmaFileKey}/${config.figmaNodeId}`}

## Severity / Priority
- Severity: ${issue.severity}
- Priority: ${issue.priority}

## Preconditions
- Figma URL and website URL are configured for the QA agent.
- Run \`npm run qa:design\`.

## Steps To Reproduce
1. Open the target page: ${config.targetUrl}
2. Compare against the Figma reference.
3. Review the attached/generated evidence paths in the QA report.

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

export async function generateReport({ config, rules, figma, website, comparison, aiReview }) {
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
    figmaAvailable: figma.available,
    issueCount: comparison.issues.length,
    issues: comparison.issues.map((item) => ({
      title: item.title,
      severity: item.severity,
      priority: item.priority,
    })),
    reportDir: config.outputDir,
    aiReviewPath: aiReview.reviewPath,
  };

  await fs.writeFile(path.join(config.outputDir, 'summary.json'), JSON.stringify(summary, null, 2));

  const report = `# Design QA Report

Generated: ${new Date().toISOString()}

## Inputs

- Figma URL: ${config.figmaUrl || 'Not provided'}
- Figma file key: ${config.figmaFileKey || 'Not provided'}
- Figma node ID: ${config.figmaNodeId || 'Not provided'}
- Target URL: ${config.targetUrl}
- GitHub repo: ${config.githubRepo}
- Create GitHub issues: ${config.createIssues}

## Rule Files

${rules.map((rule) => `- ${rule.file}`).join('\n') || '- No rule files loaded'}

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
- Summary: ${item.summary}`).join('\n\n') : 'No issues detected by automated checks.'}

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

  return {
    reportPath,
    summary,
    githubIssues,
  };
}

