export interface MockWallet {
  address: `0x${string}`
  chainId: 17000
  balanceEth: number
  balances: {
    ETH: number
    WETH: number
    stETH: number
    wstETH: number
    pufETH: number
    USDC: number
    unifiETH: number
  }
  connected: boolean
}

export const MOCK_WALLET: MockWallet = {
  address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  chainId: 17000,
  balanceEth: 2.4,
  balances: {
    ETH: 2.4,
    WETH: 1.1,
    stETH: 1.25,
    wstETH: 0.7,
    pufETH: 0.25,
    USDC: 5000,
    unifiETH: 0,
  },
  connected: true,
}
