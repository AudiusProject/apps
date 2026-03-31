// Butterchurn (Milkdrop) visualizer engine singleton.
// Drop-in replacement for the old visualizer-1.js with the same public API shape.
//
// butterchurn.createVisualizer(audioContext, canvas, opts) — audioContext must be
// a Web Audio AudioContext, NOT a WebGL context. The visualizer is therefore created
// lazily inside bind() once we have the AudioContext from the audio player.

import butterchurn from 'butterchurn'
// @ts-expect-error - butterchurn/lib/isSupported.min has no types
import isSupported from 'butterchurn/lib/isSupported.min'

import { loadPresets, getPresetKeys, getRandomPresetKey } from './presets'

const BLEND_TIME = 2.7 // seconds for smooth preset transitions
const AUTO_CYCLE_MS = 45000 // auto-advance interval
const PRESET_HISTORY_MAX = 10

type AudioPlayerLike = {
  source: AudioNode | null
  audioCtx: AudioContext | null
}

type PresetMap = Record<string, object>

let canvas: HTMLCanvasElement | null = null
let visualizer: any = null
let animFrameId: number | null = null
let autoCycleTimer: ReturnType<typeof setInterval> | null = null
let presets: PresetMap | null = null
let presetKeys: string[] = []
let currentPresetIndex = -1
let currentPresetName: string | null = null
let connectedAudioNode: AudioNode | null = null
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
  // position:fixed ensures the canvas covers the full viewport regardless of
  // where it lives in the DOM tree (avoids being clipped by positioned ancestors).
  c.style.position = 'fixed'
  c.style.top = '0'
  c.style.left = '0'
  c.style.width = '100vw'
  c.style.height = '100vh'
  // Must not capture pointer events — otherwise overlay onMouseMove never runs and
  // chrome (close, controls) tied to mouse activity stay hidden.
  c.style.pointerEvents = 'none'
  c.style.display = 'none'
  return c
}

function handleResize() {
  if (!canvas || !visualizer) return
  // clientWidth/Height may be 0 if canvas isn't in the DOM yet; fall back to window.
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

// --- Public API ---

function createVisualizerWithAudioContext(audioCtx: AudioContext) {
  if (!canvas) return

  // Canvas may not be in the DOM yet when bind() fires before show(); use window as fallback.
  const w = canvas.clientWidth || window.innerWidth
  const h = canvas.clientHeight || window.innerHeight
  const width = Math.max(w * window.devicePixelRatio, 800)
  const height = Math.max(h * window.devicePixelRatio, 600)
  canvas.width = width
  canvas.height = height

  visualizer = butterchurn.createVisualizer(audioCtx, canvas, {
    width,
    height,
    pixelRatio: window.devicePixelRatio || 1
  })

  if (connectedAudioNode) {
    visualizer.connectAudio(connectedAudioNode)
  }

  // Start the render loop now that butterchurn exists
  if (canvas.style.display !== 'none' && animFrameId === null) {
    animFrameId = requestAnimationFrame(renderLoop)
  }

  initPresets().then(() => {
    if (presets && presetKeys.length > 0 && visualizer) {
      const key = getRandomPresetKey(presets, currentPresetName)
      const idx = presetKeys.indexOf(key)
      loadPresetByIndex(idx >= 0 ? idx : 0, 0)
    }
  })
}

function show() {
  if (!isSupported()) return

  if (!canvas) {
    canvas = createCanvas()
  }

  // Re-attach if the React component remounted and the wrapper is a new node
  const visWrapper = document.querySelector('.visualizer')
  if (visWrapper && !visWrapper.contains(canvas)) {
    visWrapper.appendChild(canvas)
  }

  // Un-hide without removing from DOM (removing causes WebGL context loss)
  canvas.style.display = 'block'

  window.addEventListener('resize', handleResize)
  handleResize()

  // Only start the render loop once butterchurn is ready
  if (visualizer && animFrameId === null) {
    animFrameId = requestAnimationFrame(renderLoop)
  }
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

    // Hide via CSS — never remove from DOM to avoid WebGL context loss
    if (canvas) {
      canvas.style.display = 'none'
    }
  } catch {
    // Defensive: closing must never crash the shell
  }
}

function bind(audioPlayer: AudioPlayerLike) {
  connectedAudioNode = audioPlayer.source

  if (!audioPlayer.audioCtx) return

  // Create canvas early if show() hasn't run yet. React fires this effect before
  // the isVisible effect (component definition order), so canvas may be null here.
  if (!canvas) {
    canvas = createCanvas()
  }

  if (!visualizer) {
    createVisualizerWithAudioContext(audioPlayer.audioCtx)
    return
  }

  if (connectedAudioNode) {
    visualizer.connectAudio(connectedAudioNode)
  }
}

function stop() {
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId)
    animFrameId = null
  }
  stopAutoCycle()
}

// No-op: Milkdrop presets have their own color systems
function setDominantColors(_colors?: any) {}

function pushCurrentOntoPastAndClearFuture() {
  if (currentPresetName) {
    presetHistoryPast.push(currentPresetName)
    trimHistory(presetHistoryPast)
  }
  presetHistoryFuture = []
}

/** New random preset; current moves into back history (for Back / auto-advance). */
function randomPreset() {
  if (!presets || presetKeys.length === 0) return
  pushCurrentOntoPastAndClearFuture()
  const key = getRandomPresetKey(presets, currentPresetName)
  const idx = presetKeys.indexOf(key)
  loadPresetByIndex(idx >= 0 ? idx : 0, BLEND_TIME)
  notifyHistory()
}

function historyBack() {
  if (presetHistoryPast.length === 0) return
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
  if (presetHistoryFuture.length === 0) return
  const key = presetHistoryFuture.pop()!
  if (currentPresetName) {
    presetHistoryPast.push(currentPresetName)
    trimHistory(presetHistoryPast)
  }
  const idx = presetKeys.indexOf(key)
  if (idx >= 0) loadPresetByIndex(idx, BLEND_TIME)
  notifyHistory()
}

/** Redo along forward stack, or at the tip pick a new random preset (like browser forward). */
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

const ButterchurnVisualizer = isSupported()
  ? {
      show,
      hide,
      bind,
      stop,
      setDominantColors,
      randomPreset,
      historyBack,
      historyForwardOrNext,
      canHistoryBack,
      startAutoCycle,
      stopAutoCycle,
      setOnHistoryChange
    }
  : null

export default ButterchurnVisualizer
