import { readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { pathToFileURL } from 'node:url';

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const files = walk(new URL('../src', import.meta.url).pathname).filter((file) => extname(file) === '.js');
for (const file of files) {
  if (file.endsWith('/main.js')) continue;
  await import(pathToFileURL(file));
}
console.log(`Checked ${files.length} JavaScript modules.`);
