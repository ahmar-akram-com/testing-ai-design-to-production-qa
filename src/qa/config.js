import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const DEFAULT_FIGMA_URL =
  'https://www.figma.com/design/EXV5Pmw3DFPKyUwVvM6rZP/Rival-Website?node-id=13331-2&p=f&t=fy1LQiasuW4JTImj-0';

function parseArgs(argv) {
  const args = {};

  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];

    if (!item.startsWith('--')) {
      continue;
    }

    const [rawKey, inlineValue] = item.slice(2).split('=');
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

    if (inlineValue !== undefined) {
      args[key] = inlineValue;
      continue;
    }

    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    i += 1;
  }

  return args;
}

export function parseFigmaUrl(figmaUrl = '') {
  try {
    const url = new URL(figmaUrl);
    const parts = url.pathname.split('/').filter(Boolean);
    const fileKey = parts[1] || '';
    const nodeParam = url.searchParams.get('node-id') || '';

    return {
      fileKey,
      nodeId: nodeParam.replace('-', ':'),
    };
  } catch {
    return { fileKey: '', nodeId: '' };
  }
}

export function loadConfig(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const figmaUrl = args.figmaUrl || process.env.FIGMA_URL || DEFAULT_FIGMA_URL;
  const parsedFigma = parseFigmaUrl(figmaUrl);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportsRoot = path.resolve('reports', 'design-qa');
  const outputDir = path.join(reportsRoot, timestamp);

  fs.mkdirSync(outputDir, { recursive: true });

  return {
    figmaUrl,
    figmaToken: process.env.FIGMA_TOKEN || '',
    figmaFileKey: args.figmaFileKey || process.env.FIGMA_FILE_KEY || parsedFigma.fileKey,
    figmaNodeId: args.figmaNodeId || process.env.FIGMA_NODE_ID || parsedFigma.nodeId,
    targetUrl: args.targetUrl || process.env.TARGET_URL || 'http://127.0.0.1:5173/',
    githubToken: process.env.GITHUB_TOKEN || '',
    githubRepo: args.githubRepo || process.env.GITHUB_REPO || 'ComputanTeam/uoft-facilities-services',
    createIssues:
      args.createIssues === true ||
      args.createIssues === 'true' ||
      String(process.env.CREATE_GITHUB_ISSUES || '').toLowerCase() === 'true',
    aiProvider: args.aiProvider || process.env.AI_PROVIDER || 'none',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    openaiModel: process.env.OPENAI_MODEL || '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    anthropicModel: process.env.ANTHROPIC_MODEL || '',
    outputDir,
    reportsRoot,
    viewports: [
      { name: 'desktop', width: 1440, height: 1200 },
      { name: 'tablet', width: 834, height: 1112 },
      { name: 'mobile', width: 390, height: 1200, isMobile: true },
    ],
  };
}
