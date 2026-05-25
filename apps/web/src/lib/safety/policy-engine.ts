import type { ParsedIntent, PlanCandidate, SafetyCheck, SafetyDecision } from '../agent/agent-types'
import type { PufferNetworkId } from '../puffer/contract-addresses'
import {
  getKnownContract,
  getPufferNetwork,
  getPufferVaultContract,
  isAllowlistedContract,
} from '../puffer/contract-addresses'
import type { PufferSnapshot } from '../puffer/types'
import { SECURITY_COPY } from './security-copy'

interface PolicyInput {
  intent: ParsedIntent
  candidate?: PlanCandidate
  snapshot: PufferSnapshot
  walletBalanceEth: number
  networkId: PufferNetworkId
}

function check(id: string, label: string, passed: boolean, evidence: string): SafetyCheck {
  return {
    id,
    label,
    passed,
    evidence,
    severity: passed ? 'info' : 'block',
  }
}

export function evaluateSafety(input: PolicyInput): SafetyDecision {
  const { intent, candidate, snapshot, walletBalanceEth, networkId } = input
  const network = getPufferNetwork(networkId)
  const redactions = intent.mentionsSecret ? ['secret_material'] : []
  const forbiddenCalls = ['eth_sendTransaction', 'personal_sign', 'eth_signTypedData', 'eth_sign']

  const candidateAddress = candidate?.contractAddress ?? getPufferVaultContract(networkId).address
  const knownContract = getKnownContract(candidateAddress)
  const allowlisted = isAllowlistedContract(candidateAddress)
  const amountWithinBalance =
    intent.amount <= 0 || intent.amount <= Math.max(walletBalanceEth - 0.02, 0)
  const noMissing = intent.missing.length === 0 || intent.goal === 'view_puffer_data'
  const noSecret = !intent.mentionsSecret
  const noBypass = !intent.flags.includes('policy_bypass_attempt')
  const noUnlimitedApproval = !intent.flags.includes('unlimited_approval_requested')
  const noMaxSpend = !intent.flags.includes('max_spend_requested')
  const chainSupported =
    !intent.flags.includes('unsupported_chain_requested') &&
    (knownContract
      ? knownContract.chainId === network.chainId || knownContract.chainId === 1
      : false)
  const previewDataUsable =
    snapshot.mode === 'live' ||
    intent.executionMode === 'simulation' ||
    candidate?.action === 'view_only'

  const checks: SafetyCheck[] = [
    check(
      'never_request_seed_phrase',
      'Never request seed phrase or private key',
      noSecret,
      SECURITY_COPY.seedRefusal,
    ),
    check(
      'no_policy_bypass',
      'Reject prompt-injection or silent signing',
      noBypass,
      'Safety policy cannot be bypassed by user prompt.',
    ),
    check(
      'simulation_mode_default',
      'Preview-only mode remains default',
      intent.executionMode !== 'wallet_prompt',
      SECURITY_COPY.demoMode,
    ),
    check(
      'contract_address_allowlist',
      'Contract is on the Puffer allowlist',
      allowlisted,
      candidateAddress,
    ),
    check(
      'approval_warning',
      'No unlimited approval request',
      noUnlimitedApproval,
      SECURITY_COPY.approval,
    ),
    check(
      'amount_not_all_funds',
      'Amount leaves gas buffer',
      noMaxSpend && amountWithinBalance,
      `${intent.amount || 0} ETH requested against ${walletBalanceEth} ETH mock balance.`,
    ),
    check(
      'supported_chain',
      'Puffer route supports Holesky testnet first',
      chainSupported,
      `${network.label} chainId ${network.chainId}; contract chainId ${knownContract?.chainId ?? 'unknown'}.`,
    ),
    check(
      'required_slots_present',
      'Required intent fields are present',
      noMissing,
      intent.missing.join(', ') || 'complete',
    ),
    check(
      'fresh_preview_data',
      'Preview data is labeled for this mode',
      previewDataUsable,
      `Data mode: ${snapshot.mode}`,
    ),
  ]

  const failed = checks.filter((item) => !item.passed)
  const hasBlock = failed.some((item) => item.severity === 'block')
  const mustDeny = !noSecret || !noBypass || !noUnlimitedApproval

  if (hasBlock) {
    return {
      decision: noMissing && !mustDeny ? 'clarify' : 'deny',
      checks,
      redactions,
      forbiddenCalls,
    }
  }

  if (candidate?.risk === 'high') {
    return {
      decision: 'warn_require_confirm',
      checks: checks.map((item) =>
        item.id === 'fresh_preview_data' ? { ...item, severity: 'warning' } : item,
      ),
      redactions,
      forbiddenCalls,
    }
  }

  return {
    decision: candidate?.walletPromptRequired ? 'allow_wallet_prompt' : 'allow_readonly',
    checks,
    redactions,
    forbiddenCalls,
  }
}
