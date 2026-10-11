#!/usr/bin/env node
// Regenerate contributes.themes in package.json from the files in themes/.
//
// Usage: node scripts/sync-manifest.mjs [themesDir]

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const themesDir = process.argv[2] || 'themes';
const pkgPath = 'package.json';

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

const entries = [];
for (const file of readdirSync(themesDir).filter((f) => f.endsWith('.json')).sort()) {
  const theme = JSON.parse(readFileSync(join(themesDir, file), 'utf8'));
  entries.push({
    label: theme.name,
    uiTheme: theme.type === 'light' ? 'vs' : 'vs-dark',
    path: `./themes/${file}`,
  });
}

pkg.contributes = pkg.contributes || {};
pkg.contributes.themes = entries;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

console.log(`Synced ${entries.length} theme(s) into ${pkgPath}`);
for (const e of entries) console.log(`  ${e.label}  (${e.uiTheme})  ${e.path}`);
