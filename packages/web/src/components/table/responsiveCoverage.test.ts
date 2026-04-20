import fs from 'fs'
import path from 'path'

import { describe, expect, it } from 'vitest'

import { RESPONSIVE_TABLE_POLICIES } from './responsivePolicies'

const webRoot = process.cwd().endsWith(path.join('packages', 'web'))
  ? process.cwd()
  : path.resolve(process.cwd(), 'packages/web')

const responsiveConsumerFiles = [
  'src/pages/library-page/components/desktop/LibraryPage.tsx',
  'src/pages/collection-page/components/desktop/CollectionPage.tsx',
  'src/pages/dashboard-page/components/ArtistDashboardTracksTab.tsx',
  'src/pages/history-page/components/desktop/HistoryPage.tsx',
  'src/pages/dashboard-page/components/ArtistDashboardAlbumsTab.tsx',
  'src/pages/fan-clubs-launchpad-page/components/FanClubsTable.tsx',
  'src/components/audio-transactions-table/AudioTransactionsTable.tsx',
  'src/pages/pay-and-earn-page/components/SalesTable.tsx',
  'src/pages/pay-and-earn-page/components/PurchasesTable.tsx',
  'src/pages/pay-and-earn-page/components/WithdrawalsTable.tsx'
]

const allowedNonPolicyTableConsumers = [
  'src/components/tracks-table/TrackTableLineup.tsx',
  'src/components/tracks-table/TracksTable.tsx',
  'src/components/collections-table/CollectionsTable.tsx'
]

const tableUsageRegex =
  /<(Table|TracksTable|TrackTableLineup|CollectionsTable)(\s|>|\n)/g

const walk = (dir: string): string[] => {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...walk(fullPath))
      continue
    }
    if (!entry.isFile()) continue
    if (!fullPath.endsWith('.tsx')) continue
    if (fullPath.endsWith('.test.tsx')) continue
    files.push(fullPath)
  }

  return files
}

const getTableUsageFiles = () => {
  const srcRoot = path.join(webRoot, 'src')
  const files = walk(srcRoot)
  const tableFiles: string[] = []

  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8')
    tableUsageRegex.lastIndex = 0
    if (!tableUsageRegex.test(source)) continue
    tableFiles.push(path.relative(webRoot, file).replace(/\\/g, '/'))
  }

  return tableFiles.sort()
}

describe('responsive table coverage', () => {
  it('has a policy for each audited shared table consumer', () => {
    expect(Object.keys(RESPONSIVE_TABLE_POLICIES).sort()).toEqual(
      [
        'fanClubsLeaderboard',
        'audioTransactions',
        'collectionAlbumTracks',
        'collectionPlaylistTracks',
        'dashboardAlbums',
        'dashboardTracks',
        'historyTracks',
        'libraryTracks',
        'purchases',
        'sales',
        'withdrawals'
      ].sort()
    )
  })

  it('contains all table usage surfaces in the audited allowlist', () => {
    const discoveredTableFiles = getTableUsageFiles()
    const auditedTableFiles = [
      ...responsiveConsumerFiles,
      ...allowedNonPolicyTableConsumers
    ].sort()

    expect(discoveredTableFiles).toEqual(auditedTableFiles)
  })

  it('wires responsiveColumns policy in every audited shared table consumer', () => {
    for (const relativePath of responsiveConsumerFiles) {
      const fullPath = path.join(webRoot, relativePath)
      const source = fs.readFileSync(fullPath, 'utf8')
      expect(source, `${relativePath} must import responsive policies`).toMatch(
        /RESPONSIVE_TABLE_POLICIES/
      )
      expect(
        source,
        `${relativePath} must pass responsiveColumns into a table wrapper`
      ).toMatch(/responsiveColumns\s*=/)
    }
  })
})
