import { useCallback, useRef } from 'react'

import { AudiusSdk, Playlist, ResolveApi, Track, User } from '@audius/sdk'

import {
  formatCollectionName,
  formatTrackName,
  formatUserName,
  matchAudiusLinks
} from '~/utils'

const {
  instanceOfTrackResponse,
  instanceOfPlaylistResponse,
  instanceOfUserResponse
} = ResolveApi

// TODO: Move this to util file
const escapeRegexSpecialChars = (str: string): string => {
  const specialChars = /[.*+?^${}()|[\]\\]/g
  return str.replace(specialChars, '\\$&')
}

export type LinkEntity =
  | {
      link: string
      type: 'track'
      data: Track
    }
  | {
      link: string
      type: 'collection'
      data: Playlist
    }
  | {
      link: string
      type: 'user'
      data: User
    }

/**
 * Hook to use within chat composition interfaces.
 * It pulls Audius links out into display text
 * @param value chat input text, e.g. what's in the text area
 * @param hostname audius hostname for this instance, e.g. audius.co
 * @param audiusSdk sdk instantiation interface
 * @returns {Object} Object containing helper methods and state:
 * - linkEntities: Array of the linked entities within the current value.
 *
 * - resolveLinks: Async function that takes the input text and
 *     replaces Audius links with their human-readable counterparts.
 *
 * - restoreLinks: Function that restores human-readable text back into Audius
 *      links in the provided value. This should be used before text submission.
 *
 * - getMatches: Function that returns a generator of matches for resolved
 *      Audius links within the provided value. This is useful when displaying text
 *      back to the user.
 *
 * - handleBackspace: Function that checks if the user backspaced over a resolved link
 *      and modifies the text accordingly, deleting the whole display text/link on a
 *      single keystroke.
 *
 * @example
 * const Input = () => {
 *   const [value, setValue] = useState('')
 *   const { resolveLinks, restoreLinks, clearLinks } = useAudiusLinkResolver({
 *     "Check out this song: https://audius.co/artist/track",
 *     "audius.co",
 *     audiusSdk
 *   })
 *
 *   useEffect(() => {
 *     const fn = async () => {
 *       setValue(await resolveLinks(value))
 *     }
 *     fn()
 *   }, [value, setValue])
 *
 *   const onSubmit = (value: string) => {
 *     const restored = restoreLinks(value)
 *     submit(restored)
 *     clearLinks()
 *   }
 *   return <textarea value={value} onSubmit={onSubmit} />
 * }
 */
export const useAudiusLinkResolver = ({
  value,
  hostname,
  audiusSdk
}: {
  value: string
  hostname: string
  audiusSdk: () => Promise<AudiusSdk>
}) => {
  // Maintain bidirectional maps of audius links to human readable format
  const linkToHuman = useRef<{ [key: string]: string }>({}).current
  const humanToData = useRef<{ [key: string]: LinkEntity }>({}).current

  const getSortedMatchStrings = useCallback(() => {
    return Object.keys(humanToData).sort((a, b) => b.length - a.length)
  }, [humanToData])

  const getSortedRegex = useCallback(() => {
    return getSortedMatchStrings()
      .map((str) => escapeRegexSpecialChars(str))
      .join('|')
  }, [getSortedMatchStrings])

  /**
   * Resolves Audius links in the provided text to their display text equivalent.
   */
  const resolveLinks = useCallback(
    async (value: string) => {
      const sdk = await audiusSdk()
      const { matches } = matchAudiusLinks({
        text: value,
        hostname
      })

      for (const match of matches) {
        if (!(match in linkToHuman)) {
          const res = await sdk.resolve({ url: match })
          if (res.data) {
            if (instanceOfTrackResponse(res)) {
              const human = formatTrackName({ track: res.data })
              linkToHuman[match] = human
              humanToData[human] = {
                link: match,
                type: 'track',
                data: res.data
              }
            } else if (instanceOfPlaylistResponse(res)) {
              const human = formatCollectionName({ collection: res.data[0] })
              linkToHuman[match] = human
              humanToData[human] = {
                link: match,
                type: 'collection',
                data: res.data[0]
              }
            } else if (instanceOfUserResponse(res)) {
              const user = Array.isArray(res.data) ? res.data[0] : res.data
              if (user) {
                const human = formatUserName({ user })
                linkToHuman[match] = human
                humanToData[human] = {
                  link: match,
                  type: 'user',
                  data: user
                }
              }
            }
          }
        } else {
          // If we already loaded the track, delay showing by 500ms
          // to give the user some sense of what is happening.
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }

      // Sort here to make sure that we replace all content before
      // replacing their substrings.
      // This is because in link replacement, we want to replace
      // https://artist/track
      // before we replace
      // https://artist
      // to make sure that we don't accidentally replace the substring
      // and then fail to match the larger string
      let editedValue = value
      for (const [link, human] of Object.entries(linkToHuman).sort(
        (a, b) => b[0].length - a[0].length
      )) {
        editedValue = editedValue.replaceAll(link, human)
      }

      return editedValue
    },
    [linkToHuman, humanToData, hostname, audiusSdk]
  )

  /**
   * Restores display text with the original Audius links.
   * Should be called before form submission.
   */
  const restoreLinks = useCallback(
    (value: string) => {
      let editedValue = value
      getSortedMatchStrings().forEach((human) => {
        const { link } = humanToData[human]
        editedValue = editedValue.replaceAll(human, link)
      })
      return editedValue
    },
    [getSortedMatchStrings, humanToData]
  )

  const handleBackspace = useCallback(
    ({
      cursorPosition,
      textBeforeCursor
    }: {
      cursorPosition: number
      textBeforeCursor: string
    }) => {
      const sortedStrings = getSortedMatchStrings()
      const matched = sortedStrings.find((i) => textBeforeCursor.endsWith(i))
      if (matched) {
        const newCursorPosition = cursorPosition - matched.length
        return {
          editValue: (value: string) =>
            value.slice(0, newCursorPosition) + value.slice(cursorPosition),
          newCursorPosition
        }
      }
      return {
        editValue: null,
        newCursorPosition: cursorPosition
      }
    },
    [getSortedMatchStrings]
  )

  const getMatches = useCallback(
    (value: string) => {
      const regexString = getSortedRegex()
      const regex = regexString ? new RegExp(regexString, 'g') : null

      return regex
        ? Array.from(value.matchAll(regex)).map((match) => ({
            type: 'match',
            text: match[0],
            index: match.index,
            link: humanToData[match[0]].link
          }))
        : null
    },
    [getSortedRegex, humanToData]
  )

  return {
    linkEntities:
      getMatches(value)?.map((match) => humanToData[match.text]) ?? [],
    resolveLinks,
    restoreLinks,
    getMatches,
    handleBackspace
  }
}
