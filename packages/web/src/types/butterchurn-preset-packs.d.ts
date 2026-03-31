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
    disconnectAudio: (node: AudioNode) => void
  }
}

declare module 'butterchurn-presets' {
  export function getPresets(): Record<string, object>
}
