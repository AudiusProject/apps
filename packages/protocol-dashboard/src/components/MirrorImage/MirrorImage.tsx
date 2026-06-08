import { useState, useEffect, useRef, ReactNode } from 'react'

const TIMEOUT_MS = 3000

type MirrorImageProps = {
  urls: string[]
  alt: string
  className?: string
  fallback?: ReactNode
  onLoad?: () => void
}

const MirrorImage = ({
  urls = [],
  alt = '',
  className,
  fallback = null,
  onLoad
}: MirrorImageProps) => {
  const [idx, setIdx] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const firstUrl = urls[0] ?? null
  useEffect(() => {
    setIdx(0)
  }, [firstUrl])

  useEffect(() => {
    if (!urls.length || idx >= urls.length) return
    timerRef.current = setTimeout(() => setIdx((i) => i + 1), TIMEOUT_MS)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [idx, urls.length])

  const handleLoad = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    onLoad?.()
  }

  const handleError = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setIdx((i) => i + 1)
  }

  if (!urls.length || idx >= urls.length) return <>{fallback}</>

  return (
    <img
      key={urls[idx]}
      src={urls[idx]}
      alt={alt}
      className={className}
      onLoad={handleLoad}
      onError={handleError}
    />
  )
}

export default MirrorImage
