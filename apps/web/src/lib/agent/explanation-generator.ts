import type { ParsedIntent, RankedPlan, SafetyDecision } from './agent-types'

export function generatePlanExplanation(
  intent: ParsedIntent,
  plan: RankedPlan | undefined,
  safety: SafetyDecision,
): string[] {
  if (!plan) {
    return ['I need a complete amount, asset, and Ethereum route before previewing a transaction.']
  }

  if (safety.decision === 'deny') {
    return [
      'This request is blocked by wallet safety policy.',
      ...safety.checks.filter((item) => !item.passed).map((item) => item.evidence),
    ]
  }

  return [
    `Intent: ${intent.amount || 'read-only'} ${intent.asset}, ${intent.riskTolerance} risk, ${intent.executionMode} mode.`,
    ...plan.explanation,
    intent.executionMode === 'wallet_prompt'
      ? 'Wallet prompts require explicit confirmation and the wallet remains the final approval screen.'
      : 'No transaction is broadcast in Demo or simulation mode.',
  ]
}
