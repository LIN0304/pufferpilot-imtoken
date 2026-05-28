import { describe, expect, it } from 'vitest'
import { ethAmountToWei } from '../lib/puffer/puffer-sdk-client'

describe('puffer sdk client helpers', () => {
  it('converts user ETH amounts into wei for depositETH transact', () => {
    expect(ethAmountToWei(0.01)).toBe(10_000_000_000_000_000n)
    expect(ethAmountToWei(1.23456789)).toBe(1_234_567_890_000_000_000n)
  })

  it('rejects non-positive transaction amounts', () => {
    expect(() => ethAmountToWei(0)).toThrow('positive ETH amount')
    expect(() => ethAmountToWei(Number.NaN)).toThrow('positive ETH amount')
  })
})
