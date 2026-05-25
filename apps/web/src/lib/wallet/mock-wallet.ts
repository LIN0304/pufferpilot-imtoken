export interface MockWallet {
  address: `0x${string}`
  chainId: 17000
  balanceEth: number
  connected: boolean
}

export const MOCK_WALLET: MockWallet = {
  address: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  chainId: 17000,
  balanceEth: 0.8,
  connected: true,
}
