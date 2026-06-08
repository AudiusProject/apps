// Presets: dynamic `import('butterchurn-presets')` (main export only).

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

  const mainMod = await import('butterchurn-presets')
  cachedPresets = mergePresetModule(mainMod as Record<string, unknown>)
  return cachedPresets
}

export function getPresetKeys(presets: PresetMap): string[] {
  const allKeys = Object.keys(presets)
  const curatedMatches = CURATED_PRESET_NAMES.filter((name) =>
    allKeys.includes(name)
  )
  const curatedSet = new Set(curatedMatches)
  const remainder = allKeys.filter((k) => !curatedSet.has(k))
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
