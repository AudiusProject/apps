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
    // Main layout flex container
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

    // Payout wallet flex container
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

    // Transaction history link
    transactionLink: {
      mobile: {
        alignSelf: 'flex-start'
      }
    },

    // Bottom button area
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
