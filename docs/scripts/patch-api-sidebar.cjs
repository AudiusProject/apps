#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../docs/developers/api/sidebar.ts');
const outputPath = path.join(__dirname, '../docs/developers/api/sidebar.generated.js');

if (!fs.existsSync(inputPath)) {
  console.error('Could not find', inputPath);
  process.exit(1);
}

function toCapitalCase(str) {
  return str
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

let src = fs.readFileSync(inputPath, 'utf8');
// Capitalize sidebar category labels (e.g. "users" -> "Users", "developer_apps" -> "Developer Apps")
// Only transform tag-style labels (lowercase + underscores), not doc titles like "Get Bulk Users"
src = src.replace(/label:\s*"([^"]+)"/g, (_, label) => {
  if (/^[a-z0-9_]+$/.test(label)) {
    return `label: "${toCapitalCase(label)}"`;
  }
  return `label: "${label}"`;
});
// Remove TypeScript import lines
src = src.replace(/import[^\n]*\n/g, '');
src = src.replace(/const\s+sidebar\s*:\s*SidebarsConfig\s*=/, 'const sidebar =');
src = src.replace(/export default ([^;]+);?/, 'module.exports = $1;');
fs.writeFileSync(outputPath, src);
console.log('Wrote', outputPath);
