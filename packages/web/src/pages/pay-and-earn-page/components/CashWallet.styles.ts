import { makeResponsiveStyles } from '@audius/harmony/src/utils'
import { CSSObject } from '@emotion/react'

type Styles = {
  mainFlex: CSSObject
  payoutWalletFlex: CSSObject
  transactionLink: CSSObject
  buttonArea: CSSObject
}

export const useCashWalletStyles = makeResponsiveStyles<Styles>(
  ({ media, theme }) => ({
    mainFlex: {
      tablet: {
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.m
      },
      mobile: {
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.m
      }
    },

    payoutWalletFlex: {
      base: {
        cursor: 'pointer'
      },
      mobile: {
        ...(media.isExtraSmall && {
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: theme.spacing.xs
        })
      }
    },

    transactionLink: {
      mobile: {
        alignSelf: 'flex-start'
      }
    },

    buttonArea: {
      tablet: {
        flexDirection: 'column'
      },
      mobile: {
        flexDirection: 'column'
      }
    }
  })
)
