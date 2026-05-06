import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const desktopChecklist =
  process.platform === 'win32' ? 'C:\\Users\\ahmar\\OneDrive\\Desktop\\QA checklist.md' : '';

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readMarkdownEntry({ title, group, sourcePath, route = '' }) {
  if (!sourcePath || !(await exists(sourcePath))) {
    return null;
  }

  const content = await fs.readFile(sourcePath, 'utf8');
  return {
    title,
    group,
    sourcePath,
    route,
    updatedAt: new Date().toISOString(),
    content,
  };
}

async function latestReportEntries() {
  const reportsRoot = path.join(root, 'reports', 'design-qa');
  if (!(await exists(reportsRoot))) {
    return [];
  }

  const dirs = (await fs.readdir(reportsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(reportsRoot, entry.name));

  if (!dirs.length) {
    return [];
  }

  const latest = (
    await Promise.all(
      dirs.map(async (dir) => ({
        dir,
        stat: await fs.stat(dir),
      })),
    )
  ).sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)[0].dir;

  const entries = [];
  const reportPath = path.join(latest, 'report.md');
  const report = await readMarkdownEntry({
    title: 'Latest Design QA Report',
    group: 'Latest Run',
    sourcePath: reportPath,
  });

  if (report) {
    entries.push(report);
  }

  const issuesDir = path.join(latest, 'issues');
  if (await exists(issuesDir)) {
    const issueFiles = (await fs.readdir(issuesDir))
      .filter((name) => name.endsWith('.md'))
      .sort()
      .slice(0, 20);

    for (const issueFile of issueFiles) {
      const entry = await readMarkdownEntry({
        title: issueFile.replace(/^\d+-/, '').replace(/-/g, ' ').replace(/\.md$/, ''),
        group: 'Latest GitHub-Ready Issues',
        sourcePath: path.join(issuesDir, issueFile),
      });
      if (entry) {
        entries.push(entry);
      }
    }
  }

  return entries;
}

export async function buildDashboardMarkdownDataset(extraEntries = []) {
  const sources = [
    {
      title: 'Frontend UI/UX Testing Checklist',
      group: 'QA Rule Dataset',
      sourcePath: path.join(root, 'docs', 'frontend-ui-ux-testing.md'),
      route: '/docs/frontend-ui-ux-testing.md',
    },
    {
      title: 'International UI/UX Rules',
      group: 'QA Rule Dataset',
      sourcePath: path.join(root, 'docs', 'qa-rules', 'ui-ux-rules.md'),
      route: '/docs/qa-rules/ui-ux-rules.md',
    },
    {
      title: 'Client QA Checklist',
      group: 'QA Rule Dataset',
      sourcePath: path.join(root, 'docs', 'qa-rules', 'client-qa-checklist.md'),
      route: '/docs/qa-rules/client-qa-checklist.md',
    },
    {
      title: 'Original Desktop QA Checklist',
      group: 'External Checklist Source',
      sourcePath: process.env.QA_CHECKLIST_PATH || desktopChecklist,
    },
  ];

  const entries = [
    ...(await Promise.all(sources.map(readMarkdownEntry))).filter(Boolean),
    ...extraEntries,
    ...(await latestReportEntries()),
  ];

  return {
    generatedAt: new Date().toISOString(),
    entries,
  };
}

export async function writeDashboardMarkdownDataset(extraEntries = [], options = {}) {
  const dataset = await buildDashboardMarkdownDataset(extraEntries);
  const writeDist = options.writeDist ?? process.env.npm_lifecycle_event !== 'prebuild';
  const outputs = [path.join(root, 'public', 'dashboard-markdown.json')];

  if (writeDist) {
    outputs.push(path.join(root, 'dist', 'dashboard-markdown.json'));
  }

  for (const output of outputs) {
    if (output.includes(`${path.sep}dist${path.sep}`) && !(await exists(path.dirname(output)))) {
      continue;
    }

    await fs.mkdir(path.dirname(output), { recursive: true });
    await fs.writeFile(output, JSON.stringify(dataset, null, 2));
  }

  for (const entry of dataset.entries.filter((item) => item.route)) {
    const publicPath = path.join(root, 'public', entry.route.replace(/^\//, ''));
    await fs.mkdir(path.dirname(publicPath), { recursive: true });
    await fs.writeFile(publicPath, entry.content);

    const distPath = path.join(root, 'dist', entry.route.replace(/^\//, ''));
    if (writeDist && (await exists(path.join(root, 'dist')))) {
      await fs.mkdir(path.dirname(distPath), { recursive: true });
      await fs.writeFile(distPath, entry.content);
    }
  }

  return dataset;
}

if (fileURLToPath(import.meta.url) === path.resolve(process.argv[1] || '')) {
  await writeDashboardMarkdownDataset();
}
