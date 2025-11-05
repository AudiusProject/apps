import { describe, it, expect, vi, beforeEach } from 'vitest'

import { useAccessAndRemixSettings } from './useAccessAndRemixSettings'

const { mockedUseSelector } = vi.hoisted(() => {
  return { mockedUseSelector: vi.fn() }
})

vi.mock('react-redux', () => {
  return {
    useSelector: mockedUseSelector
  }
})

vi.mock('~/api/', () => ({
  useCurrentUserId: () => ({ data: 123 }),
  useHasNoTokens: () => ({ data: false }),
  useArtistCreatedCoin: () => ({
    data: [
      {
        name: 'dank coin',
        ticker: 'DANK',
        mint: '123',
        decimals: 18,
        ownerId: '123',
        logoUri: 'dankcoin.com/logo',
        description: 'dank coin description',
        website: 'dankcoin.com',
        createdAt: '01-01-2020'
      }
    ],
    isLoading: false
  }),
  useArtistCoins: () => ({
    data: [
      {
        name: 'dank coin',
        ticker: 'DANK',
        mint: '123',
        decimals: 18,
        ownerId: '123',
        logoUri: 'dankcoin.com/logo',
        description: 'dank coin description',
        website: 'dankcoin.com',
        createdAt: '01-01-2020'
      }
    ],
    isLoading: false
  })
}))

const mockUseSelector = (mockedState: any) => (selectorFn: any) =>
  selectorFn(mockedState)

const reduxState = {
  account: {
    userId: 123
  }
}

describe('useAccessAndRemixSettings', () => {
  beforeEach(() => {
    mockedUseSelector.mockImplementation(mockUseSelector(reduxState))
  })
  describe('track upload', () => {
    it('should disable all except hidden for track remixes', () => {
      const actual = useAccessAndRemixSettings({
        isUpload: true,
        isRemix: true,
        isAlbum: undefined,
        isInitiallyUnlisted: false,
        isScheduledRelease: false
      })
      const expected = {
        disableUsdcGate: true,
        disableSpecialAccessGate: true,
        disableSpecialAccessGateFields: true,
        disableTokenGate: true,
        disableTokenGateFields: true,
        disableHidden: false
      }
      expect(actual).toEqual(expected)
    })
  })
  describe('track edit', () => {
    it('public track - should enable all options', () => {
      const actual = useAccessAndRemixSettings({
        isUpload: false,
        isRemix: false,
        isAlbum: undefined,
        isInitiallyUnlisted: false,
        isScheduledRelease: false
      })
      const expected = {
        disableUsdcGate: false,
        disableSpecialAccessGate: false,
        disableSpecialAccessGateFields: false,
        disableTokenGate: false,
        disableTokenGateFields: false,
        disableHidden: false
      }
      expect(actual).toEqual(expected)
    })
    it('scheduled release - should enable everything except hidden', () => {
      const actual = useAccessAndRemixSettings({
        isUpload: false,
        isRemix: false,
        isAlbum: undefined,
        isInitiallyUnlisted: true,
        isScheduledRelease: true
      })
      const expected = {
        disableUsdcGate: false,
        disableSpecialAccessGate: false,
        disableSpecialAccessGateFields: false,
        disableTokenGate: false,
        disableTokenGateFields: false,
        disableHidden: true
      }
      expect(actual).toEqual(expected)
    })
    it('follow gated - should enable everything', () => {
      const actual = useAccessAndRemixSettings({
        isUpload: false,
        isRemix: false,
        isAlbum: undefined,
        isInitiallyUnlisted: false,
        isScheduledRelease: false
      })
      const expected = {
        disableUsdcGate: false,
        disableSpecialAccessGate: false,
        disableSpecialAccessGateFields: false,
        disableTokenGate: false,
        disableTokenGateFields: false,
        disableHidden: false
      }
      expect(actual).toEqual(expected)
    })
    it('tip gated - should enable everything', () => {
      const actual = useAccessAndRemixSettings({
        isUpload: false,
        isRemix: false,
        isAlbum: undefined,
        isInitiallyUnlisted: false,
        isScheduledRelease: false
      })
      const expected = {
        disableUsdcGate: false,
        disableSpecialAccessGate: false,
        disableSpecialAccessGateFields: false,
        disableTokenGate: false,
        disableTokenGateFields: false,
        disableHidden: false
      }
      expect(actual).toEqual(expected)
    })
    it('usdc gated - should enable everything', () => {
      const actual = useAccessAndRemixSettings({
        isUpload: false,
        isRemix: false,
        isAlbum: undefined,
        isInitiallyUnlisted: false,
        isScheduledRelease: false
      })
      const expected = {
        disableUsdcGate: false,
        disableSpecialAccessGate: false,
        disableSpecialAccessGateFields: false,
        disableTokenGate: false,
        disableTokenGateFields: false,
        disableHidden: false
      }
      expect(actual).toEqual(expected)
    })
    it('initially hidden - should enablqe everything', () => {
      const actual = useAccessAndRemixSettings({
        isUpload: false,
        isRemix: false,
        isAlbum: undefined,
        isInitiallyUnlisted: true,
        isScheduledRelease: false
      })
      const expected = {
        disableUsdcGate: false,
        disableSpecialAccessGate: false,
        disableSpecialAccessGateFields: false,
        disableTokenGate: false,
        disableTokenGateFields: false,
        disableHidden: false
      }
      expect(actual).toEqual(expected)
    })
  })
  describe('album upload', () => {
    it('should allow usdc & hidden for album uploads', () => {
      const actual = useAccessAndRemixSettings({
        isUpload: true,
        isRemix: false,
        isAlbum: true,
        isInitiallyUnlisted: false,
        isScheduledRelease: false
      })
      const expected = {
        disableUsdcGate: false,
        disableSpecialAccessGate: true,
        disableSpecialAccessGateFields: true,
        disableTokenGate: true,
        disableTokenGateFields: true,
        disableHidden: true
      }
      expect(actual).toEqual(expected)
    })
  })
  describe('album edit', () => {
    it('public track - should enable usdc + public', () => {
      const actual = useAccessAndRemixSettings({
        isUpload: false,
        isRemix: false,
        isAlbum: true,
        isInitiallyUnlisted: false,
        isScheduledRelease: false
      })
      const expected = {
        disableUsdcGate: false,
        disableSpecialAccessGate: true,
        disableSpecialAccessGateFields: true,
        disableTokenGate: true,
        disableTokenGateFields: true,
        disableHidden: true
      }
      expect(actual).toEqual(expected)
    })
    it('usdc gated - should enable usdc + public', () => {
      const actual = useAccessAndRemixSettings({
        isUpload: false,
        isRemix: false,
        isAlbum: true,
        isInitiallyUnlisted: false,
        isScheduledRelease: false
      })
      const expected = {
        disableUsdcGate: false,
        disableSpecialAccessGate: true,
        disableSpecialAccessGateFields: true,
        disableTokenGate: true,
        disableTokenGateFields: true,
        disableHidden: true
      }
      expect(actual).toEqual(expected)
    })
    it('initially hidden - should enable usdc + public', () => {
      const actual = useAccessAndRemixSettings({
        isUpload: false,
        isRemix: false,
        isAlbum: true,
        isInitiallyUnlisted: true,
        isScheduledRelease: false
      })
      const expected = {
        disableUsdcGate: false,
        disableSpecialAccessGate: true,
        disableSpecialAccessGateFields: true,
        disableTokenGate: true,
        disableTokenGateFields: true,
        disableHidden: true
      }
      expect(actual).toEqual(expected)
    })
  })
})
