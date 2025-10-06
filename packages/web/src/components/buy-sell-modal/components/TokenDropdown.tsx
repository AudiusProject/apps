import { useMemo, useCallback, useRef } from 'react'

import type { TokenInfo } from '@audius/common/store'
import { IconCaretDown, Text, Flex, Box } from '@audius/harmony'
import { useTheme } from '@emotion/react'
import Select, { components } from 'react-select'
import type { SingleValue, SingleValueProps, OptionProps } from 'react-select'

import zIndex from 'utils/zIndex'

import { TokenIcon } from '../TokenIcon'

type TokenOption = {
  value: string
  label: string
  tokenInfo: TokenInfo
}

type TokenDropdownProps = {
  selectedToken: TokenInfo
  availableTokens: TokenInfo[]
  onTokenChange?: (token: TokenInfo) => void
  disabled?: boolean
}

const CustomSingleValue = (props: SingleValueProps<TokenOption>) => {
  return (
    <components.SingleValue {...props}>
      <Flex gap='s' alignItems='center'>
        <TokenIcon
          logoURI={props.data.tokenInfo.logoURI}
          icon={props.data.tokenInfo.icon}
          size='2xl'
          hex
        />
      </Flex>
    </components.SingleValue>
  )
}

const CustomOption = (props: OptionProps<TokenOption>) => {
  const { spacing, cornerRadius, color } = useTheme()
  const isSelected = props.isSelected

  return (
    <components.Option {...props}>
      <Flex
        gap='s'
        alignItems='center'
        css={{
          padding: spacing.s,
          borderRadius: cornerRadius.s,
          minHeight: spacing.unit10,
          width: '100%',
          backgroundColor: isSelected ? color.secondary.s300 : 'transparent',
          color: isSelected ? color.static.white : 'inherit',
          '&:hover': {
            backgroundColor: color.secondary.s300,
            '& *': {
              color: `${color.static.white} !important`
            }
          }
        }}
      >
        <Box>
          <TokenIcon
            logoURI={props.data.tokenInfo.logoURI}
            icon={props.data.tokenInfo.icon}
            size='l'
            hex
          />
        </Box>
        <Flex direction='row' wrap='wrap' alignItems='center' gap='xs'>
          <Text
            variant='body'
            size='m'
            strength='strong'
            color={isSelected ? 'staticWhite' : 'default'}
          >
            {props.data.tokenInfo.name}
          </Text>
          <Text
            variant='body'
            size='s'
            strength='strong'
            color={isSelected ? 'staticWhite' : 'subdued'}
          >
            {`$${props.data.tokenInfo.symbol}`}
          </Text>
        </Flex>
      </Flex>
    </components.Option>
  )
}

export const TokenDropdown = ({
  selectedToken,
  availableTokens,
  onTokenChange,
  disabled = false
}: TokenDropdownProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { color, spacing, shadows, cornerRadius } = useTheme()

  const handleTokenSelect = useCallback(
    (option: SingleValue<TokenOption>) => {
      if (option) {
        onTokenChange?.(option.tokenInfo)
      }
    },
    [onTokenChange]
  )

  const options: TokenOption[] = useMemo(() => {
    return availableTokens.map((token) => ({
      value: token.symbol,
      label: token.name ?? token.symbol,
      tokenInfo: token
    }))
  }, [availableTokens])

  const selectedOption = useMemo(
    () =>
      options.find((option) => option.value === selectedToken.symbol) || {
        value: selectedToken.symbol,
        label: selectedToken.symbol,
        tokenInfo: selectedToken
      },
    [options, selectedToken]
  )

  return (
    <Flex
      ref={wrapperRef}
      direction='column'
      alignItems='flex-start'
      justifyContent='center'
      gap='xs'
      flex={1}
      alignSelf='stretch'
      border='default'
      pv='s'
      borderRadius='s'
      css={{
        height: spacing.unit16,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        '&:hover': !disabled
          ? {
              backgroundColor: color.background.surface2
            }
          : undefined
      }}
    >
      <Select<TokenOption>
        value={selectedOption}
        onChange={handleTokenSelect}
        options={options}
        isDisabled={disabled}
        isSearchable
        css={{ '& *': { 'caret-color': 'transparent' } }}
        menuPlacement='auto'
        menuPosition='absolute'
        menuPortalTarget={document.body}
        components={{
          SingleValue: CustomSingleValue,
          Option: CustomOption,
          DropdownIndicator: (props) => (
            <components.DropdownIndicator {...props}>
              <IconCaretDown size='s' color='default' />
            </components.DropdownIndicator>
          ),
          IndicatorSeparator: null
        }}
        styles={{
          container: (provided) => ({
            ...provided,
            width: '100%',
            height: '100%'
          }),
          control: (provided) => ({
            ...provided,
            backgroundColor: 'transparent',
            border: 'none',
            boxShadow: 'none',
            minHeight: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer',
            '&:hover': {
              border: 'none'
            },
            paddingLeft: spacing.m,
            paddingRight: spacing.m
          }),
          menuPortal: (provided) => ({
            ...provided,
            zIndex: zIndex.TOAST
          }),
          menu: (provided) => ({
            ...provided,
            backgroundColor: color.background.white,
            boxShadow: shadows.far,
            borderRadius: cornerRadius.m,
            padding: `${spacing.s} 0`,
            border: `1px solid ${color.border.default}`,
            minWidth: 300,
            right: 0,
            marginTop: spacing.l
          }),
          menuList: (provided) => ({
            ...provided,
            padding: spacing.s,
            maxHeight: 200,
            overflowY: 'auto'
          }),
          option: (provided) => ({
            ...provided,
            backgroundColor: 'transparent',
            color: color.text.default,
            padding: 0,
            '&:hover': {
              backgroundColor: color.background.surface2,
              cursor: 'pointer'
            },
            '&:active': {
              backgroundColor: color.background.surface2
            }
          }),
          singleValue: (provided) => ({
            ...provided,
            margin: 0,
            padding: 0
          }),
          valueContainer: (provided) => ({
            ...provided,
            margin: 0,
            padding: 0
          })
        }}
      />
    </Flex>
  )
}
