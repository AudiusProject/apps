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

export const useAudiusLinkResolver = ({
  value,
  hostname,
  audiusSdk
}: {
  value: string
  hostname: string
  audiusSdk: () => Promise<AudiusSdk>
}) => {
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

  const resolveLinks = useCallback(
    async (value: string) => {
      const sdk = await audiusSdk()
      const { matches } = matchAudiusLinks({
        text: value,
        hostname
      })

      for (const match of matches) {
        if (!(match in linkToHuman)) {
          let res: Awaited<ReturnType<typeof sdk.resolve>> | null = null
          try {
            res = await sdk.resolve({ url: match })
          } catch {
            res = null
          }
          if (res && res.data) {
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
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }

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
