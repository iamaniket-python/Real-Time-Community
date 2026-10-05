import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src');
const re =
  /(?:import|export)\s[^'"]*?from\s+['"](\.[^'"]+)['"]|import\(\s*['"](\.[^'"]+)['"]\s*\)|import\s+['"](\.[^'"]+)['"]/g;

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return e.name.endsWith('.js') ? [p] : [];
  });

let missing = 0;
for (const file of walk(root)) {
  const src = fs.readFileSync(file, 'utf8');
  for (const m of src.matchAll(re)) {
    const spec = m[1] || m[2] || m[3];
    const target = path.resolve(path.dirname(file), spec);
    if (!fs.existsSync(target)) {
      missing++;
      console.log('MISSING', path.relative(root, target), '<- imported by', path.relative(root, file));
    }
  }
}
console.log(missing ? `${missing} missing import(s)` : 'all relative imports resolve');