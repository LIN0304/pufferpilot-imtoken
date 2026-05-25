type ContractKind = 'protocol' | 'token' | 'vault' | 'teller' | 'accountant'

export interface KnownContract {
  address: `0x${string}`
  chainId: number
  kind: ContractKind
  label: string
  source: string
}

export type PufferNetworkId = 'holesky' | 'mainnet'

export interface PufferNetwork {
  id: PufferNetworkId
  label: string
  chainId: number
  chainIdHex: `0x${string}`
  sdkChain: 'Chain.Holesky' | 'Chain.Mainnet'
  explorerUrl: string
  rpcUrls: string[]
  isTestnet: boolean
  nativeCurrency: {
    name: string
    symbol: 'ETH'
    decimals: 18
  }
}

export const PUFFER_API_BASE = 'https://api-v2.puffer.fi/imtoken-hackathon'

export const PUFFER_NETWORKS = {
  holesky: {
    id: 'holesky',
    label: 'Holesky testnet',
    chainId: 17000,
    chainIdHex: '0x4268',
    sdkChain: 'Chain.Holesky',
    explorerUrl: 'https://holesky.etherscan.io',
    rpcUrls: ['https://ethereum-holesky-rpc.publicnode.com'],
    isTestnet: true,
    nativeCurrency: {
      name: 'Holesky ETH',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  mainnet: {
    id: 'mainnet',
    label: 'Ethereum mainnet',
    chainId: 1,
    chainIdHex: '0x1',
    sdkChain: 'Chain.Mainnet',
    explorerUrl: 'https://etherscan.io',
    rpcUrls: ['https://ethereum-rpc.publicnode.com'],
    isTestnet: false,
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
} satisfies Record<PufferNetworkId, PufferNetwork>

export const PUFFER_CONTRACTS = {
  holeskyPufferVault: {
    address: '0x9196830bB4c05504E0A8475A0aD566AceEB6BeC9',
    chainId: 17000,
    kind: 'protocol',
    label: 'Holesky PufferVault / pufETH testnet route',
    source: 'Puffer SDK CONTRACT_ADDRESSES[Chain.Holesky].PufferVault',
  },
  holeskyPufferDepositor: {
    address: '0x824AC05aeb86A0aD770b8acDe0906d2d4a6c4A8c',
    chainId: 17000,
    kind: 'protocol',
    label: 'Holesky PufferDepositor',
    source: 'Puffer SDK CONTRACT_ADDRESSES[Chain.Holesky].PufferDepositor',
  },
  holeskyWithdrawalManager: {
    address: '0x5A3E1069B66800c0ecbc91bd81b1AE4D1804DBc4',
    chainId: 17000,
    kind: 'protocol',
    label: 'Holesky PufferWithdrawalManager',
    source: 'Puffer SDK CONTRACT_ADDRESSES[Chain.Holesky].PufferWithdrawalManager',
  },
  pufferVault: {
    address: '0xD9A442856C234a39a81a089C06451EBAa4306a72',
    chainId: 1,
    kind: 'protocol',
    label: 'PufferVault / pufETH token',
    source: 'Puffer SDK CONTRACT_ADDRESSES and TOKENS_ADDRESSES',
  },
  pufferDepositor: {
    address: '0x4aa799c5dFc01ee7D790e3bf1a7C2257CE1DcefF',
    chainId: 1,
    kind: 'protocol',
    label: 'PufferDepositor',
    source: 'Puffer SDK CONTRACT_ADDRESSES',
  },
  weth: {
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    chainId: 1,
    kind: 'token',
    label: 'WETH',
    source: 'Puffer SDK TOKENS_ADDRESSES',
  },
  steth: {
    address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
    chainId: 1,
    kind: 'token',
    label: 'stETH',
    source: 'Puffer SDK TOKENS_ADDRESSES',
  },
  wsteth: {
    address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
    chainId: 1,
    kind: 'token',
    label: 'wstETH',
    source: 'Puffer SDK TOKENS_ADDRESSES',
  },
  pufferToken: {
    address: '0x4d1C297d39C5c1277964D0E3f8Aa901493664530',
    chainId: 1,
    kind: 'token',
    label: 'PUFFER',
    source: 'Puffer SDK TOKENS_ADDRESSES',
  },
  unifiEthVault: {
    address: '0x196ead472583bc1e9af7a05f860d9857e1bd3dcc',
    chainId: 1,
    kind: 'vault',
    label: 'UniFi ETH Vault',
    source: 'Puffer SDK VAULTS_ADDRESSES',
  },
  unifiUsdVault: {
    address: '0x82c40e07277eBb92935f79cE92268F80dDc7caB4',
    chainId: 1,
    kind: 'vault',
    label: 'UniFi USD Vault',
    source: 'Puffer SDK VAULTS_ADDRESSES',
  },
  unifiBtcVault: {
    address: '0x170d847a8320f3b6a77ee15b0cae430e3ec933a0',
    chainId: 1,
    kind: 'vault',
    label: 'UniFi BTC Vault',
    source: 'Puffer SDK VAULTS_ADDRESSES',
  },
} satisfies Record<string, KnownContract>

export const PRICE_TOKEN_ADDRESSES = [
  PUFFER_CONTRACTS.pufferVault.address,
  PUFFER_CONTRACTS.weth.address,
  PUFFER_CONTRACTS.steth.address,
  PUFFER_CONTRACTS.wsteth.address,
  PUFFER_CONTRACTS.unifiEthVault.address,
  PUFFER_CONTRACTS.unifiUsdVault.address,
  PUFFER_CONTRACTS.unifiBtcVault.address,
]

const allowlist = new Map(
  Object.values(PUFFER_CONTRACTS).map((contract) => [contract.address.toLowerCase(), contract]),
)

export function getKnownContract(address: string): KnownContract | undefined {
  return allowlist.get(address.toLowerCase())
}

export function isAllowlistedContract(address: string): boolean {
  return Boolean(getKnownContract(address))
}

export function getPufferVaultContract(networkId: PufferNetworkId): KnownContract {
  return networkId === 'holesky'
    ? PUFFER_CONTRACTS.holeskyPufferVault
    : PUFFER_CONTRACTS.pufferVault
}

export function getPufferNetwork(networkId: PufferNetworkId): PufferNetwork {
  return PUFFER_NETWORKS[networkId]
}
