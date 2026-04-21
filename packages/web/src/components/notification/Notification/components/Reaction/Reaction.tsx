import {
  MouseEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'

import cn from 'classnames'
import Lottie, { LottieOptions, LottieRefCurrentProps } from 'lottie-react'

import styles from './Reaction.module.css'

export type ReactionProps = {
  className?: string
  animationData: Promise<{ default: LottieOptions['animationData'] }>
  isActive?: boolean
  isDisabled?: boolean
  isResponsive?: boolean
  playOnHoverOnly?: boolean
  onClick?: MouseEventHandler
  width?: number
  height?: number
  title?: string
  disableClickAnimation?: boolean
}

export const Reaction = (props: ReactionProps) => {
  const {
    className,
    animationData,
    isActive,
    isDisabled = false,
    isResponsive,
    playOnHoverOnly = false,
    onClick,
    width = 86,
    height = 86,
    title,
    disableClickAnimation = false
  } = props
  const onlyPlayOnHover = playOnHoverOnly || isDisabled
  const [isInteracting, setInteracting] = useState(false)
  const [isClicked, setIsClicked] = useState(false)
  const [animation, setAnimation] = useState<LottieOptions['animationData']>()

  useEffect(() => {
    const loadAnimation = async () => {
      const { default: animation } = await animationData
      setAnimation(animation)
    }
    loadAnimation()
  }, [animationData])

  const handleClick: MouseEventHandler = useCallback(
    (event) => {
      if (!isClicked) {
        onClick?.(event)
      }
      setIsClicked(true)
    },
    [onClick, isClicked]
  )

  const handleMouseEnter = useCallback(() => {
    setInteracting(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setInteracting(false)
  }, [])

  useEffect(() => {
    if (isClicked) {
      const timeout = setTimeout(() => {
        setIsClicked(false)
      }, 5000)

      return () => clearTimeout(timeout)
    }
  }, [isClicked])

  const lottieRef = useRef<LottieRefCurrentProps>(null)
  useEffect(() => {
    if (!lottieRef.current) return
    const shouldPlay = isInteracting || (!onlyPlayOnHover && isActive !== false)
    if (shouldPlay) {
      lottieRef.current.play()
    } else {
      lottieRef.current.stop()
    }
  }, [lottieRef, isActive, isInteracting, onlyPlayOnHover])

  return (
    <div
      className={cn(styles.root, className, {
        [styles.active]: isActive === true,
        [styles.inactive]: isActive === false,
        [styles.disabled]: isDisabled,
        [styles.responsive]: isResponsive,
        [styles.clicked]: !disableClickAnimation && isClicked
      })}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Lottie
        style={{ height, width }}
        lottieRef={lottieRef}
        title={title}
        autoplay={!onlyPlayOnHover}
        loop
        animationData={animation}
      />
    </div>
  )
}
