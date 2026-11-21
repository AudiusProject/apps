import {
  useEffect,
  createContext,
  useState,
  useContext,
  useMemo,
  useRef
} from 'react'

import cn from 'classnames'

import { isMobileWebTwitter } from '../../util/isMobileWebTwitter'
import TwitterFooter from '../twitterfooter/TwitterFooter'

import styles from './Card.module.css'

const ASPECT_RATIOS = {
  standard: 0.833,
  twitter: 0.728
}

export const CardDimensionsContext = createContext({
  height: 0,
  width: 0,
  setDimensions: () => {}
})

export const CardContextProvider = (props) => {
  const [dimensions, setDimensions] = useState({ height: 0, width: 0 })

  return (
    <CardDimensionsContext.Provider
      value={{
        height: dimensions.height,
        width: dimensions.width,
        setDimensions
      }}
    >
      {props.children}
    </CardDimensionsContext.Provider>
  )
}

const setCardSize = (setCardStyle, cardRef, mobileWebTwitter, isTwitter) => {
  if (mobileWebTwitter) {
    setCardStyle({
      height: `${window.document.documentElement.clientHeight}px`,
      width: `${window.document.documentElement.clientWidth}px`
    })
    return
  }

  const aspectRatio = isTwitter ? ASPECT_RATIOS.twitter : ASPECT_RATIOS.standard
  const viewportAspectRatio =
    window.document.body.clientWidth / window.document.body.clientHeight

  if (aspectRatio < viewportAspectRatio) {
    setCardStyle({
      height: `${cardRef.current?.parentElement.clientHeight}px`,
      width: `${cardRef.current?.parentElement.clientHeight * aspectRatio}px`
    })
  } else {
    setCardStyle({
      height: `${cardRef.current?.parentElement.clientWidth / aspectRatio}px`,
      width: `${cardRef.current?.parentElement.clientWidth}px`
    })
  }
}

const Card = ({
  isTwitter,
  backgroundColor,
  twitterURL,
  children,
  fillContainer,
  className
}) => {
  const [cardStyle, setCardStyle] = useState({})

  const transparentBg = `${backgroundColor.slice(
    0,
    backgroundColor.length - 1
  )}, 0.5)`
  const mobileWebTwitter = isMobileWebTwitter(isTwitter)
  const displayTwitterFooter = isTwitter && !mobileWebTwitter
  const getDropshadow = () =>
    isTwitter && !mobileWebTwitter
      ? { boxShadow: `0 3px 34px 0 ${transparentBg}` }
      : {}
  const getBorderRadius = () => (mobileWebTwitter ? 0 : 12)
  const height = cardStyle.height

  const cardRef = useRef()
  const { setDimensions } = useContext(CardDimensionsContext)

  useEffect(() => {
    if (fillContainer) {
      setCardStyle({
        height: '100%',
        width: '100%'
      })
    } else {
      const resizeEventListener = () => {
        setCardSize(setCardStyle, cardRef, mobileWebTwitter, isTwitter)
      }

      resizeEventListener()
      window.addEventListener('resize', resizeEventListener)
      return () => {
        window.removeEventListener('resize', resizeEventListener)
      }
    }
    // TODO: Fix these deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCardSize, setCardStyle, cardRef, mobileWebTwitter, isTwitter])

  useMemo(() => {
    if (!cardStyle.width || cardStyle.width === 0) {
      return
    }
    const newStyle = {
      width: parseInt(cardStyle.width.replace('px', ''), 10),
      height: parseInt(cardStyle.height.replace('px', ''), 10)
    }
    setDimensions(newStyle)
    // TODO: Fix these deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height])

  return (
    <div
      className={cn(styles.container, className)}
      style={{
        backgroundColor,
        ...cardStyle,
        ...getDropshadow(),
        ...{ borderRadius: `${getBorderRadius()}px` }
      }}
      ref={cardRef}
    >
      {children}
      {displayTwitterFooter && (
        <div
          className={styles.twitterContainer}
          style={{
            borderBottomLeftRadius: `${getBorderRadius()}px`,
            borderBottomRightRadius: `${getBorderRadius()}px`
          }}
        >
          <TwitterFooter onClickPath={twitterURL} />
        </div>
      )}
    </div>
  )
}

export default Card
