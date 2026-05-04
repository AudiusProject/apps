import { useCallback } from 'react'

import { FilterButton, Image } from '@audius/harmony'
import { useAsync } from 'react-use'

const TOKEN_LIST_URL = 'https://cache.jup.ag/tokens'

type Asset = {
  address: string
  name: string
  logoURI: string
  symbol: string
}

const messages = {
  searchToken: 'Search Token'
}

export const TokenPicker = ({
  selectedTokenAddress,
  onChange,
  onOpen
}: {
  selectedTokenAddress: string
  onChange: (address: string) => void
  onOpen: () => void
}) => {
  const assets = useAsync(async () => {
    const res = await fetch(TOKEN_LIST_URL)
    const json = await res.json()
    return json as Asset[]
  }, [])

  const handleChange = useCallback(
    (address: string) => {
      onChange(address)
    },
    [onChange]
  )

  if (assets.loading || assets.error) {
    return null
  }

  const options = (assets.value ?? []).map((asset) => ({
    label: asset.symbol,
    value: asset.address,
    helperText:
      asset.name.length > 15 ? asset.name.slice(0, 12) + '...' : asset.name,
    leadingElement: (
      <Image
        h={20}
        w={20}
        borderRadius='s'
        src={asset.logoURI}
        alt={asset.symbol}
      />
    ),
    labelLeadingElement: (
      <Image
        h={20}
        w={20}
        borderRadius='s'
        src={asset.logoURI}
        alt={asset.symbol}
        loading='eager'
      />
    )
  }))

  return (
    <FilterButton
      virtualized
      label='asset'
      size='small'
      menuProps={{
        anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
        transformOrigin: { vertical: 'top', horizontal: 'left' },
        maxHeight: 400,
        width: 300
      }}
      options={options}
      value={selectedTokenAddress}
      onChange={handleChange}
      onOpen={onOpen}
      showFilterInput
      variant='replaceLabel'
      filterInputProps={{ label: messages.searchToken }}
    />
  )
}
