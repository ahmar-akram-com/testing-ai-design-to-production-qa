import fs from 'node:fs/promises';
import path from 'node:path';
import { loadConfig } from './qa/config.js';
import { loadRules } from './qa/rules-loader.js';
import { extractFigmaDesign } from './qa/figma-extractor.js';
import { scanWebsite } from './qa/website-scanner.js';
import { compareDesignToWebsite } from './qa/comparison-engine.js';
import { runAiReview } from './qa/ai-review.js';
import { generateReport } from './qa/report-generator.js';
import { createGithubIssues } from './qa/github-issues.js';

async function main() {
  const config = loadConfig();
  console.log(`Design QA output: ${config.outputDir}`);
  console.log(`Figma: ${config.figmaUrl || `${config.figmaFileKey}/${config.figmaNodeId}`}`);
  console.log(`Target: ${config.targetUrl}`);
  console.log(`GitHub repo: ${config.githubRepo}`);

  const rules = await loadRules();
  const figma = await extractFigmaDesign(config);
  const website = await scanWebsite(config);
  const comparison = await compareDesignToWebsite({ figma, website, config });
  const aiReview = await runAiReview({ config, rules, issues: comparison.issues });
  const report = await generateReport({ config, rules, figma, website, comparison, aiReview });
  const github = await createGithubIssues({ config, githubIssues: report.githubIssues });

  await fs.writeFile(path.join(config.outputDir, 'github-issues-result.json'), JSON.stringify(github, null, 2));

  console.log(`Report: ${report.reportPath}`);
  console.log(`Findings: ${comparison.issues.length}`);

  if (github.created.length) {
    console.log('Created GitHub issues:');
    for (const created of github.created) {
      console.log(`- #${created.number}: ${created.url}`);
    }
  } else {
    console.log(`GitHub issue creation: ${github.skipped ? 'skipped' : 'no issues created'}`);
    for (const error of github.errors) {
      console.log(`- ${error}`);
    }
  }

  if (comparison.issues.some((item) => ['Critical', 'High'].includes(item.severity))) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

