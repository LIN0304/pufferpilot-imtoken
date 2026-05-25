import { describe, expect, it } from 'vitest'
import { parseIntent } from '../lib/agent/intent-parser'
import { planIntent } from '../lib/agent/planner'
import { MOCK_PUFFER_SNAPSHOT } from '../lib/puffer/mock-puffer-response'

const context = {
  snapshot: MOCK_PUFFER_SNAPSHOT,
  walletBalanceEth: 0.8,
  simulationFresh: true,
  networkId: 'holesky' as const,
}

describe('planIntent', () => {
  it('selects ETH to pufETH simulation for low-risk staking', () => {
    const intent = parseIntent('stake 0.3 ETH to Puffer, low risk, simulation')
    const plans = planIntent(intent, context)

    expect(plans[0]?.candidate.id).toBe('simulate-eth-to-pufeth')
    expect(plans[0]?.candidate.contractAddress).toBe('0x9196830bB4c05504E0A8475A0aD566AceEB6BeC9')
    expect(plans[0]?.candidate.requiredApprovals).toHaveLength(0)
    expect(plans[0]?.candidate.walletPromptRequired).toBe(false)
  })

  it('does not recommend vault exposure for low-risk users by default', () => {
    const intent = parseIntent('I have 0.5 ETH and want low risk Puffer')
    const plans = planIntent(intent, context)

    expect(plans.some((plan) => plan.candidate.action === 'simulate_unifi_vault')).toBe(false)
  })

  it('prioritizes vault scanning for highest APY exploration without amount', () => {
    const intent = parseIntent('幫我找最高 APY 的 vault')
    const plans = planIntent(intent, context)

    expect(plans[0]?.candidate.action).toBe('simulate_unifi_vault')
    expect(plans[0]?.candidate.risk).toBe('high')
  })

  it('returns deterministic plan ordering for identical inputs', () => {
    const intent = parseIntent('find highest APY vault with 0.5 ETH')
    const first = planIntent(intent, context).map((plan) => plan.candidate.id)
    const second = planIntent(intent, context).map((plan) => plan.candidate.id)

    expect(first).toEqual(second)
  })
})
