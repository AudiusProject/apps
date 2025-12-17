import { useContext, useRef } from 'react'

import { Flex } from '@audius/harmony'
import cn from 'classnames'
import { CSSTransition } from 'react-transition-group'

import IconAudius from '../../assets/img/audiusLogoGlyph.svg'
import IconRemove from '../../assets/img/iconRemove.svg'
import { PlayerFlavor } from '../app'
import Artwork from '../artwork/Artwork'
import { CardDimensionsContext } from '../card/Card'

import AudiusLogo from './AudiusLogo'
import ListenOnAudiusCTA from './ListenOnAudiusCTA'
import styles from './PausePopover.module.css'
import { PauseContext } from './PauseProvider'
import pauseTransitions from './PauseTransitions.module.css'
import PrimaryLabel from './PrimaryLabel'

const PausedPopoverCard = ({
  artworkURL,
  artworkClickURL,
  listenOnAudiusURL,
  flavor,
  isMobileWebTwitter,
  streamConditions,
  isTrack
}) => {
  const { popoverVisibility, setPopoverVisibility } = useContext(PauseContext)
  const { width } = useContext(CardDimensionsContext)
  const popoverRef = useRef(null)

  return (
    <CSSTransition
      nodeRef={popoverRef}
      in={popoverVisibility}
      timeout={1000}
      classNames={pauseTransitions}
    >
      <div
        ref={popoverRef}
        className={cn(styles.root, {
          [styles.blur]: popoverVisibility
        })}
        // Ensure that when the popover
        // is animating out, it's not clickable.
        style={popoverVisibility ? {} : { pointerEvents: 'none' }}
      >
        <div
          className={styles.container}
          style={{ width: flavor === PlayerFlavor.CARD ? width : '100%' }}
        >
          {flavor === PlayerFlavor.CARD && (
            <>
              <div className={styles.logo}>
                <AudiusLogo />
              </div>
              {!isMobileWebTwitter && (
                <Artwork
                  artworkURL={artworkURL}
                  onClickURL={artworkClickURL}
                  className={styles.artworkSizing}
                />
              )}
            </>
          )}
          <Flex
            style={{ width: '100%' }}
            alignItems='center'
            justifyContent={
              flavor === PlayerFlavor.CARD ? 'center' : 'space-between'
            }
          >
            {flavor === PlayerFlavor.COMPACT ? (
              <div
                className={styles.dismissIcon}
                onClick={() => setPopoverVisibility(false)}
              >
                <IconRemove />
              </div>
            ) : null}
            <PrimaryLabel
              streamConditions={streamConditions}
              isTrack={isTrack}
            />
            {flavor === PlayerFlavor.COMPACT ? (
              <div className={styles.audiusIcon}>
                <IconAudius />
              </div>
            ) : null}
          </Flex>
          <ListenOnAudiusCTA
            audiusURL={listenOnAudiusURL}
            streamConditions={streamConditions}
          />

          {flavor === PlayerFlavor.CARD ? (
            <div
              className={cn(styles.dismissIcon, styles.card)}
              onClick={() => setPopoverVisibility(false)}
            >
              <IconRemove />
            </div>
          ) : null}
        </div>
      </div>
    </CSSTransition>
  )
}

export default PausedPopoverCard
