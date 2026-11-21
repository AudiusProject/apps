#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const {
  ROOT,
  extractComments
} = require('../../../scripts/comment-ratchet.cjs')

const [verdictsPath] = process.argv.slice(2)
if (!verdictsPath) {
  console.error('usage: apply.cjs <verdicts.jsonl>')
  process.exit(1)
}

const verdicts = fs
  .readFileSync(verdictsPath, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => JSON.parse(l))
  .filter((v) => ['tautology', 'stale', 'excuse', 'decision'].includes(v.cat))

const byFile = {}
for (const v of verdicts) (byFile[v.file] = byFile[v.file] || []).push(v)

const lineStartOf = (text, pos) => text.lastIndexOf('\n', pos - 1) + 1
const lineEndOf = (text, pos) => {
  const i = text.indexOf('\n', pos)
  return i === -1 ? text.length : i
}

const rangeFor = (text, { pos, end }) => {
  const before = text.slice(lineStartOf(text, pos), pos)
  const after = text.slice(end, lineEndOf(text, end))
  const jsxWrapped = /^\s*\{\s*$/.test(before) && /^\s*\}\s*$/.test(after)
  if ((/^\s*$/.test(before) && /^\s*$/.test(after)) || jsxWrapped) {
    return [
      lineStartOf(text, pos),
      Math.min(text.length, lineEndOf(text, end) + 1)
    ]
  }
  let s = pos
  while (s > 0 && /[ \t]/.test(text[s - 1])) s--
  return [s, end]
}

let removed = 0
let missing = 0
for (const [file, vs] of Object.entries(byFile)) {
  const full = path.join(ROOT, file)
  let text = fs.readFileSync(full, 'utf8')
  const present = extractComments(file, text)
  const targets = []
  for (const v of vs) {
    const match = present.find((c) => c.line === v.line && c.body === v.body)
    if (match) targets.push(match)
    else missing++
  }
  const ranges = targets
    .map((c) => rangeFor(text, c))
    .sort((a, b) => b[0] - a[0])
  for (const [s, e] of ranges) {
    text = text.slice(0, s) + text.slice(e)
    removed++
  }
  fs.writeFileSync(full, text)
}

console.log(
  `removed ${removed} comment(s) across ${Object.keys(byFile).length} file(s)`
)
if (missing) {
  console.error(
    `${missing} verdict(s) no longer matched a comment; re-run the inventory`
  )
  process.exitCode = 1
}
