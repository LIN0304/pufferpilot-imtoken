import { describe, expect, it } from 'vitest'
import { parseIntent } from '../lib/agent/intent-parser'
import { planIntent } from '../lib/agent/planner'
import {
  contextKeyFor,
  EMPTY_PREFERENCE_MODEL,
  updatePreferenceModel,
} from '../lib/learning/contextual-bandit'
import { rankPlansWithPreferences } from '../lib/learning/ranker'
import { MOCK_PUFFER_SNAPSHOT } from '../lib/puffer/mock-puffer-response'

const context = {
  snapshot: MOCK_PUFFER_SNAPSHOT,
  walletBalanceEth: 0.8,
  simulationFresh: true,
  networkId: 'holesky' as const,
}

describe('local preference ranker', () => {
  it('can reorder policy-allowed read-only candidates deterministically', () => {
    const intent = parseIntent('show me Puffer data')
    const plans = planIntent(intent, context)
    const viewOnlyPlan = plans.find((plan) => plan.candidate.action === 'view_only')

    expect(viewOnlyPlan).toBeDefined()
    if (!viewOnlyPlan) {
      throw new Error('Expected view-only plan')
    }

    const contextKey = contextKeyFor(viewOnlyPlan.candidate, intent.riskTolerance)
    const model = updatePreferenceModel(EMPTY_PREFERENCE_MODEL, {
      contextKey,
      actionId: 'view_only',
      reward: 0.12,
      reason: 'useful',
      timestamp: '2026-05-25T00:00:00.000Z',
    })

    const ranked = rankPlansWithPreferences(plans, model, intent.riskTolerance)
    const rankedAgain = rankPlansWithPreferences(plans, model, intent.riskTolerance)

    expect(ranked.map((plan) => plan.candidate.id)).toEqual(
      rankedAgain.map((plan) => plan.candidate.id),
    )
  })

  it('does not create candidates that planner filtered out', () => {
    const intent = parseIntent('I want 0.4 ETH low risk Puffer')
    const plans = planIntent(intent, context)
    const ranked = rankPlansWithPreferences(plans, EMPTY_PREFERENCE_MODEL, intent.riskTolerance)

    expect(ranked.every((plan) => plan.candidate.action !== 'simulate_unifi_vault')).toBe(true)
  })
})
