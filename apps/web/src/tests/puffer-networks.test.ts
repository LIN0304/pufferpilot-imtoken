import { describe, expect, it } from 'vitest'
import {
  getKnownContract,
  getPufferNetwork,
  getPufferVaultContract,
  isAllowlistedContract,
} from '../lib/puffer/contract-addresses'

describe('Puffer testnet network config', () => {
  it('uses Holesky as the default testnet execution route', () => {
    const network = getPufferNetwork('holesky')
    const pufferVault = getPufferVaultContract('holesky')

    expect(network.chainId).toBe(17000)
    expect(network.chainIdHex).toBe('0x4268')
    expect(network.isTestnet).toBe(true)
    expect(pufferVault.address).toBe('0x9196830bB4c05504E0A8475A0aD566AceEB6BeC9')
  })

  it('allowlists both Holesky and mainnet PufferVault addresses', () => {
    expect(isAllowlistedContract('0x9196830bB4c05504E0A8475A0aD566AceEB6BeC9')).toBe(true)
    expect(isAllowlistedContract('0xD9A442856C234a39a81a089C06451EBAa4306a72')).toBe(true)
    expect(getKnownContract('0x9196830bB4c05504E0A8475A0aD566AceEB6BeC9')?.chainId).toBe(17000)
  })
})
