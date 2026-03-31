// Lazy-loaded Milkdrop preset management for butterchurn.
// The default `butterchurn-presets` entry only ships ~100 presets; additional
// packs are merged so next/prev/random have hundreds of real presets to cycle.
//
// Curated names are only used to *order* favorites first when they exist in the
// merged map — we never restrict cycling to curated-only (that caused a single-
// preset bug when almost no curated strings matched the default pack).

type PresetMap = Record<string, object>

let cachedPresets: PresetMap | null = null

/** Favorites shown first in the cycle list when those keys exist in the pack. */
const CURATED_PRESET_NAMES = [
  'Flexi - mindblob [shiny mix]',
  'martin - liquid crystal spiral',
  'Geiss - Cosmic Dust 2 - Resonant Freq',
  'Rovastar - Fractopia (Blueprint of a Snowflake)',
  'Zylot - Color Twist / Colour Organ',
  'Aderrasi - Airhandler (Sunset Remix)',
  'Geiss - Swirl 1',
  'Flexi - smouldering',
  'martin - neon worms',
  'Geiss - Cruzin'
]

function mergePresetModule(m: Record<string, unknown>): PresetMap {
  const raw =
    typeof m.getPresets === 'function'
      ? (m.getPresets as () => PresetMap)()
      : (m as { default?: { getPresets?: () => PresetMap } }).default
          ?.getPresets?.() ??
        (m as { default?: PresetMap }).default ??
        m
  return raw as PresetMap
}

export async function loadPresets(): Promise<PresetMap> {
  if (cachedPresets) return cachedPresets

  const [
    mainMod,
    extraMod,
    extra2Mod,
    md1Mod
  ] = await Promise.all([
    import('butterchurn-presets'),
    import('butterchurn-presets/lib/butterchurnPresetsExtra.min.js'),
    import('butterchurn-presets/lib/butterchurnPresetsExtra2.min.js'),
    import('butterchurn-presets/lib/butterchurnPresetsMD1.min.js')
  ])

  cachedPresets = {
    ...mergePresetModule(mainMod as Record<string, unknown>),
    ...mergePresetModule(extraMod as Record<string, unknown>),
    ...mergePresetModule(extra2Mod as Record<string, unknown>),
    ...mergePresetModule(md1Mod as Record<string, unknown>)
  }

  return cachedPresets
}

export function getPresetKeys(presets: PresetMap): string[] {
  const allKeys = Object.keys(presets)
  const curatedMatches = CURATED_PRESET_NAMES.filter((name) =>
    allKeys.includes(name)
  )
  const curatedSet = new Set(curatedMatches)
  const remainder = allKeys.filter((k) => !curatedSet.has(k))
  // Curated first (nicer defaults at the start of the list), then full library
  return [...curatedMatches, ...remainder]
}

export function getRandomPresetKey(
  presets: PresetMap,
  currentKey?: string | null
): string {
  const keys = getPresetKeys(presets)
  if (keys.length <= 1) return keys[0] ?? ''
  let next: string
  do {
    next = keys[Math.floor(Math.random() * keys.length)]
  } while (next === currentKey)
  return next
}
