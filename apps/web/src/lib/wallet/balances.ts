import type { MockWallet } from './mock-wallet'

export function formatWalletSummary(wallet: MockWallet): string {
  return `${wallet.balanceEth.toFixed(3)} testnet ETH available on Holesky`
}
