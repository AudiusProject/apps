#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../docs/developers/api/sidebar.ts');
const outputPath = path.join(__dirname, '../docs/developers/api/sidebar.generated.js');

if (!fs.existsSync(inputPath)) {
  console.error('Could not find', inputPath);
  process.exit(1);
}

let src = fs.readFileSync(inputPath, 'utf8');
// Remove TypeScript import lines
src = src.replace(/import[^\n]*\n/g, '');
src = src.replace(/const\s+sidebar\s*:\s*SidebarsConfig\s*=/, 'const sidebar =');
src = src.replace(/export default ([^;]+);?/, 'module.exports = $1;');
fs.writeFileSync(outputPath, src);
console.log('Wrote', outputPath);
