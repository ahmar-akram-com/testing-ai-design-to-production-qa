import fs from 'node:fs/promises';
import path from 'node:path';

async function readMarkdownFiles(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await readMarkdownFiles(fullPath)));
      } else if (entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }

    return files;
  } catch {
    return [];
  }
}

export async function loadRules() {
  const files = [
    path.resolve('docs', 'frontend-ui-ux-testing.md'),
    ...(await readMarkdownFiles(path.resolve('docs', 'qa-rules'))),
  ];
  const loaded = [];

  for (const file of [...new Set(files)]) {
    try {
      loaded.push({
        file,
        content: await fs.readFile(file, 'utf8'),
      });
    } catch {
      // Optional rule files should not block a QA run.
    }
  }

  return loaded;
}

