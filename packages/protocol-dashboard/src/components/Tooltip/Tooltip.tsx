import React, {
  PropsWithChildren,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from 'react'

import { Box, Text } from '@audius/harmony'
import clsx from 'clsx'
import ReactDOM from 'react-dom'

import styles from './Tooltip.module.css'

export enum Position {
  TOP = 'top',
  BOTTOM = 'bottom',
  LEFT = 'left',
  RIGHT = 'right'
}

const DescriptiveTooltipText: React.FC<{
  title?: string
  text: string
  ctaHref?: string
  ctaText?: string
  className: string
  style?: object
  onDimensionsKnown?: (height: number) => void
}> = ({
  title,
  text,
  ctaHref,
  ctaText,
  style,
  className,
  onDimensionsKnown
}) => {
  const targetRef = useRef<HTMLDivElement | null>(null)
  useLayoutEffect(() => {
    if (targetRef.current) {
      onDimensionsKnown(targetRef.current.clientHeight)
    }
  }, [onDimensionsKnown])
  return (
    <div className={clsx(className, styles.tooltipContent)} style={style}>
      <div className={styles.tooltipContainer}>
        <div className={styles.tooltipContainerReal}>
          <Box w={250}>
            <div className={styles.tooltipText} ref={targetRef}>
              {title == null ? null : (
                <Box mb='m'>
                  <Text variant='title' size='m' color='inverse'>
                    {title}
                  </Text>
                </Box>
              )}
              <Text variant='body' size='s' color='inverse'>
                {text}
              </Text>
              <Box mt='s'>
                {ctaText == null ? null : (
                  <a
                    href={ctaHref}
                    target='_blank'
                    rel='noreferrer'
                    css={{
                      all: 'unset',
                      fontWeight: 500,
                      color: 'white',
                      textDecoration: 'underline',
                      cursor: 'pointer',
                      fontSize: 14
                    }}
                  >
                    {ctaText}
                  </a>
                )}
              </Box>
              <div className={styles.descriptiveArrow} />
            </div>
          </Box>
        </div>
      </div>
    </div>
  )
}

const BasicTooltipText: React.FC<{
  text: string
  className: string
  style?: object
}> = ({ text, style, className }) => (
  <div className={clsx(className, styles.tooltipContent)} style={style}>
    <div className={styles.tooltipContainer}>
      <div className={styles.tooltipContainerReal}>
        <div className={styles.basicTooltipText}>
          {text}
          <div className={styles.arrow} />
        </div>
      </div>
    </div>
  </div>
)

type TooltipProps = PropsWithChildren<{
  className?: string
  text?: string
  body?: string
  title?: string
  ctaText?: string
  ctaHref?: string
  onClick?: (e: React.MouseEvent) => void
  isDisabled?: boolean
  position?: Position
  isBasic?: boolean
}>

function offset(el: any) {
  const rect = el.getBoundingClientRect()
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop
  return {
    top: rect.top + scrollTop,
    height: rect.height,
    left: rect.left + rect.width / 2 + scrollLeft
  }
}

const BaseTooltip: React.FC<TooltipProps> = ({
  className,
  children,
  title,
  body,
  ctaHref,
  ctaText,
  text,
  onClick = () => {},
  isDisabled = false,
  position = Position.TOP,
  isBasic = false
}) => {
  const containerRef = useRef(null)
  const [height, setHeight] = useState(0)

  const [tooltipPosition, setPosition] = useState({
    left: 0,
    top: 0,
    height: 0
  })
  const rootDomNode = document.getElementById('root') as any
  const [isHover, setHover] = useState(false)

  const getPosition = () => {
    return offset(containerRef.current)
  }

  const TooltipTextComponent = isBasic
    ? BasicTooltipText
    : DescriptiveTooltipText
  const tooltip = (
    <TooltipTextComponent
      text={body ?? text}
      // @ts-ignore
      title={title}
      ctaHref={ctaHref}
      ctaText={ctaText}
      onDimensionsKnown={setHeight}
      className={clsx({
        [styles.tooltipLeft]: position === Position.LEFT,
        [styles.tooltipRight]: position === Position.RIGHT,
        [styles.tooltipTop]: position === Position.TOP,
        [styles.tooltipBottom]: position === Position.BOTTOM
      })}
      style={{
        top: `${tooltipPosition.top - (isBasic ? 16 : height / 2 - 25)}px`,
        left: `${tooltipPosition.left - (isBasic ? 0 : 12)}px`
      }}
    />
  )

  useEffect(() => {
    if (isHover && (!!height || isBasic)) {
      const tooltipPosition = getPosition()
      setPosition(tooltipPosition)
    }
  }, [isHover, height, isBasic])

  useEffect(() => {
    if (!isHover) {
      setHeight(0)
    }
  }, [isHover])

  useEffect(() => {
    const hideOnScroll = () => {
      setHover(false)
    }
    window.addEventListener('scroll', hideOnScroll, true)
    return () => window.removeEventListener('scroll', hideOnScroll)
  }, [isHover])

  if (isDisabled) {
    return <> {children} </>
  }

  return (
    <span
      ref={containerRef}
      className={clsx(styles.tooltipContainer, {
        [className!]: !!className,
        [styles.increaseHitbox]: isHover && !isBasic
      })}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {isHover ? ReactDOM.createPortal(tooltip, rootDomNode) : null}
      {!isBasic && React.isValidElement(children)
        ? React.cloneElement(children, {
            // @ts-expect-error
            isActive: isHover
          })
        : children}
    </span>
  )
}

export const BasicTooltip = (props: Omit<TooltipProps, 'isBasic'>) => {
  return <BaseTooltip {...props} isBasic />
}

export const Tooltip = (props: Omit<TooltipProps, 'isBasic'>) => {
  return <BaseTooltip {...props} isBasic={false} />
}
export default Tooltip
