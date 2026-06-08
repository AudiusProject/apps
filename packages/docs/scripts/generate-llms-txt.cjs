/**
 * Generates LLM-friendly markdown versions of all docs pages.
 *
 * Outputs into docs/public/:
 *   - llms.txt         — index linking to each page's .md file
 *   - llms-full.txt    — all docs concatenated
 *   - docs/<path>.md   — individual clean markdown files
 */

const fs = require('fs')
const path = require('path')

const PAGES_DIR = path.resolve(__dirname, '../docs/pages')
const PUBLIC_DIR = path.resolve(__dirname, '../docs/public')
const SITE_URL = 'https://docs.audius.co'

// Collect all .mdx files
function collectMdxFiles(dir, base = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  let files = []
  for (const entry of entries) {
    const rel = path.join(base, entry.name)
    if (entry.isDirectory()) {
      files = files.concat(collectMdxFiles(path.join(dir, entry.name), rel))
    } else if (entry.name.endsWith('.mdx')) {
      files.push(rel)
    }
  }
  return files
}

// Strip MDX/JSX to clean markdown
function mdxToMarkdown(content) {
  let lines = content.split('\n')

  // Remove frontmatter
  if (lines[0] && lines[0].trim() === '---') {
    const endIdx = lines.indexOf('---', 1)
    if (endIdx > 0) {
      // Extract title from frontmatter for later use
      lines = lines.slice(endIdx + 1)
    }
  }

  let result = lines
    .join('\n')
    // Remove import statements
    .replace(/^import\s+.*$/gm, '')
    // Remove export statements (but keep content after export default)
    .replace(/^export\s+.*$/gm, '')
    // Remove self-closing JSX tags like <CopyBox />
    .replace(/<[A-Z]\w*\s*\/>/g, '')
    // Remove JSX wrapper divs (opening and closing) — preserve content inside
    .replace(/<div[^>]*>/g, '')
    .replace(/<\/div>/g, '')
    // Remove <img> tags but note them as markdown images where possible
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/g, '![$2]($1)')
    .replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/g, '![$1]($2)')
    // Convert Vocs admonitions (:::info, :::note, :::warning, etc.) to bold callouts
    .replace(/^:::(info|note|warning|tip|danger|caution)(\[([^\]]*)\])?\s*$/gm, (_, type, _bracket, title) => {
      const label = title || type.charAt(0).toUpperCase() + type.slice(1)
      return `> **${label}**`
    })
    .replace(/^:::$/gm, '')
    // Convert remaining content inside admonition blocks: indent with >
    // (This is a best-effort heuristic — lines between ::: markers get > prefix)
    // Clean up excessive blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return result
}

// Convert file path to URL route
function fileToRoute(file) {
  let route = file
    .replace(/\.mdx$/, '')
    .replace(/\\/g, '/')
  // index files map to directory root
  if (route.endsWith('/index')) {
    route = route.slice(0, -'/index'.length) || ''
  }
  return '/' + route
}

// Extract title from frontmatter or first heading
function extractTitle(content) {
  // Try frontmatter title
  const fmMatch = content.match(/^---\n[\s\S]*?title:\s*(.+)\n[\s\S]*?---/)
  if (fmMatch) return fmMatch[1].trim().replace(/^['"]|['"]$/g, '')

  // Try first markdown heading
  const headingMatch = content.match(/^#\s+(.+)$/m)
  if (headingMatch) return headingMatch[1].trim()

  return 'Untitled'
}

// Extract description from frontmatter
function extractDescription(content) {
  const fmMatch = content.match(/^---\n[\s\S]*?description:\s*(.+)\n[\s\S]*?---/)
  if (fmMatch) {
    const desc = fmMatch[1].trim().replace(/^['"]|['"]$/g, '')
    // Skip generic descriptions
    if (desc !== 'Open Audio Protocol Documentation') return desc
  }
  return null
}

function main() {
  const mdxFiles = collectMdxFiles(PAGES_DIR).sort()

  const llmsEntries = []
  const fullParts = []

  // Header for llms-full.txt
  fullParts.push(
    '# Audius Developer Documentation\n\n' +
    '> Audius is a fully decentralized music platform. Build on the largest open music catalog on the internet.\n\n' +
    `> Source: ${SITE_URL}\n\n` +
    '---\n'
  )

  for (const file of mdxFiles) {
    const absPath = path.join(PAGES_DIR, file)
    const raw = fs.readFileSync(absPath, 'utf-8')
    const title = extractTitle(raw)
    const description = extractDescription(raw)
    const route = fileToRoute(file)
    const markdown = mdxToMarkdown(raw)

    // Write individual .md file
    const mdRelPath = route === '/' ? 'index.md' : route.slice(1) + '.md'
    const mdOutPath = path.join(PUBLIC_DIR, 'docs', mdRelPath)
    fs.mkdirSync(path.dirname(mdOutPath), { recursive: true })
    fs.writeFileSync(mdOutPath, markdown + '\n')

    // llms.txt entry
    const mdUrl = `${SITE_URL}/docs/${mdRelPath}`
    const descLine = description ? `: ${description}` : ''
    llmsEntries.push(`- [${title}](${mdUrl})${descLine}`)

    // llms-full.txt section
    fullParts.push(`\n## ${title}\n\nSource: ${SITE_URL}${route}\n\n${markdown}\n\n---\n`)
  }

  // Write llms.txt
  const llmsTxt = [
    '# Audius Developer Docs',
    '',
    '> Audius is a fully decentralized music platform. Build on the largest open music catalog on the internet.',
    '',
    '## Documentation Pages',
    '',
    ...llmsEntries,
    '',
    `## Full Documentation`,
    '',
    `For the complete documentation in a single file, see [llms-full.txt](${SITE_URL}/llms-full.txt)`,
    '',
  ].join('\n')

  fs.writeFileSync(path.join(PUBLIC_DIR, 'llms.txt'), llmsTxt)
  fs.writeFileSync(path.join(PUBLIC_DIR, 'llms-full.txt'), fullParts.join(''))

  console.log(`Generated llms.txt with ${mdxFiles.length} pages`)
  console.log(`Generated llms-full.txt`)
  console.log(`Generated ${mdxFiles.length} individual .md files in docs/public/docs/`)
}

main()
