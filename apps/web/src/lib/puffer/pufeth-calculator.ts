import type { AssetSymbol } from '../agent/agent-types'
import type { PufEthRate } from './types'

export interface PufEthPreview {
  inputEth: number
  outputPufEth: number
  exchangeRate: number
  route: string[]
}

export function estimatePufEthOutput(
  amountEth: number,
  rate: PufEthRate,
  inputAsset: AssetSymbol = 'ETH',
): PufEthPreview {
  const safeAmount = Number.isFinite(amountEth) && amountEth > 0 ? amountEth : 0
  const outputPufEth = safeAmount * rate.pufEthPerEth

  return {
    inputEth: safeAmount,
    outputPufEth,
    exchangeRate: rate.pufEthPerEth,
    route: [inputAsset, inputAsset === 'ETH' ? 'PufferVault' : 'PufferDepositor', 'pufETH'],
  }
}
