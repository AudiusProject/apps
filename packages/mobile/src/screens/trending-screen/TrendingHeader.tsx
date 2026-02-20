import type { ComponentType } from 'react'

import type { Modals, TrendingCategory } from '@audius/common/store'
import {
  modalsActions,
  trendingPageActions,
  trendingPageLineupActions,
  trendingPageSelectors
} from '@audius/common/store'
import type { ViewStyle } from 'react-native'
import { ScrollView, View } from 'react-native'
import type { SvgProps } from 'react-native-svg'
import { useDispatch, useSelector } from 'react-redux'

import {
  Flex,
  IconButton,
  IconLeading,
  SelectablePill,
  useTheme
} from '@audius/harmony-native'
import { GradientIcon, GradientText } from 'app/components/core'
import type { StylesProp } from 'app/styles'
import { makeStyles } from 'app/styles'

const { getTrendingCategory } = trendingPageSelectors
const { setTrendingCategory } = trendingPageActions
const { setVisibility } = modalsActions
const { trendingWeekActions, trendingMonthActions, trendingAllTimeActions } =
  trendingPageLineupActions

const categoryLabels: Record<TrendingCategory, string> = {
  tracks: 'Tracks',
  underground: 'Underground',
  winners: 'Winners'
}

const categories: TrendingCategory[] = ['tracks', 'underground', 'winners']

type TrendingHeaderProps = {
  title: string
  icon: ComponentType<SvgProps>
  filterModal: Modals
  styles?: StylesProp<{ root: ViewStyle }>
}

const useStyles = makeStyles(({ palette, spacing, typography }) => ({
  root: {
    backgroundColor: palette.white,
    borderBottomWidth: 1,
    borderBottomColor: palette.neutralLight8,
    borderTopWidth: 1,
    borderTopColor: palette.neutralLight8,
    elevation: 3,
    shadowColor: palette.neutralDark1,
    shadowOpacity: 0.12,
    shadowOffset: { height: 2, width: 0 },
    shadowRadius: 2
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: spacing(4)
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerIcon: {
    marginRight: spacing(2)
  },
  header: {
    fontSize: typography.fontSize.xl,
    lineHeight: 25,
    fontFamily: typography.fontByWeight.heavy
  },
  pillsContainer: {
    paddingHorizontal: spacing(4)
  }
}))

export const TrendingHeader = (props: TrendingHeaderProps) => {
  const { title, icon: Icon, filterModal, styles: stylesProp } = props
  const styles = useStyles()
  const { spacing } = useTheme()
  const dispatch = useDispatch()
  const category = useSelector(getTrendingCategory) ?? 'tracks'

  const handleOpenFilter = () => {
    dispatch(setVisibility({ modal: filterModal, visible: true }))
  }

  const handleCategoryChange = (value: string, isSelected: boolean) => {
    const newCategory = isSelected ? (value as TrendingCategory) : 'tracks'
    dispatch(setTrendingCategory(newCategory))
    if (newCategory !== 'winners') {
      dispatch(trendingWeekActions.reset())
      dispatch(trendingMonthActions.reset())
      dispatch(trendingAllTimeActions.reset())
    }
  }

  return (
    <View style={[styles.root, stylesProp?.root]}>
      <View style={styles.titleRow}>
        <View style={styles.headerContent}>
          <GradientIcon
            icon={Icon as ComponentType<SvgProps>}
            height={20}
            style={styles.headerIcon}
          />
          <GradientText accessibilityRole='header' style={styles.header}>
            {title}
          </GradientText>
        </View>
        {category !== 'winners' ? (
          <IconButton
            icon={IconLeading}
            size='s'
            onPress={handleOpenFilter}
            aria-label='Open filter'
          />
        ) : null}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.pillsContainer,
          { paddingVertical: spacing.s }
        ]}
      >
        <Flex direction='row' alignItems='center' gap='s'>
          {categories.map((cat) => (
            <SelectablePill
              key={cat}
              type='radio'
              size='large'
              value={cat}
              label={categoryLabels[cat]}
              isSelected={category === cat}
              onChange={handleCategoryChange}
              disableUnselectAnimation
            />
          ))}
        </Flex>
      </ScrollView>
    </View>
  )
}
