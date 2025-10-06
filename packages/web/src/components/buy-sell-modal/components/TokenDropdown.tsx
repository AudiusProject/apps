import { useMemo, useCallback, useRef, useState } from 'react'

import type { TokenInfo } from '@audius/common/store'
import {
  IconCaretDown,
  Text,
  Flex,
  Box,
  TextInput,
  TextInputSize,
  IconSearch,
  Menu
} from '@audius/harmony'
import { useTheme } from '@emotion/react'
import Select, { components } from 'react-select'
import type { SingleValue, OptionProps, InputProps } from 'react-select'

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

// Used to close the dropdown when clicking outside of it, but still inside of the modal
const Blanket = (props: React.HTMLAttributes<HTMLDivElement>) => (
  <Box
    css={{
      position: 'fixed',
      zIndex: zIndex.TOAST - 1,
      bottom: 0,
      left: 0,
      top: 0,
      right: 0
    }}
    {...props}
  />
)

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

const CustomInput = (props: InputProps<TokenOption>) => {
  return (
    <TextInput
      {...props}
      placeholder='Search'
      startIcon={IconSearch}
      label='Search'
      autoFocus
      size={TextInputSize.EXTRA_SMALL}
    />
  )
}

export const TokenDropdown = ({
  selectedToken,
  availableTokens,
  onTokenChange,
  disabled = false
}: TokenDropdownProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const { color, spacing } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const handleTokenSelect = useCallback(
    (option: SingleValue<TokenOption>) => {
      if (option) {
        onTokenChange?.(option.tokenInfo)
        setIsOpen(false)
      }
    },
    [onTokenChange]
  )

  const options: TokenOption[] = useMemo(() => {
    return availableTokens
      .map((token) => ({
        value: token.symbol,
        label: token.name ?? token.symbol,
        tokenInfo: token
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [availableTokens])

  const selectedOption = useMemo(
    () =>
      options.find((option) => option.value === selectedToken.symbol) || {
        value: selectedToken.symbol,
        label: selectedToken.name ?? selectedToken.symbol,
        tokenInfo: selectedToken
      },
    [options, selectedToken]
  )

  return (
    <Box css={{ position: 'relative', width: '100%' }}>
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
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
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
        <Flex
          gap='s'
          alignItems='center'
          css={{ paddingLeft: spacing.m, paddingRight: spacing.m }}
        >
          <TokenIcon
            logoURI={selectedToken.logoURI}
            icon={selectedToken.icon}
            size='2xl'
            hex
          />
          <IconCaretDown size='s' color='default' />
        </Flex>
      </Flex>
      <Menu
        isVisible={isOpen}
        anchorRef={wrapperRef}
        css={{
          border: 'none',
          boxShadow: 'none',
          backgroundColor: 'transparent',
          width: 300
        }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Select<TokenOption>
          autoFocus
          backspaceRemovesValue={false}
          components={{
            DropdownIndicator: null,
            IndicatorSeparator: null,
            Option: CustomOption,
            Input: CustomInput
          }}
          controlShouldRenderValue={false}
          hideSelectedOptions={false}
          isClearable={false}
          menuIsOpen
          onChange={handleTokenSelect}
          options={options}
          placeholder=''
          tabSelectsValue={false}
          value={selectedOption}
          styles={{
            container: (provided) => ({
              ...provided,
              flex: 1
            }),
            valueContainer: (provided) => ({
              ...provided,
              gridTemplateColumns: '1fr',
              padding: spacing.s
            }),
            control: (provided) => ({
              ...provided,
              backgroundColor: 'transparent',
              border: 'none',
              boxShadow: 'none',
              padding: `${spacing.s} ${spacing.m}`,
              cursor: 'text'
            }),
            menu: (provided) => ({
              ...provided,
              position: 'relative',
              margin: 0,
              top: 0,
              border: 'none',
              boxShadow: 'none',
              backgroundColor: 'transparent'
            }),
            menuList: (provided) => ({
              ...provided,
              padding: `0 ${spacing.s}px ${spacing.s}px`,
              maxHeight: 200,
              overflowY: 'auto'
            }),
            option: (provided) => ({
              ...provided,
              backgroundColor: 'transparent',
              color: color.text.default,
              padding: 0
            })
          }}
        />
      </Menu>
      {isOpen ? <Blanket onClick={() => setIsOpen(false)} /> : null}
    </Box>
  )
}
