import { expect } from '@storybook/jest'
import type { Meta, StoryObj } from '@storybook/react'
import { within } from '@storybook/testing-library'

import { Box, Flex } from 'components/layout'
import { IconAlbum, IconCampfire, IconFilter, IconRadar } from 'icons'

import { OptionsFilterButton } from './OptionsFilterButton'
import { OptionsFilterButtonProps } from './types'

const meta: Meta<typeof OptionsFilterButton> = {
  title: 'Buttons/FilterButton',
  component: OptionsFilterButton,
  args: {
    options: [
      { value: 'Red Rover' },
      { value: 'Green Goblin' },
      { value: 'Blue Man Group' }
    ],
    label: 'Choice',
    popupAnchorOrigin: { horizontal: 'center', vertical: 'bottom' },
    popupTransformOrigin: { horizontal: 'center', vertical: 'top' }
  },
  argTypes: {
    options: {
      control: { type: 'object' }
    },
    label: {
      control: { type: 'text' }
    },
    selection: {
      control: { type: 'text' }
    }
  }
}

export default meta

type Story = StoryObj<typeof OptionsFilterButton>

// Overview Story
export const Primary: Story = {
  render: () => (
    <Box h='200px'>
      <Flex pv='2xl' justifyContent='space-around'>
        <OptionsFilterButton
          label='Choice'
          options={[
            { value: 'Red Rover' },
            { value: 'Green Goblin' },
            { value: 'Blue Man Group' }
          ]}
        />
      </Flex>
    </Box>
  )
}

export const FillContainer: Story = {
  render: () => (
    <Box h='200px'>
      <Flex pv='2xl' justifyContent='space-around'>
        <OptionsFilterButton
          label='Choice'
          options={[
            { value: 'Red Rover' },
            { value: 'Green Goblin' },
            { value: 'Blue Man Group' }
          ]}
        />
      </Flex>
    </Box>
  )
}

export const ReplaceLabel: Story = {
  render: () => (
    <Box h='200px'>
      <Flex pv='2xl' justifyContent='space-around'>
        <OptionsFilterButton
          variant='replaceLabel'
          label='Choice'
          options={[
            { value: 'Red Leader' },
            { value: 'Green Juice' },
            { value: 'Blue Moon' }
          ]}
        />
      </Flex>
    </Box>
  )
}

export const CustomIcon: Story = {
  render: () => (
    <Box h='200px'>
      <Flex pv='2xl' justifyContent='space-around'>
        <OptionsFilterButton
          iconRight={IconFilter}
          options={[
            { value: 'Radar Option', icon: IconRadar },
            { value: 'Or A CD?', icon: IconAlbum },
            { value: "Ooh! We're Cookin Now!", icon: IconCampfire }
          ]}
        />
      </Flex>
    </Box>
  )
}

export const Accessibility: Story = {
  render: (props: OptionsFilterButtonProps) => (
    <Box h='200px'>
      <Flex pv='2xl' justifyContent='space-around'>
        <OptionsFilterButton {...props} />
      </Flex>
    </Box>
  ),
  play: async () => {
    // Note we use body here instead of the canvas because
    // Popup portals outside to document.body. Probably a TODO to fix that
    // portaling.
    const body = within(document.body)
    body.getByRole('button', { name: /choice/i }).click()
    expect(
      await body.findByRole('listbox', { name: /choice/i })
    ).toBeInTheDocument()
    expect(
      await body.findByRole('option', { name: /green goblin/i })
    ).toBeInTheDocument()
  }
}
