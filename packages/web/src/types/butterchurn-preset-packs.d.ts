declare module 'butterchurn' {
  /** UMD / Vite: `import('butterchurn')` resolves to `{ default: Butterchurn }` */
  export default class Butterchurn {
    static createVisualizer(
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
}

declare module 'butterchurn/lib/isSupported.min' {
  export default function isSupported(): boolean
}

declare module 'butterchurn-presets' {
  export function getPresets(): Record<string, object>
}
