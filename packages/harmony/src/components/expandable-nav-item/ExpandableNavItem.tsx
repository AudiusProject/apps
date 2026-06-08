import { useCallback, useMemo, useState } from 'react'

import { useTheme, CSSObject } from '@emotion/react'
import { ResizeObserver } from '@juggle/resize-observer'
import useMeasure from 'react-use-measure'

import { HarmonyTheme } from '../../foundations/theme'
import { IconCaretRight } from '../../icons'
import { createKeyboardActivationHandler } from '../../utils/keyboard'
import { Box } from '../layout/Box'
import { Flex } from '../layout/Flex'
import { Text } from '../text'

import type { ExpandableNavItemProps, VariantConfigs } from './types'

const ITEM_DEFAULT_WIDTH = '240px'

const variants: VariantConfigs = {
  default: {
    textVariant: 'title',
    textSize: 'l',
    textStrength: 'weak',
    iconSize: 'l',
    gap: 'm'
  },
  compact: {
    textVariant: 'body',
    textSize: 's',
    textStrength: undefined,
    iconSize: 's',
    gap: 'xs'
  }
}

const getStyles = (theme: HarmonyTheme, disabled?: boolean): CSSObject => {
  const baseStyles: CSSObject = {
    transition: `background-color ${theme.motion.hover}`,
    opacity: disabled ? 0.5 : 1
  }

  return {
    ...baseStyles,
    '&:active': {
      opacity: disabled ? 0.4 : 0.8,
      transition: `opacity ${theme.motion.quick}`
    }
  }
}

export const ExpandableNavItem = ({
  label,
  leftIcon: LeftIcon,
  rightIcon,
  defaultIsOpen = false,
  nestedItems,
  shouldPersistRightIcon = false,
  shouldPersistDownArrow = false,
  canUnfurl = true,
  variant = 'default',
  onClick,
  disabled,
  ...props
}: ExpandableNavItemProps) => {
  const [isOpen, setIsOpen] = useState(defaultIsOpen)
  const [isHovered, setIsHovered] = useState(false)
  const [isMainActive, setIsMainActive] = useState(false)
  const theme = useTheme()

  const [ref, bounds] = useMeasure({
    polyfill: ResizeObserver
  })

  const handleMouseEnter = useCallback(() => setIsHovered(true), [])
  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    setIsMainActive(false)
  }, [])

  const handleMainContainerMouseDown = useCallback(
    () => setIsMainActive(true),
    []
  )
  const handleMainContainerMouseUp = useCallback(
    () => setIsMainActive(false),
    []
  )

  const handleClick = useCallback(() => {
    if (disabled) return
    if (canUnfurl) {
      setIsOpen(!isOpen)
    }
    onClick?.(!isOpen)
  }, [canUnfurl, disabled, isOpen, onClick])

  const handleKeyDown = createKeyboardActivationHandler<HTMLDivElement>({
    onActivate: handleClick,
    disabled
  })

  const styles = useMemo(
    () => ({
      ...getStyles(theme, disabled),
      opacity: isMainActive ? 0.8 : disabled ? 0.5 : 1,
      transition: `opacity ${theme.motion.quick}, background-color ${theme.motion.hover}`,
      '&:focus-visible': {
        borderRadius: theme.cornerRadius.m,
        outline: 'none',
        boxShadow:
          'inset 0 0 0 2px var(--harmony-focus, var(--harmony-secondary))'
      }
    }),
    [theme, disabled, isMainActive]
  )

  const containerStyles = useMemo(
    () => ({
      width: '100%',
      cursor: 'pointer',
      transition: `background-color ${theme.motion.hover}`,
      padding: `0 ${theme.spacing.s}px`,
      '& > div:first-of-type': {
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.s,
        padding: theme.spacing.s,
        backgroundColor:
          isHovered && !disabled ? theme.color.background.surface2 : undefined,
        boxShadow:
          isHovered && !disabled
            ? `inset 0 0 0 1px ${theme.color.border.default}`
            : undefined,
        borderRadius: theme.cornerRadius.m,
        width: '100%'
      }
    }),
    [theme, isHovered, disabled]
  )

  const getIcon = useMemo(() => {
    const isCaretVisibleWhenHovered = isHovered && canUnfurl
    const isDownArrowPersistent = shouldPersistDownArrow && isOpen
    const shouldShowCaret = isCaretVisibleWhenHovered || isDownArrowPersistent
    return (
      <>
        {LeftIcon ? (
          <LeftIcon
            size={variants[variant].iconSize}
            color='default'
            css={{
              transition: `opacity ${theme.motion.quick}`,
              opacity: shouldShowCaret ? 0 : 1,
              position: 'absolute'
            }}
          />
        ) : null}
        <IconCaretRight
          size='s'
          color='default'
          css={{
            transition: `transform ${theme.motion.expressive}, opacity ${theme.motion.quick}`,
            transform: isOpen ? `rotate(90deg)` : undefined,
            opacity: shouldShowCaret ? 1 : 0
          }}
        />
      </>
    )
  }, [
    isHovered,
    canUnfurl,
    shouldPersistDownArrow,
    LeftIcon,
    variant,
    theme.motion.quick,
    theme.motion.expressive,
    isOpen
  ])

  const leftIcon = useMemo(() => {
    if (!getIcon && !LeftIcon) return null

    const dimensions = variant === 'compact' ? 'unit5' : 'unit6'

    return (
      <Flex
        alignItems='center'
        justifyContent='center'
        h={dimensions}
        w={dimensions}
      >
        {getIcon}
      </Flex>
    )
  }, [getIcon, LeftIcon, variant])

  const shouldShowRightIcon = isOpen || shouldPersistRightIcon

  return (
    <Flex direction='column' w='100%' {...props}>
      <Flex
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        css={containerStyles}
      >
        <Flex w='100%'>
          <Flex
            alignItems='center'
            flex={1}
            gap='m'
            css={styles}
            onMouseDown={handleMainContainerMouseDown}
            onMouseUp={handleMainContainerMouseUp}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            role='button'
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled || undefined}
            aria-expanded={isOpen}
            aria-controls={`${label}-content`}
            aria-label={`${label} navigation section`}
          >
            <Flex
              alignItems='center'
              gap={variants[variant].gap}
              flex={1}
              css={{
                maxWidth: ITEM_DEFAULT_WIDTH,
                transition: `opacity ${theme.motion.expressive}`
              }}
            >
              {leftIcon}
              <Text
                variant={variants[variant].textVariant}
                size={variants[variant].textSize}
                strength={variants[variant].textStrength}
                lineHeight='single'
                color='default'
                ellipses
              >
                {label}
              </Text>
            </Flex>
          </Flex>
          {shouldShowRightIcon ? (
            <Box
              onClick={(e) => e.stopPropagation()}
              css={{
                cursor: 'pointer',
                opacity: disabled ? 0.5 : 1,
                transition: `opacity ${theme.motion.quick}`
              }}
            >
              {rightIcon}
            </Box>
          ) : null}
        </Flex>
      </Flex>
      {nestedItems ? (
        <Flex
          direction='column'
          css={{
            transition: `height ${theme.motion.expressive}, opacity ${theme.motion.quick}`,
            overflow: 'hidden',
            opacity: isOpen ? 1 : 0
          }}
          style={{ height: isOpen ? bounds.height : 0 }}
        >
          <Flex
            direction='column'
            ref={ref}
            id={`${label}-content`}
            role='region'
            aria-label={`${label} content`}
          >
            {nestedItems}
          </Flex>
        </Flex>
      ) : null}
    </Flex>
  )
}
