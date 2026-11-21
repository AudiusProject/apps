import { useEffect, useState } from 'react'

import cn from 'classnames'

import { preload } from 'utils/image'

import styles from './PreloadImage.module.css'

const PreloadImage = ({
  src,
  alt = '',
  asBackground = false,
  preloaded = false,
  className,
  height,
  width
}: {
  src: string
  alt?: string
  asBackground?: boolean
  preloaded?: boolean
  className?: string
  height?: string
  width?: string
}) => {
  const [isLoaded, setIsLoaded] = useState(preloaded)
  useEffect(() => {
    if (!preloaded) {
      const load = async () => {
        await preload(src)
        setIsLoaded(true)
      }
      load()
    }
  }, [preloaded, setIsLoaded, src])
  return asBackground ? (
    <div
      className={cn(styles.img, className, { [styles.isLoaded]: isLoaded })}
      style={{ backgroundImage: `url(${src})`, height, width }}
    />
  ) : (
    <img
      src={src}
      className={cn(styles.img, className, { [styles.isLoaded]: isLoaded })}
      alt={alt}
      height={height}
      width={width}
    />
  )
}

export default PreloadImage
