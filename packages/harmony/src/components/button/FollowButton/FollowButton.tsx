import { useState, useCallback, useEffect, forwardRef, Ref } from 'react'

import { useTheme, type CSSObject } from '@emotion/react'
import styled from '@emotion/styled'

import type { IconComponent } from '~harmony/components/icon'
import { Flex } from '~harmony/components/layout/Flex'
import { Text } from '~harmony/components/text'
import { useControlled } from '~harmony/hooks/useControlled'
import {
  IconUserFollowing,
  IconUserFollow,
  IconUserUnfollow
} from '~harmony/icons'

import type { FollowButtonProps } from './types'

const defaultMessages = {
  follow: 'Follow',
  following: 'Following',
  unfollow: 'Unfollow'
}

const InputRoot = styled.input({
  cursor: 'inherit',
  position: 'absolute',
  opacity: 0,
  width: '100%',
  height: '100%',
  top: 0,
  left: 0,
  margin: 0,
  padding: 0,
  zIndex: 1
})

/**
 * Special button for following or unfollowing a user.
 */
export const FollowButton = forwardRef(
  (props: FollowButtonProps, ref: Ref<HTMLButtonElement>) => {
    const {
      variant = 'default',
      isFollowing = false,
      onUnfollow,
      onFollow,
      size = 'default',
      fullWidth = true,
      messages: messagesProp,
      ...other
    } = props
    const messages = { ...defaultMessages, ...messagesProp }
    const { type } = other
    const [value, setValueState] = useControlled({
      componentName: 'FollowButton',
      controlledProp: isFollowing,
      defaultValue: undefined,
      stateName: 'following'
    })

    // Track hover manually to swap text and icon
    const [isHovering, setIsHovering] = useState(false)
    const [isPressing, setIsPressing] = useState(false)

    const handleMouseEnter = useCallback(() => {
      setIsHovering(true)
    }, [])

    const handleMouseDown = useCallback(() => {
      setIsPressing(true)
    }, [])

    const handleMouseLeave = useCallback(() => {
      setIsHovering(false)
    }, [])

    const handleMouseUp = useCallback(() => {
      setIsPressing(false)
    }, [])

    const handlePressIn = useCallback(() => {
      setIsHovering(true)
      setIsPressing(true)
    }, [])

    const handlePressOut = useCallback(() => {
      setIsHovering(false)
      setIsPressing(false)
    }, [])

    const handleClick = useCallback(() => {
      if (value) {
        onUnfollow?.()
      } else {
        onFollow?.()
      }
      setValueState(!value)
    }, [value, setValueState, onUnfollow, onFollow])

    const checkedValue = value
    let Icon: IconComponent = IconUserFollow
    let text = messages.follow
    if (checkedValue && !isHovering) {
      Icon = IconUserFollowing
      text = messages.following
    } else if (checkedValue && isHovering && !isPressing) {
      Icon = IconUserUnfollow
      text = messages.unfollow
    }

    const { color, cornerRadius, motion, shadows } = useTheme()

    const textColor =
      checkedValue || isHovering || isPressing ? 'white' : 'active'

    const borderRadius =
      variant === 'pill' ? cornerRadius['2xl'] : cornerRadius.s

    const rootCss: CSSObject = {
      cursor: 'pointer',
      minWidth: size === 'small' ? 128 : 152,
      width: fullWidth ? '100%' : undefined,
      userSelect: 'none',
      borderRadius,
      backgroundColor: checkedValue
        ? color.primary.primary
        : color.special.white,
      boxShadow: shadows.near,
      border: `1px solid ${color.primary.primary}`,
      transition: `
        transform ${motion.hover},
        border-color ${motion.hover},
        background-color ${motion.hover},
        color ${motion.hover}
      `,
      '&:hover': {
        borderWidth: 0,
        backgroundColor: color.primary.p300,
        boxShadow: shadows.mid
      },
      '&:active': {
        backgroundColor: color.primary.p500,
        borderWidth: 0,
        boxShadow: 'none'
      }
    }

    // Handles case where user mouses down, moves cursor, and mouses up
    useEffect(() => {
      if (isPressing) {
        document.addEventListener('mouseup', handleMouseUp)
        return () => {
          document.removeEventListener('mouseup', handleMouseUp)
        }
      }
      return undefined
    }, [isPressing, handleMouseUp])

    const rootProps = {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onMouseDown: handleMouseDown,
      onMouseUp: handleMouseUp,
      onTouchStart: handlePressIn,
      onTouchEnd: handlePressOut
    }

    const buttonProps = type === 'checkbox' ? undefined : other
    const inputProps = type === 'checkbox' ? other : undefined

    return (
      <Flex
        // @ts-ignore flex not smart enough
        ref={ref}
        as={type === 'checkbox' ? 'label' : 'button'}
        h={size === 'small' ? 28 : 32}
        direction='row'
        alignItems='center'
        justifyContent='center'
        gap='xs'
        pv='s'
        css={rootCss}
        // @ts-ignore flex not smart enough
        onClick={handleClick}
        {...buttonProps}
        {...rootProps}
      >
        <Icon height={18} width={18} color={textColor} />
        <Text
          variant='label'
          tag='span'
          size={size === 'small' ? 's' : 'l'}
          strength='default'
          color={textColor}
        >
          {text}
        </Text>
        {type === 'checkbox' ? (
          <InputRoot {...inputProps} checked={isFollowing} />
        ) : null}
      </Flex>
    )
  }
)
