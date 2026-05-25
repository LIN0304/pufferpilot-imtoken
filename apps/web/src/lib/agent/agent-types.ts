import type { PufferNetworkId } from '../puffer/contract-addresses'
import type { PufferSnapshot } from '../puffer/types'

export type AssetSymbol =
  | 'ETH'
  | 'WETH'
  | 'stETH'
  | 'wstETH'
  | 'pufETH'
  | 'unifiETH'
  | 'unifiUSD'
  | 'unifiBTC'

export type RiskTolerance = 'low' | 'balanced' | 'high'
export type ExecutionMode = 'readonly' | 'simulation' | 'wallet_prompt'
export type IntentGoal =
  | 'view_puffer_data'
  | 'mint_pufeth'
  | 'explore_unifi_vault'
  | 'show_security_lesson'

export interface ParsedIntent {
  rawText: string
  sanitizedText: string
  asset: AssetSymbol
  amount: number
  riskTolerance: RiskTolerance
  executionMode: ExecutionMode
  goal: IntentGoal
  wantsVault: boolean
  chain: PufferNetworkId
  missing: Array<'amount' | 'asset' | 'chain'>
  flags: string[]
  mentionsSecret: boolean
}

export interface PlanCandidate {
  id: string
  title: string
  action: 'view_only' | 'simulate_pufeth' | 'simulate_unifi_vault' | 'show_security_lesson'
  risk: 'low' | 'medium' | 'high' | 'blocked'
  steps: string[]
  requiredApprovals: string[]
  contractAddress: string
  estimatedGas: string
  outputAsset: AssetSymbol
  outputAmount: number
  walletPromptRequired: boolean
  complexity: number
  reasons: string[]
}

export interface ScoreBreakdown {
  goalFit: number
  normalizedApy: number
  normalizedTvl: number
  liquidityScore: number
  userRiskMatch: number
  approvalPenalty: number
  complexityPenalty: number
  total: number
}

export interface RankedPlan {
  candidate: PlanCandidate
  score: ScoreBreakdown
  explanation: string[]
}

export type SafetySeverity = 'info' | 'warning' | 'danger' | 'block'
export type SafetyDecisionKind =
  | 'deny'
  | 'clarify'
  | 'warn_require_confirm'
  | 'allow_readonly'
  | 'allow_wallet_prompt'

export interface SafetyCheck {
  id: string
  label: string
  severity: SafetySeverity
  passed: boolean
  evidence: string
}

export interface SafetyDecision {
  decision: SafetyDecisionKind
  checks: SafetyCheck[]
  redactions: string[]
  forbiddenCalls: string[]
}

export interface PreferenceEvent {
  contextKey: string
  actionId: PlanCandidate['action']
  reward: number
  reason: 'useful' | 'too_risky' | 'too_complex' | 'clear'
  timestamp: string
}

export interface PreferenceModel {
  version: 1
  events: PreferenceEvent[]
  weights: Record<string, number>
}

export interface PlannerContext {
  snapshot: PufferSnapshot
  walletBalanceEth: number
  simulationFresh: boolean
  networkId: PufferNetworkId
}
