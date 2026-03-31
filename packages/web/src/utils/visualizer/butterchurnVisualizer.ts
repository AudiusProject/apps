// Milkdrop (butterchurn): singleton canvas, lazy `import()` until bind/show.

import { loadPresets, getPresetKeys, getRandomPresetKey } from './presets'

const BLEND_TIME = 2.7 // seconds for smooth preset transitions
const AUTO_CYCLE_MS = 45000 // auto-advance interval
const PRESET_HISTORY_MAX = 10

type AudioPlayerLike = {
  source: MediaElementAudioSourceNode | null
  audioCtx: AudioContext | null
}

type PresetMap = Record<string, object>

type ButterchurnDefault = (typeof import('butterchurn'))['default']

let ButterchurnClass: ButterchurnDefault | null = null
let libLoadPromise: Promise<boolean> | null = null

function resolveButterchurnDefault(
  bcMod: typeof import('butterchurn')
): ButterchurnDefault | null {
  const mod = bcMod as { default?: ButterchurnDefault } & Partial<ButterchurnDefault>
  const ctor = mod.default ?? (mod as unknown as ButterchurnDefault)
  return typeof ctor?.createVisualizer === 'function' ? ctor : null
}

/** Singleflight load; resolves false if import fails or `isSupported` is false */
function loadButterchurnLib(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (libLoadPromise) return libLoadPromise
  libLoadPromise = (async () => {
    try {
      const [bcMod, { default: isSup }] = await Promise.all([
        import('butterchurn'),
        import('butterchurn/lib/isSupported.min')
      ])
      ButterchurnClass = resolveButterchurnDefault(bcMod)
      if (!ButterchurnClass) {
        return false
      }
      try {
        return Boolean(isSup())
      } catch {
        return false
      }
    } catch {
      return false
    }
  })()
  return libLoadPromise
}

let canvas: HTMLCanvasElement | null = null
let visualizer: any = null
let animFrameId: number | null = null
let autoCycleTimer: ReturnType<typeof setInterval> | null = null
let presets: PresetMap | null = null
let presetKeys: string[] = []
let currentPresetIndex = -1
let currentPresetName: string | null = null
let connectedAudioNode: AudioNode | null = null
/** Recreate the visualizer when this diverges from `audioPlayer.audioCtx` */
let boundAudioContext: AudioContext | null = null
let presetHistoryPast: string[] = []
let presetHistoryFuture: string[] = []
let onHistoryChange: (() => void) | null = null

function trimHistory(arr: string[]) {
  while (arr.length > PRESET_HISTORY_MAX) {
    arr.shift()
  }
}

function notifyHistory() {
  onHistoryChange?.()
}

function clearPresetHistory() {
  presetHistoryPast = []
  presetHistoryFuture = []
  notifyHistory()
}

function createCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.style.position = 'fixed'
  c.style.top = '0'
  c.style.left = '0'
  c.style.width = '100vw'
  c.style.height = '100vh'
  c.style.pointerEvents = 'none'
  c.style.display = 'none'
  return c
}

function handleResize() {
  if (!canvas || !visualizer) return
  const w = canvas.clientWidth || window.innerWidth
  const h = canvas.clientHeight || window.innerHeight
  const width = w * window.devicePixelRatio
  const height = h * window.devicePixelRatio
  if (!width || !height) return
  canvas.width = width
  canvas.height = height
  visualizer.setRendererSize(width, height)
}

function renderLoop() {
  if (visualizer) {
    visualizer.render()
  }
  animFrameId = requestAnimationFrame(renderLoop)
}

function loadPresetByIndex(index: number, blendTime: number) {
  if (!visualizer || !presets || presetKeys.length === 0) return
  const wrappedIndex =
    ((index % presetKeys.length) + presetKeys.length) % presetKeys.length
  currentPresetIndex = wrappedIndex
  currentPresetName = presetKeys[wrappedIndex]
  try {
    visualizer.loadPreset(presets[currentPresetName], blendTime)
  } catch {
    // Bad or incompatible preset data — skip without taking down the app
  }
}

async function initPresets() {
  if (!presets) {
    presets = await loadPresets()
    presetKeys = getPresetKeys(presets)
  }
}

function teardownVisualizerForNewAudioContext() {
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId)
    animFrameId = null
  }
  if (visualizer && connectedAudioNode) {
    try {
      visualizer.disconnectAudio(connectedAudioNode)
    } catch {
      // Stale node
    }
  }
  visualizer = null
  connectedAudioNode = null
  boundAudioContext = null
}

function createVisualizerWithAudioContext(audioCtx: AudioContext) {
  if (!canvas || !ButterchurnClass) return

  const w = canvas.clientWidth || window.innerWidth
  const h = canvas.clientHeight || window.innerHeight
  const width = Math.max(w * window.devicePixelRatio, 800)
  const height = Math.max(h * window.devicePixelRatio, 600)
  canvas.width = width
  canvas.height = height

  visualizer = ButterchurnClass.createVisualizer(audioCtx, canvas, {
    width,
    height,
    pixelRatio: window.devicePixelRatio || 1
  })
  boundAudioContext = audioCtx

  if (connectedAudioNode) {
    visualizer.connectAudio(connectedAudioNode)
  }

  if (canvas.style.display !== 'none' && animFrameId === null) {
    animFrameId = requestAnimationFrame(renderLoop)
  }

  initPresets()
    .then(() => {
      if (presets && presetKeys.length > 0 && visualizer) {
        const key = getRandomPresetKey(presets, currentPresetName)
        const idx = presetKeys.indexOf(key)
        loadPresetByIndex(idx >= 0 ? idx : 0, 0)
      }
    })
    .catch(() => {
      // Dynamic import / preset pack failed
    })
}

function applyShow() {
  if (!canvas) {
    canvas = createCanvas()
  }

  const visWrapper = document.querySelector('.visualizer')
  if (visWrapper && !visWrapper.contains(canvas)) {
    visWrapper.appendChild(canvas)
  }

  canvas.style.display = 'block'

  window.addEventListener('resize', handleResize)
  handleResize()

  if (visualizer && animFrameId === null) {
    animFrameId = requestAnimationFrame(renderLoop)
  }
}

function show() {
  void loadButterchurnLib().then((ok) => {
    if (!ok) return
    applyShow()
  })
}

function hide() {
  try {
    if (animFrameId !== null) {
      cancelAnimationFrame(animFrameId)
      animFrameId = null
    }
    stopAutoCycle()
    window.removeEventListener('resize', handleResize)
    clearPresetHistory()

    if (canvas) {
      canvas.style.display = 'none'
    }
  } catch {
    /* hide is best-effort */
  }
}

function bindAfterLibLoaded(audioPlayer: AudioPlayerLike) {
  if (!ButterchurnClass) return
  if (!audioPlayer.audioCtx) return

  const nextSource = audioPlayer.source
  if (!nextSource) return

  const ctx = audioPlayer.audioCtx

  if (boundAudioContext !== null && boundAudioContext !== ctx) {
    teardownVisualizerForNewAudioContext()
  }

  if (
    visualizer &&
    connectedAudioNode &&
    connectedAudioNode !== nextSource
  ) {
    try {
      visualizer.disconnectAudio(connectedAudioNode)
    } catch {
      // Stale node after track change / browser quirks
    }
  }

  connectedAudioNode = nextSource

  if (!canvas) {
    canvas = createCanvas()
  }

  if (!visualizer) {
    createVisualizerWithAudioContext(ctx)
    return
  }

  visualizer.connectAudio(connectedAudioNode)
}

function bind(audioPlayer: AudioPlayerLike) {
  void loadButterchurnLib().then((ok) => {
    if (!ok) return
    bindAfterLibLoaded(audioPlayer)
  })
}

function stop() {
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId)
    animFrameId = null
  }
  stopAutoCycle()
}

function pushCurrentOntoPastAndClearFuture() {
  if (currentPresetName) {
    presetHistoryPast.push(currentPresetName)
    trimHistory(presetHistoryPast)
  }
  presetHistoryFuture = []
}

function randomPreset() {
  if (!visualizer || !presets || presetKeys.length === 0) return
  pushCurrentOntoPastAndClearFuture()
  const key = getRandomPresetKey(presets, currentPresetName)
  const idx = presetKeys.indexOf(key)
  loadPresetByIndex(idx >= 0 ? idx : 0, BLEND_TIME)
  notifyHistory()
}

function historyBack() {
  if (!visualizer || presetHistoryPast.length === 0) return
  const key = presetHistoryPast.pop()!
  if (currentPresetName) {
    presetHistoryFuture.push(currentPresetName)
    trimHistory(presetHistoryFuture)
  }
  const idx = presetKeys.indexOf(key)
  if (idx >= 0) loadPresetByIndex(idx, BLEND_TIME)
  notifyHistory()
}

function historyForward() {
  if (!visualizer || presetHistoryFuture.length === 0) return
  const key = presetHistoryFuture.pop()!
  if (currentPresetName) {
    presetHistoryPast.push(currentPresetName)
    trimHistory(presetHistoryPast)
  }
  const idx = presetKeys.indexOf(key)
  if (idx >= 0) loadPresetByIndex(idx, BLEND_TIME)
  notifyHistory()
}

function historyForwardOrNext() {
  if (presetHistoryFuture.length > 0) {
    historyForward()
  } else {
    randomPreset()
  }
}

function canHistoryBack() {
  return presetHistoryPast.length > 0
}

function startAutoCycle() {
  stopAutoCycle()
  autoCycleTimer = setInterval(() => {
    randomPreset()
  }, AUTO_CYCLE_MS)
}

function stopAutoCycle() {
  if (autoCycleTimer !== null) {
    clearInterval(autoCycleTimer)
    autoCycleTimer = null
  }
}

function setOnHistoryChange(cb: (() => void) | null) {
  onHistoryChange = cb
}

const ButterchurnVisualizer =
  typeof window === 'undefined'
    ? null
    : {
        show,
        hide,
        bind,
        stop,
        randomPreset,
        historyBack,
        historyForwardOrNext,
        canHistoryBack,
        startAutoCycle,
        stopAutoCycle,
        setOnHistoryChange
      }

export default ButterchurnVisualizer
