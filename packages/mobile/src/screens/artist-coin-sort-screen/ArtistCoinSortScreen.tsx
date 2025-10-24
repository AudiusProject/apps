import { useCallback, useState } from 'react'

import { walletMessages } from '@audius/common/messages'
import { playerSelectors } from '@audius/common/store'
import { GetCoinsSortMethodEnum, GetCoinsSortDirectionEnum } from '@audius/sdk'
import { useSelector } from 'react-redux'

import type { IconComponent } from '@audius/harmony-native'
import { Button, Flex, IconSortDown, IconSortUp } from '@audius/harmony-native'
import { Screen, SegmentedControl } from 'app/components/core'
import { useNavigation } from 'app/hooks/useNavigation'
import { useRoute } from 'app/hooks/useRoute'

import { SelectionItemList } from '../list-selection-screen/SelectionItemList'

const { getHasTrack } = playerSelectors

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

export const ArtistCoinSortScreen = () => {
  const navigation = useNavigation()
  const { params } = useRoute<'ArtistCoinSort'>()
  const hasTrack = useSelector(getHasTrack)

  const { initialSortMethod, initialSortDirection } = params

  const [selectedOption, setSelectedOption] = useState<GetCoinsSortMethodEnum>(
    initialSortMethod ?? GetCoinsSortMethodEnum.MarketCap
  )
  const [selectedDirection, setSelectedDirection] =
    useState<GetCoinsSortDirectionEnum>(
      initialSortDirection ?? GetCoinsSortDirectionEnum.Desc
    )

  const handleBackPress = useCallback(() => {
    // Navigate back to parent screen with sort params
    navigation.navigate('ArtistCoinsExplore', {
      sortMethod: selectedOption,
      sortDirection: selectedDirection
    })
  }, [navigation, selectedOption, selectedDirection])

  const handleDirectionChange = useCallback(
    (direction: GetCoinsSortDirectionEnum) => {
      setSelectedDirection(direction)
    },
    []
  )

  const handleSortOptionChange = useCallback(
    (value: GetCoinsSortMethodEnum) => {
      setSelectedOption(value)
    },
    []
  )

  return (
    <Screen title={walletMessages.artistCoins.sortTitle} topbarRight={null}>
      <Flex
        pv='m'
        gap='l'
        justifyContent='space-between'
        h='100%'
        backgroundColor='white'
      >
        <Flex>
          <Flex ph='l'>
            <SegmentedControl
              fullWidth
              options={directionOptions}
              selected={selectedDirection}
              key={`direction-slider-${directionOptions.length}`}
              onSelectOption={handleDirectionChange}
            />
          </Flex>
          <SelectionItemList
            data={sortOptions}
            value={selectedOption}
            onChange={handleSortOptionChange}
          />
        </Flex>
        <Flex ph='l' pb={hasTrack ? '3xl' : '0'}>
          <Button variant='primary' fullWidth onPress={handleBackPress}>
            {walletMessages.done}
          </Button>
        </Flex>
      </Flex>
    </Screen>
  )
}
