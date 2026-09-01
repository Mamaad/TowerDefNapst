import { readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

const roots = [resolve('src'), resolve('scripts'), resolve('tests')];
const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (path.endsWith('.js') || path.endsWith('.mjs')) files.push(path);
  }
}
for (const root of roots) walk(root);
for (const file of files) execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
console.log(`Syntax checked ${files.length} JavaScript modules`);
