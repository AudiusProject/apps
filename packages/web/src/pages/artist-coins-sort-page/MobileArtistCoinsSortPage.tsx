import { useCallback, useState } from 'react'

import { walletMessages } from '@audius/common/messages'
import {
  Flex,
  Text,
  Button,
  SegmentedControl,
  RadioGroup,
  Radio,
  IconSortUp,
  IconSortDown,
  IconComponent
} from '@audius/harmony'
import { GetCoinsSortMethodEnum, GetCoinsSortDirectionEnum } from '@audius/sdk'
import { useLocation, useNavigate } from 'react-router-dom'

import { useMobileHeader } from 'components/header/mobile/hooks'

const sortOptions = [
  {
    value: GetCoinsSortMethodEnum.Price,
    label: walletMessages.artistCoins.sortPrice
  },
  {
    value: GetCoinsSortMethodEnum.Volume,
    label: walletMessages.artistCoins.sortVolume
  },
  {
    value: GetCoinsSortMethodEnum.MarketCap,
    label: walletMessages.artistCoins.sortMarketCap
  },
  {
    value: GetCoinsSortMethodEnum.CreatedAt,
    label: walletMessages.artistCoins.sortLaunchDate
  },
  {
    value: GetCoinsSortMethodEnum.Holder,
    label: walletMessages.artistCoins.sortHolders
  }
]

const directionOptions: Array<{
  key: GetCoinsSortDirectionEnum
  text: string
  leftIcon?: IconComponent
}> = [
  {
    key: GetCoinsSortDirectionEnum.Asc,
    text: walletMessages.artistCoins.sortAscending,
    leftIcon: IconSortUp
  },
  {
    key: GetCoinsSortDirectionEnum.Desc,
    text: walletMessages.artistCoins.sortDescending,
    leftIcon: IconSortDown
  }
]

export const MobileArtistCoinsSortPage = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // Remove the mobile header title entirely
  useMobileHeader({ title: '' })

  const { sortMethod, sortDirection } =
    (location.state as {
      sortMethod?: GetCoinsSortMethodEnum
      sortDirection?: GetCoinsSortDirectionEnum
    }) ?? {}

  const [selectedOption, setSelectedOption] = useState<GetCoinsSortMethodEnum>(
    sortMethod ?? GetCoinsSortMethodEnum.MarketCap
  )
  const [selectedDirection, setSelectedDirection] =
    useState<GetCoinsSortDirectionEnum>(
      sortDirection ?? GetCoinsSortDirectionEnum.Desc
    )

  const handleBackPress = useCallback(() => {
    navigate('/coins', {
      state: {
        sortMethod: selectedOption,
        sortDirection: selectedDirection
      }
    })
  }, [navigate, selectedOption, selectedDirection])

  const handleDirectionChange = useCallback(
    (direction: GetCoinsSortDirectionEnum) => {
      setSelectedDirection(direction)
    },
    []
  )

  const handleSortOptionChange = useCallback((value: string) => {
    setSelectedOption(value as GetCoinsSortMethodEnum)
  }, [])

  return (
    <Flex
      column
      h='100%'
      backgroundColor='white'
      justifyContent='space-between'
    >
      <Flex column>
        <Flex ph='l' pv='l'>
          <SegmentedControl
            fullWidth
            options={directionOptions}
            selected={selectedDirection}
            key={`direction-slider-${directionOptions.length}`}
            onSelectOption={handleDirectionChange}
          />
        </Flex>

        <RadioGroup
          name='sort-option'
          value={selectedOption}
          onChange={(e) =>
            handleSortOptionChange((e.target as HTMLInputElement).value)
          }
        >
          <Flex column gap='s'>
            {sortOptions.map((option) => (
              <Flex
                key={option.value}
                alignItems='center'
                gap='m'
                pv='l'
                ph='l'
                borderBottom='default'
                onClick={() => setSelectedOption(option.value)}
                css={{ cursor: 'pointer' }}
              >
                <Radio value={option.value} />
                <Text variant='body' size='l'>
                  {option.label}
                </Text>
              </Flex>
            ))}
          </Flex>
        </RadioGroup>
      </Flex>

      <Flex ph='l' pt='l' pb='4xl' borderTop='default'>
        <Button variant='primary' fullWidth onClick={handleBackPress}>
          {walletMessages.done}
        </Button>
      </Flex>
    </Flex>
  )
}
