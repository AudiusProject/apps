import {
  BaseFeeMode,
  CollectFeeMode,
  MigrationOption,
  MigrationFeeOption,
  TokenType,
  CreateConfigParam,
  ActivationType
} from '@meteora-ag/dynamic-bonding-curve-sdk'
import { Keypair, PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

import { AUDIO_MINT } from './constants'

/**
 * Makes a production curve for dbc deployment
 * @param params Object containing:
 *   - payer: the keypair of the payer
 *   - configKey: the keypair for the config
 *   - partner: the public key of the partner
 *   - rewardPool: the public key of the reward pool
 * @returns the curve design
 */
export const makeCurve = ({
  payer,
  configKey,
  partner,
  rewardPoolAuthority
}: {
  payer: Keypair
  configKey: Keypair
  partner: PublicKey
  rewardPoolAuthority: PublicKey
}): CreateConfigParam => ({
  payer: payer.publicKey,
  config: configKey.publicKey,
  feeClaimer: partner,
  leftoverReceiver: rewardPoolAuthority,
  quoteMint: new PublicKey(AUDIO_MINT),

  // Fees
  poolFees: {
    baseFee: {
      cliffFeeNumerator: new BN(10000000),
      baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
      firstFactor: 0,
      secondFactor: new BN(0),
      thirdFactor: new BN(0)
    },
    dynamicFee: null
  },
  activationType: ActivationType.Slot,
  collectFeeMode: CollectFeeMode.QuoteToken,

  // Graduation
  migrationOption: MigrationOption.MET_DAMM_V2,
  migrationQuoteThreshold: new BN('20000000000000'),
  migrationFeeOption: MigrationFeeOption.FixedBps100,
  // Migrated pool fee is unused because fee option is set above
  migratedPoolFee: {
    collectFeeMode: CollectFeeMode.QuoteToken,
    dynamicFee: 0,
    poolFeeBps: 0
  },
  migrationFee: {
    feePercentage: 0,
    creatorFeePercentage: 0
  },

  // Token params
  tokenType: TokenType.SPL,
  tokenDecimal: 9,

  // LP design
  partnerLpPercentage: 0,
  creatorLpPercentage: 0,
  partnerLockedLpPercentage: 50,
  creatorLockedLpPercentage: 50,
  creatorTradingFeePercentage: 50,

  // Curve design
  // Calculation worksheet: https://colab.research.google.com/drive/1qs2ZdFnfEDj_-wHDmVkZAqut3NCttedn?usp=sharing
  tokenSupply: {
    preMigrationTokenSupply: new BN('1000000000000000000'),
    postMigrationTokenSupply: new BN('1000000000000000000')
  },
  sqrtStartPrice: new BN('58333726687135160'),
  curve: [
    {
      sqrtPrice: new BN('72917158358918944'),
      liquidity: new BN('571036328486548000491779697672192')
    },
    {
      sqrtPrice: new BN('85035288539934656'),
      liquidity: new BN('1043411423496793959704665127911424')
    },
    {
      sqrtPrice: new BN('95629956661080960'),
      liquidity: new BN('1731136466787152700430895110160384')
    },
    {
      sqrtPrice: new BN('105162621329683952'),
      liquidity: new BN('2784492297095045174195387963015168')
    },
    {
      sqrtPrice: new BN('113900242488156176'),
      liquidity: new BN('4394180611359080849872699321745408')
    },
    {
      sqrtPrice: new BN('122013743294725040'),
      liquidity: new BN('6840220463844928439430180142841856')
    },
    {
      sqrtPrice: new BN('129620375970452032'),
      liquidity: new BN('10535563568731494085785207602937856')
    },
    {
      sqrtPrice: new BN('136804715491285680'),
      liquidity: new BN('16087957909358401101673153467252736')
    },
    {
      sqrtPrice: new BN('143630144797608192'),
      liquidity: new BN('24389233889323285551109107630473216')
    },
    {
      sqrtPrice: new BN('150145618679041632'),
      liquidity: new BN('36744235180916757004478934784409600')
    },
    {
      sqrtPrice: new BN('156389881777698304'),
      liquidity: new BN('55056701589192949206360425964240896')
    },
    {
      sqrtPrice: new BN('162394222299848896'),
      liquidity: new BN('82096750510666790667034061338312704')
    },
    {
      sqrtPrice: new BN('168184338599951136'),
      liquidity: new BN('121885042984825962137694385387601920')
    },
    {
      sqrtPrice: new BN('173781644785153568'),
      liquidity: new BN('180243519129436619742864140044075008')
    },
    {
      sqrtPrice: new BN('179204208595009184'),
      liquidity: new BN('265583529998958846013226879713017856')
    },
    {
      sqrtPrice: new BN('184467440737095520'),
      liquidity: new BN('390031788038084761836886320138420224')
    }
  ],
  // unused
  padding: [],

  // Immutable token
  tokenUpdateAuthority: 1,

  // Vesting design
  lockedVesting: {
    amountPerPeriod: new BN(500_000_000).mul(new BN(1e9)).div(new BN(5 * 365)),
    cliffDurationFromMigrationTime: new BN(0),
    frequency: new BN(24 * 60 * 60), // one day in seconds
    numberOfPeriod: new BN(5 * 365), // daily
    cliffUnlockAmount: new BN(0)
  }
})

/**
 * Makes a test curve for dbc deployment
 * Same as production but with a 1000x reduction in mkt caps
 * @param params Object containing:
 *   - payer: the keypair of the payer
 *   - configKey: the keypair for the config
 *   - partner: the public key of the partner
 *   - rewardPool: the public key of the reward pool
 * @returns the curve design
 */
export const makeTestCurve = ({
  payer,
  configKey,
  partner,
  rewardPoolAuthority
}: {
  payer: Keypair
  configKey: Keypair
  partner: PublicKey
  rewardPoolAuthority: PublicKey
}): CreateConfigParam => ({
  payer: payer.publicKey,
  config: configKey.publicKey,
  feeClaimer: partner,
  leftoverReceiver: rewardPoolAuthority,
  quoteMint: new PublicKey(AUDIO_MINT),

  // Fees
  poolFees: {
    baseFee: {
      cliffFeeNumerator: new BN(10000000),
      baseFeeMode: BaseFeeMode.FeeSchedulerLinear,
      firstFactor: 0,
      secondFactor: new BN(0),
      thirdFactor: new BN(0)
    },
    dynamicFee: null
  },
  activationType: ActivationType.Slot,
  collectFeeMode: CollectFeeMode.QuoteToken,

  // Graduation
  migrationOption: MigrationOption.MET_DAMM_V2,
  migrationQuoteThreshold: new BN('20000000000'),
  migrationFeeOption: MigrationFeeOption.FixedBps100,
  // Migrated pool fee is unused because fee option is set above
  migratedPoolFee: {
    collectFeeMode: CollectFeeMode.QuoteToken,
    dynamicFee: 0,
    poolFeeBps: 0
  },
  migrationFee: {
    feePercentage: 0,
    creatorFeePercentage: 0
  },

  // Token params
  tokenType: TokenType.SPL,
  tokenDecimal: 9,

  // LP design
  partnerLpPercentage: 0,
  creatorLpPercentage: 0,
  partnerLockedLpPercentage: 50,
  creatorLockedLpPercentage: 50,
  creatorTradingFeePercentage: 50,

  // Curve design
  // Calculation worksheet: https://colab.research.google.com/drive/1hZy7CEekEF3LGi81IWHm_1DL9Pjd6t6U
  tokenSupply: {
    preMigrationTokenSupply: new BN('1000000000000000000'),
    postMigrationTokenSupply: new BN('1000000000000000000')
  },
  sqrtStartPrice: new BN('1844674407370955'),
  curve: [
    {
      sqrtPrice: new BN('2305843009213694'),
      liquidity: new BN('18057754247175821789672614395904')
    },
    {
      sqrtPrice: new BN('2689051932758076'),
      liquidity: new BN('32995566348883979631837730308096')
    },
    {
      sqrtPrice: new BN('3024084755922066'),
      liquidity: new BN('54743341756238286998848562790400')
    },
    {
      sqrtPrice: new BN('3325534081156063'),
      liquidity: new BN('88053377860145886259638941253632')
    },
    {
      sqrtPrice: new BN('3601841923080576'),
      liquidity: new BN('138956191820458452184900508319744')
    },
    {
      sqrtPrice: new BN('3858413346544284'),
      liquidity: new BN('216306763634433951331984852647936')
    },
    {
      sqrtPrice: new BN('4098956192339867'),
      liquidity: new BN('333163773106834296934962227576832')
    },
    {
      sqrtPrice: new BN('4326144956037837'),
      liquidity: new BN('508745898944932287641762693906432')
    },
    {
      sqrtPrice: new BN('4541983982202259'),
      liquidity: new BN('771255294768285248729673728262144')
    },
    {
      sqrtPrice: new BN('4748021357208935'),
      liquidity: new BN('1161954740525860247592932825104384')
    },
    {
      sqrtPrice: new BN('4945482294219893'),
      liquidity: new BN('1741045774780616625654638131019776')
    },
    {
      sqrtPrice: new BN('5135356213192297'),
      liquidity: new BN('2596127201122984475636553916350464')
    },
    {
      sqrtPrice: new BN('5318455767448199'),
      liquidity: new BN('3854343485395775796004041718235136')
    },
    {
      sqrtPrice: new BN('5495458130514078'),
      liquidity: new BN('5699800539331489934698720343883776')
    },
    {
      sqrtPrice: new BN('5666934654481518'),
      liquidity: new BN('8398488638243657085360912050683904')
    },
    {
      sqrtPrice: new BN('5833372668713516'),
      liquidity: new BN('12333888100683631206160631641145344')
    }
  ],
  // unused
  padding: [],

  // Immutable token
  tokenUpdateAuthority: 1,

  // Vesting design
  lockedVesting: {
    amountPerPeriod: new BN(500_000_000).mul(new BN(1e9)).div(new BN(5 * 365)),
    cliffDurationFromMigrationTime: new BN(0),
    frequency: new BN(24 * 60 * 60), // one day in seconds
    numberOfPeriod: new BN(5 * 365), // daily
    cliffUnlockAmount: new BN(0)
  }
})
