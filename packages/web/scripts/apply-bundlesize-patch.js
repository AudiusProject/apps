#!/usr/bin/env node

/**
 * Applies a patch to bundlesize to fix compatibility with chalk v4+
 * This script fixes the issue where chalk.default is required instead of chalk directly
 */

const fs = require('fs');
const path = require('path');

const colorsPath = path.join(__dirname, '../node_modules/bundlesize/src/utils/colors.js');

if (fs.existsSync(colorsPath)) {
  let content = fs.readFileSync(colorsPath, 'utf8');
  
  // Check if patch is already applied
  if (!content.includes('chalkInstance')) {
    content = `const chalk = require('chalk')
const chalkInstance = chalk.default || chalk

module.exports = {
  subtle: chalkInstance.gray,
  pass: chalkInstance.green,
  fail: chalkInstance.red,
  title: chalkInstance.bold,
  info: chalkInstance.magenta
}
`;
    fs.writeFileSync(colorsPath, content, 'utf8');
    console.log('✓ Applied bundlesize patch for chalk v4+ compatibility');
  }
} else {
  console.warn('⚠ bundlesize colors.js not found, skipping patch');
}
