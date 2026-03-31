declare module 'butterchurn' {
  export function createVisualizer(
    audioContext: AudioContext,
    canvas: HTMLCanvasElement,
    opts: { width: number; height: number; pixelRatio: number }
  ): {
    render: () => void
    setRendererSize: (w: number, h: number) => void
    loadPreset: (preset: object, blendTime: number) => void
    connectAudio: (node: AudioNode) => void
  }
}

/** butterchurn-presets entry + extra CJS packs (no upstream typings). */
declare module 'butterchurn-presets' {
  export function getPresets(): Record<string, object>
}

declare module 'butterchurn-presets/lib/butterchurnPresetsExtra.min.js' {
  export function getPresets(): Record<string, object>
}

declare module 'butterchurn-presets/lib/butterchurnPresetsExtra2.min.js' {
  export function getPresets(): Record<string, object>
}

declare module 'butterchurn-presets/lib/butterchurnPresetsMD1.min.js' {
  export function getPresets(): Record<string, object>
}
