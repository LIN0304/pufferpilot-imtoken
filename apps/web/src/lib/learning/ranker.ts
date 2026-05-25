import type { PreferenceModel, RankedPlan, RiskTolerance } from '../agent/agent-types'
import { banditBonus, contextKeyFor } from './contextual-bandit'

export function rankPlansWithPreferences(
  plans: RankedPlan[],
  model: PreferenceModel,
  riskTolerance: RiskTolerance,
): RankedPlan[] {
  return [...plans]
    .map((plan) => {
      const key = contextKeyFor(plan.candidate, riskTolerance)
      return {
        ...plan,
        score: {
          ...plan.score,
          total: plan.score.total + banditBonus(model, key),
        },
      }
    })
    .sort((left, right) => {
      const scoreDiff = right.score.total - left.score.total
      if (Math.abs(scoreDiff) > 0.0001) {
        return scoreDiff
      }
      return left.candidate.id.localeCompare(right.candidate.id)
    })
}
