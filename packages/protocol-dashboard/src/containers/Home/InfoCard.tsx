import { Box, PlainButton, Text, IconArrowRight } from '@audius/harmony'
import { Link } from 'react-router'

import { Card } from 'components/Card/Card'

type InfoCardProps = {
  title: string
  description: string
  ctaLink: string
  ctaText: string
}

export const InfoCard = ({
  title,
  description,
  ctaLink,
  ctaText
}: InfoCardProps) => {
  return (
    <Card direction='column' p='xl'>
      <Text variant='heading' size='m' strength='default'>
        {title}
      </Text>
      <Box mt='s'>
        <Text variant='body' size='l'>
          {description}
        </Text>
      </Box>
      <Box mt='l'>
        <PlainButton
          size='default'
          variant='default'
          asChild
          iconRight={IconArrowRight}
        >
          <Link
            to={ctaLink}
            target='_blank'
            rel='noreferrer'
            css={{ color: 'inherit', textDecoration: 'none' }}
          >
            {ctaText}
          </Link>
        </PlainButton>
      </Box>
    </Card>
  )
}
