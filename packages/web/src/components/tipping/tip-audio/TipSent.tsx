import { useCallback } from 'react'

import { useArtistCoin, useCurrentAccountUser } from '@audius/common/api'
import { Name, type SolanaWalletAddress } from '@audius/common/models'
import { tippingSelectors } from '@audius/common/store'
import { formatNumberCommas } from '@audius/common/utils'
import { IconCheck } from '@audius/harmony'
import cn from 'classnames'

import { useSelector } from 'common/hooks/useSelector'
import { make, useRecord } from 'common/store/analytics/actions'
import { XShareButton } from 'components/x-share-button/XShareButton'
import { audiusSdk } from 'services/audius-sdk'
import { env } from 'services/env'

import { ProfileInfo } from '../../profile-info/ProfileInfo'

import styles from './TipAudio.module.css'
const { getSendTipData } = tippingSelectors

const messages = {
  sending: 'SENDING',
  sentSuccessfully: 'SENT SUCCESSFULLY',
  supportOnX: 'Share your support on X!',
  xShare: (recipient: string, amount: string, price?: string) => {
    const totalValue = price && amount ? Number(price) * Number(amount) : null
    return `I just tipped ${recipient} ${formatNumberCommas(Number(amount))} $AUDIO ${totalValue ? `(~$${totalValue.toLocaleString('en-US', { maximumFractionDigits: 2 })})` : ''} on @audius`
  }
}

export const TipSent = () => {
  const record = useRecord()
  const { data: accountData } = useCurrentAccountUser({
    select: (user) => ({
      accountUserId: user?.user_id,
      accountHandle: user?.handle,
      accountErcWallet: user?.erc_wallet
    })
  })
  const { accountHandle, accountErcWallet, accountUserId } = accountData ?? {}
  const { data: tokenPriceData } = useArtistCoin(env.WAUDIO_MINT_ADDRESS)

  const tokenPrice = tokenPriceData?.price?.toString()

  if (!accountErcWallet) {
    throw new Error('Failed to get account ERC wallet')
  }
  const sendTipData = useSelector(getSendTipData)
  const { user: recipient, amount: sendAmount, source } = sendTipData

  const handleShareData = useCallback(
    (xHandle: string) => {
      const shareText = messages.xShare(xHandle, sendAmount, tokenPrice)

      const analytics = make(Name.TIP_AUDIO_TWITTER_SHARE, {
        senderHandle: accountHandle ?? '',
        recipientHandle: recipient?.handle ?? '',
        amount: sendAmount,
        device: 'web' as const,
        source
      })

      return { shareText, analytics }
    },
    [sendAmount, accountHandle, recipient?.handle, source, tokenPrice]
  )

  const recordDetailedAnalytics = useCallback(async () => {
    if (accountUserId && recipient && accountErcWallet) {
      try {
        const sdk = await audiusSdk()
        const [senderWallet, recipientWallet] = await Promise.all([
          sdk.services.claimableTokensClient.deriveUserBank({
            ethWallet: accountErcWallet,
            mint: 'wAUDIO'
          }),
          sdk.services.claimableTokensClient.deriveUserBank({
            ethWallet: recipient.erc_wallet,
            mint: 'wAUDIO'
          })
        ])

        record(
          make(Name.TIP_AUDIO_TWITTER_SHARE, {
            senderWallet: senderWallet.toBase58() as SolanaWalletAddress,
            recipientWallet: recipientWallet.toBase58() as SolanaWalletAddress,
            senderHandle: accountHandle ?? '',
            recipientHandle: recipient.handle,
            amount: sendAmount,
            device: 'web',
            source
          })
        )
      } catch (error) {
        console.error('Failed to derive wallet analytics:', error)
      }
    }
  }, [
    accountUserId,
    recipient,
    accountErcWallet,
    accountHandle,
    sendAmount,
    source,
    record
  ])

  const renderSentAudio = () => (
    <div className={styles.modalContentHeader}>
      <div className={cn(styles.flexCenter, styles.modalContentHeaderTitle)}>
        <span className={styles.sentSuccessfullyIcon}>
          <IconCheck />
        </span>
        {messages.sentSuccessfully}
      </div>
      <div className={cn(styles.flexCenter, styles.modalContentHeaderSubtitle)}>
        <span className={styles.sendAmount}>{sendAmount}</span>
        $AUDIO
      </div>
    </div>
  )

  return recipient ? (
    <div className={styles.container}>
      {renderSentAudio()}
      <ProfileInfo
        user={recipient}
        className={styles.confirmReceiver}
        imgClassName={styles.smallDynamicPhoto}
      />
      <div className={cn(styles.flexCenter, styles.support)}>
        {messages.supportOnX}
      </div>
      <div className={styles.flexCenter}>
        <XShareButton
          type='dynamic'
          size='default'
          handle={recipient.handle}
          shareData={handleShareData}
          url={`https://audius.co/${recipient.handle}`}
          onAfterShare={recordDetailedAnalytics}
        />
      </div>
    </div>
  ) : null
}
