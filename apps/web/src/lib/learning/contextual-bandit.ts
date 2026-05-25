import type { PlanCandidate, PreferenceEvent, PreferenceModel } from '../agent/agent-types'

export const EMPTY_PREFERENCE_MODEL: PreferenceModel = {
  version: 1,
  events: [],
  weights: {},
}

export function contextKeyFor(candidate: PlanCandidate, riskTolerance: string): string {
  return `${riskTolerance}:${candidate.action}:${candidate.risk}:${candidate.requiredApprovals.length}`
}

export function updatePreferenceModel(
  model: PreferenceModel,
  event: PreferenceEvent,
): PreferenceModel {
  const nextWeight = (model.weights[event.contextKey] ?? 0) + event.reward

  return {
    version: 1,
    events: [...model.events, event].slice(-60),
    weights: {
      ...model.weights,
      [event.contextKey]: nextWeight,
    },
  }
}

export function banditBonus(model: PreferenceModel, contextKey: string): number {
  return Math.max(Math.min(model.weights[contextKey] ?? 0, 0.15), -0.15)
}
