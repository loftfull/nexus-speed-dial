import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const violations = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const file = join(dir, name);
    if (statSync(file).isDirectory()) walk(file);
    else if (/\.(tsx|css)$/.test(name) && !/\.test\./.test(name)) {
      const text = readFileSync(file, 'utf8');
      if (text.includes('calendar-column')) violations.push(`${file}: permanent calendar column marker`);
      if (/perspective\s*:|rotateX\(|rotateY\(/.test(text) && /visual-overrides\.css$/.test(file)) violations.push(`${file}: prohibited fantasy 3D effect`);
    }
  }
}
walk('src');
if (violations.length) { console.error(violations.join('\n')); process.exit(1); }
console.log('Reference guard passed: no permanent calendar column or prohibited production effects found.');
