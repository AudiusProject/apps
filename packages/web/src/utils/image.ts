export const preload = (url: string, timeoutMs: number = 5000) => {
  return new Promise<void>((resolve, reject) => {
    const img = new Image()
    img.src = url

    const timer = setTimeout(() => {
      img.src = '' // stop loading if still in progress
      reject(new Error(`Failed to load (timeout) ${url}`))
    }, timeoutMs)

    img.onload = () => {
      clearTimeout(timer)
      resolve()
    }

    img.onerror = () => {
      clearTimeout(timer)
      reject(new Error(`Failed to load ${url}`))
    }
  })
}
