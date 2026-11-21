import type Wallet from 'ethereumjs-wallet'

const GAS_LIMIT_MULTIPLIER = 1.05

export interface ContractMethod {
  arguments: string[]
  estimateGas: (config: {
    from: Wallet | string | undefined
    gas: number | undefined
  }) => Promise<number>
  _method: {
    name: string
    inputs: Array<{ type: string }>
  }
  encodeABI: () => string
  send: <Tx>(config: {
    from: Wallet | string | undefined
    gas?: number
    gasPrice?: number
  }) => Tx
}

interface EstimateGasConfig {
  method: ContractMethod
  from?: Wallet | string
  gasLimitMaximum: number
  multiplier?: number
  shouldThrowIfGasEstimationFails?: boolean
}

export const estimateGas = async ({
  method,
  from,
  gasLimitMaximum,
  multiplier = GAS_LIMIT_MULTIPLIER,
  shouldThrowIfGasEstimationFails = false
}: EstimateGasConfig) => {
  try {
    const estimatedGas = await method.estimateGas({
      from,
      gas: gasLimitMaximum
    })
    const safeEstimatedGas = Math.ceil(estimatedGas * multiplier)
    console.info(
      `Estimated gas limit ${safeEstimatedGas} for method ${method._method.name}`
    )
    return safeEstimatedGas
  } catch (e) {
    console.error(
      `Unable to estimate gas for transaction ${method._method.name}`,
      e
    )
    if (shouldThrowIfGasEstimationFails) {
      throw e
    }
    return gasLimitMaximum
  }
}
