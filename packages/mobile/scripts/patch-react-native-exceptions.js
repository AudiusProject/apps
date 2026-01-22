#!/usr/bin/env node
/**
 * Applies a fix to React Native's ExceptionsManager to avoid "Error.stack getter
 * called with an invalid receiver" on Hermes when .stack is accessed on
 * non-Error values (e.g. legacy custom errors, thrown strings).
 * @see https://github.com/facebook/react-native/issues/43636
 * @see https://github.com/facebook/hermes/issues/1496
 *
 * Run after npm install to re-apply (node_modules can be overwritten on install).
 */

const fs = require('fs')
const path = require('path')

const target = path.join(
  __dirname,
  '../node_modules/react-native/Libraries/Core/ExceptionsManager.js'
)

if (!fs.existsSync(target)) {
  process.exit(0)
}

let content = fs.readFileSync(target, 'utf8')

if (content.includes('getErrorStackSafe')) {
  process.exit(0)
}

const helper = `/**
 * Safely reads the .stack property from an error-like value.
 * Hermes can throw "Error.stack getter called with an invalid receiver" when
 * .stack is accessed on objects that inherit from Error using legacy patterns
 * (e.g. MyError.prototype = new Error) or other non-Error values. This helper
 * prevents that from crashing the app.
 * @see https://github.com/facebook/react-native/issues/43636
 * @see https://github.com/facebook/hermes/issues/1496
 */
function getErrorStackSafe(e: mixed): string | void {
  if (e == null) return undefined;
  try {
    return typeof e.stack === 'string' ? e.stack : undefined;
  } catch {
    return undefined;
  }
}

`

content = content.replace(
  'function preprocessException(data: ExceptionData): ExceptionData {',
  helper + 'function preprocessException(data: ExceptionData): ExceptionData {'
)
content = content.replace(
  'const stack = parseErrorStack(e?.stack);',
  'const stack = parseErrorStack(getErrorStackSafe(e));'
)
content = content.replace(
  'rawStack: e.stack,',
  'rawStack: getErrorStackSafe(e),'
)
content = content.replace(
  'if (firstArg?.stack) {',
  'if (getErrorStackSafe(firstArg)) {'
)

fs.writeFileSync(target, content)
