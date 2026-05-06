import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const distDir = path.join(root, 'dist');

await fs.mkdir(distDir, { recursive: true });
await fs.writeFile(
  path.join(distDir, 'index.html'),
  '<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=./dashboard.html"><title>Design QA Cockpit</title></head><body><a href="./dashboard.html">Open Design QA Cockpit</a></body></html>\n',
);

