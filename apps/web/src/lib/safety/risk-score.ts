import type { PlanCandidate, RiskTolerance } from '../agent/agent-types'

export function riskFit(candidate: PlanCandidate, tolerance: RiskTolerance): number {
  if (candidate.risk === 'blocked') {
    return 0
  }
  if (tolerance === 'low') {
    return candidate.risk === 'low' ? 1 : candidate.risk === 'medium' ? 0.45 : 0.05
  }
  if (tolerance === 'balanced') {
    return candidate.risk === 'medium' ? 1 : candidate.risk === 'low' ? 0.85 : 0.35
  }
  return candidate.risk === 'high' ? 0.9 : candidate.risk === 'medium' ? 0.8 : 0.6
}
