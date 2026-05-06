import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync, execSync, spawn } from 'node:child_process';
import { loadConfig } from './qa/config.js';
import { loadRules } from './qa/rules-loader.js';
import { runSecurityPreflight } from './qa/security-preflight.js';
import { extractFigmaDesign } from './qa/figma-extractor.js';
import { scanWebsite } from './qa/website-scanner.js';
import { compareDesignToWebsite } from './qa/comparison-engine.js';
import { runAiReview } from './qa/ai-review.js';
import { generateReport } from './qa/report-generator.js';
import { createGithubIssues } from './qa/github-issues.js';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function runNpm(args) {
  if (process.platform === 'win32') {
    execSync(`${npmCommand} ${args.join(' ')}`, { stdio: 'inherit' });
    return;
  }

  execFileSync(npmCommand, args, { stdio: 'inherit' });
}

function spawnNpm(args) {
  if (process.platform === 'win32') {
    return spawn(`${npmCommand} ${args.join(' ')}`, {
      stdio: 'inherit',
      shell: true,
    });
  }

  return spawn(npmCommand, args, {
    stdio: 'inherit',
  });
}

function isLocalTarget(targetUrl) {
  try {
    const url = new URL(targetUrl);
    return ['127.0.0.1', 'localhost'].includes(url.hostname);
  } catch {
    return false;
  }
}

async function waitForUrl(targetUrl, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(targetUrl);
      if (response.ok) {
        return true;
      }
    } catch {
      // Server is not ready yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}

async function ensureLocalTarget(config) {
  if (!isLocalTarget(config.targetUrl)) {
    return null;
  }

  const target = new URL(config.targetUrl);
  runNpm(['run', 'build']);

  if (await waitForUrl(config.targetUrl, 1_000)) {
    return null;
  }

  const server = spawnNpm(['run', 'preview', '--', '--host', target.hostname, '--port', target.port || '4173', '--strictPort']);

  const ready = await waitForUrl(config.targetUrl);
  if (!ready) {
    server.kill();
    throw new Error(`Timed out waiting for local target: ${config.targetUrl}`);
  }

  return server;
}

async function main() {
  const config = loadConfig();
  const localServer = await ensureLocalTarget(config);

  console.log(`Design QA output: ${config.outputDir}`);
  console.log(`Figma: ${config.figmaUrl || `${config.figmaFileKey}/${config.figmaNodeId}`}`);
  console.log(`Target: ${config.targetUrl}`);
  console.log(`GitHub repo: ${config.githubRepo}`);

  try {
    const rules = await loadRules();
    const preflight = await runSecurityPreflight(config, rules);
    const figma = await extractFigmaDesign(config);
    const website = await scanWebsite(config);
    const comparison = await compareDesignToWebsite({ figma, website, config, preflight });
    const aiReview = await runAiReview({ config, rules, issues: comparison.issues });
    const report = await generateReport({ config, rules, figma, website, comparison, aiReview, preflight });
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
  } finally {
    localServer?.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

