import {
  getPufferNetwork,
  getPufferVaultContract,
  PUFFER_CONTRACTS,
} from '../puffer/contract-addresses'
import { estimatePufEthOutput } from '../puffer/pufeth-calculator'
import { riskFit } from '../safety/risk-score'
import type {
  ParsedIntent,
  PlanCandidate,
  PlannerContext,
  RankedPlan,
  ScoreBreakdown,
} from './agent-types'

function normalizedApy(apy: number): number {
  return Math.min(Math.max(apy / 15, 0), 1)
}

function normalizedTvl(tvl: number): number {
  return Math.min(Math.max(Math.log10(Math.max(tvl, 1)) / 9, 0), 1)
}

function candidateGoalFit(intent: ParsedIntent, candidate: PlanCandidate): number {
  if (intent.goal === 'mint_pufeth' && candidate.action === 'simulate_pufeth') {
    return 1
  }
  if (intent.goal === 'explore_unifi_vault' && candidate.action === 'simulate_unifi_vault') {
    return 1
  }
  if (intent.goal === 'show_security_lesson' && candidate.action === 'show_security_lesson') {
    return 1
  }
  if (candidate.action === 'view_only') {
    return intent.goal === 'view_puffer_data' ? 1 : 0.25
  }
  return 0.35
}

export function buildPlanCandidates(
  intent: ParsedIntent,
  context: PlannerContext,
): PlanCandidate[] {
  const preview = estimatePufEthOutput(intent.amount, context.snapshot.rate)
  const network = getPufferNetwork(context.networkId)
  const pufferVault = getPufferVaultContract(context.networkId)
  const bestVault = [...context.snapshot.vaultApys].sort((left, right) => right.apy - left.apy)[0]
  const bestVaultAddress = bestVault?.tokenAddress ?? PUFFER_CONTRACTS.unifiEthVault.address
  const bestVaultLabel = bestVault?.label ?? 'UniFi ETH Vault'

  return [
    {
      id: 'view-puffer-market',
      title: 'View Puffer market data',
      action: 'view_only',
      risk: 'low',
      steps: ['Read pufETH rate', 'Read protocol TVL', 'Read vault APY and TVL'],
      requiredApprovals: [],
      contractAddress: pufferVault.address,
      estimatedGas: '0 gwei in demo mode',
      outputAsset: 'pufETH',
      outputAmount: 0,
      walletPromptRequired: false,
      complexity: 1,
      reasons: ['Read-only inspection keeps the first step reversible.'],
    },
    {
      id: 'simulate-eth-to-pufeth',
      title: 'Simulate ETH to pufETH',
      action: 'simulate_pufeth',
      risk: 'low',
      steps: [
        'Parse amount',
        'Estimate pufETH output',
        `Check ${network.label} PufferVault allowlist`,
        'Show preview only',
      ],
      requiredApprovals: [],
      contractAddress: pufferVault.address,
      estimatedGas: network.isTestnet
        ? 'SDK Holesky gas estimate available on wallet click'
        : 'Preview only; real mainnet deposit would require ETH gas',
      outputAsset: 'pufETH',
      outputAmount: preview.outputPufEth,
      walletPromptRequired: false,
      complexity: 2,
      reasons: ['ETH deposit does not need ERC-20 approval.', 'Demo mode disables broadcast.'],
    },
    {
      id: 'scan-unifi-vault',
      title: `Scan ${bestVaultLabel}`,
      action: 'simulate_unifi_vault',
      risk: intent.riskTolerance === 'low' || (bestVault?.apy ?? 0) > 8 ? 'high' : 'medium',
      steps: [
        'Compare APY with TVL',
        'Check vault contract allowlist',
        'Require risk disclosure before any wallet prompt',
      ],
      requiredApprovals: ['Exact token approval would be required for non-ETH vault deposits.'],
      contractAddress: bestVaultAddress,
      estimatedGas: 'Preview only; real vault deposit would require approval and gas',
      outputAsset: 'unifiETH',
      outputAmount: intent.amount,
      walletPromptRequired: false,
      complexity: 4,
      reasons: [
        'Vaults add strategy and withdrawal complexity.',
        'APY is not treated as the only ranking signal.',
      ],
    },
    {
      id: 'security-lesson',
      title: 'Show wallet safety lesson',
      action: 'show_security_lesson',
      risk: 'low',
      steps: [
        'Reject secret handling',
        'Explain preview-only boundary',
        'Keep sensitive data out of storage',
      ],
      requiredApprovals: [],
      contractAddress: pufferVault.address,
      estimatedGas: '0 gwei',
      outputAsset: 'ETH',
      outputAmount: 0,
      walletPromptRequired: false,
      complexity: 1,
      reasons: ['Safety education is the correct path when secret material appears.'],
    },
  ]
}

export function scoreCandidate(
  candidate: PlanCandidate,
  intent: ParsedIntent,
  context: PlannerContext,
): ScoreBreakdown {
  const bestVaultApy = Math.max(...context.snapshot.vaultApys.map((vault) => vault.apy), 0)
  const tvl =
    candidate.action === 'simulate_unifi_vault'
      ? context.snapshot.vaultTvl.unifiEthVault
      : context.snapshot.protocol.tvlPufferStaking

  const breakdown = {
    goalFit: candidateGoalFit(intent, candidate),
    normalizedApy: normalizedApy(
      candidate.action === 'simulate_unifi_vault'
        ? bestVaultApy
        : context.snapshot.protocol.stakingApy,
    ),
    normalizedTvl: normalizedTvl(tvl),
    liquidityScore: candidate.action === 'simulate_unifi_vault' ? 0.55 : 0.85,
    userRiskMatch: riskFit(candidate, intent.riskTolerance),
    approvalPenalty: candidate.requiredApprovals.length > 0 ? 0.45 : 0,
    complexityPenalty: candidate.complexity / 5,
    total: 0,
  }

  breakdown.total =
    0.3 * breakdown.goalFit +
    0.22 * breakdown.normalizedApy +
    0.18 * breakdown.normalizedTvl +
    0.15 * breakdown.liquidityScore +
    0.2 * breakdown.userRiskMatch -
    0.35 * breakdown.approvalPenalty -
    0.2 * breakdown.complexityPenalty

  return breakdown
}

export function planIntent(intent: ParsedIntent, context: PlannerContext): RankedPlan[] {
  if (intent.mentionsSecret) {
    const lesson = buildPlanCandidates(intent, context).find(
      (candidate) => candidate.action === 'show_security_lesson',
    )
    return lesson
      ? [
          {
            candidate: lesson,
            score: scoreCandidate(lesson, intent, context),
            explanation: lesson.reasons,
          },
        ]
      : []
  }

  const candidates = buildPlanCandidates(intent, context).filter((candidate) => {
    if (candidate.action === 'show_security_lesson') {
      return false
    }
    if (intent.missing.length > 0 && candidate.action !== 'view_only') {
      return false
    }
    if (intent.riskTolerance === 'low' && candidate.action === 'simulate_unifi_vault') {
      return false
    }
    return true
  })

  return candidates
    .map((candidate) => ({
      candidate,
      score: scoreCandidate(candidate, intent, context),
      explanation: candidate.reasons,
    }))
    .sort((left, right) => {
      const scoreDiff = right.score.total - left.score.total
      if (Math.abs(scoreDiff) > 0.0001) {
        return scoreDiff
      }
      if (left.candidate.complexity !== right.candidate.complexity) {
        return left.candidate.complexity - right.candidate.complexity
      }
      return left.candidate.id.localeCompare(right.candidate.id)
    })
}
