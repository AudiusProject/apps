import { readFileSync } from 'node:fs'

// postcss extracts this file; harmony.css is emitted as the Avenir font faces + this.
export const NO_FONTS_CSS = 'harmony-no-fonts.css'

const avenirCss = readFileSync(
  new URL('./src/foundations/typography/avenir.css', import.meta.url),
  'utf8'
)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .trim()

// Emits harmony.css (with base64 Avenir) next to harmony-no-fonts.css so apps
// that host the font files themselves can skip the inlined font data.
export const harmonyCssWithFonts = () => ({
  name: 'harmony-css-with-fonts',
  generateBundle(_options, bundle) {
    const asset = bundle[NO_FONTS_CSS]
    if (!asset || asset.type !== 'asset') {
      this.warn(`${NO_FONTS_CSS} was not emitted, skipping harmony.css`)
      return
    }
    this.emitFile({
      type: 'asset',
      fileName: 'harmony.css',
      source: `${avenirCss}\n${asset.source}`
    })
  }
})
