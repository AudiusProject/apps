export const webglSupported = () => {
  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch (e) {
    return false
  }
}

export const webgl2Supported = () => {
  try {
    const canvas = document.createElement('canvas')
    return !!(window.WebGL2RenderingContext && canvas.getContext('webgl2'))
  } catch (e) {
    return false
  }
}
