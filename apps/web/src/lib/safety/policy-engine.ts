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
  appMode?: 'demo' | 'real'
  allowMainnetWalletPrompt?: boolean
  permitSignatureConfirmed?: boolean
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
  const {
    intent,
    candidate,
    snapshot,
    walletBalanceEth,
    networkId,
    appMode = 'demo',
    allowMainnetWalletPrompt = false,
    permitSignatureConfirmed = false,
  } = input
  const network = getPufferNetwork(networkId)
  const redactions = intent.mentionsSecret ? ['secret_material'] : []
  const usesPermit = intent.asset === 'stETH' || intent.asset === 'wstETH'
  const walletAssetSupported =
    intent.asset === 'ETH' || intent.asset === 'stETH' || intent.asset === 'wstETH'
  const requiredApprovalSafe =
    (candidate?.requiredApprovals.length ?? 0) === 0 || (usesPermit && permitSignatureConfirmed)
  const networkPromptConfirmed = network.isTestnet || allowMainnetWalletPrompt
  const walletPromptAllowed =
    intent.executionMode === 'wallet_prompt' &&
    appMode === 'real' &&
    networkPromptConfirmed &&
    candidate?.action === 'simulate_pufeth' &&
    walletAssetSupported &&
    intent.amount > 0 &&
    requiredApprovalSafe
  const forbiddenCalls = walletPromptAllowed
    ? usesPermit && permitSignatureConfirmed
      ? ['personal_sign', 'eth_sign']
      : ['personal_sign', 'eth_signTypedData', 'eth_sign']
    : ['eth_sendTransaction', 'personal_sign', 'eth_signTypedData', 'eth_sign']

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
      ? knownContract.chainId === network.chainId ||
        (candidate?.action === 'simulate_unifi_vault' && knownContract.chainId === 1)
      : false)
  const previewDataUsable =
    snapshot.mode === 'live' ||
    intent.executionMode === 'simulation' ||
    candidate?.action === 'view_only' ||
    walletPromptAllowed

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
      'real_wallet_prompt_guard',
      'Wallet prompt is mode-gated and user-confirmed',
      intent.executionMode !== 'wallet_prompt' || walletPromptAllowed,
      intent.executionMode === 'wallet_prompt'
        ? network.isTestnet
          ? SECURITY_COPY.testnetWalletPrompt
          : SECURITY_COPY.mainnetWalletPrompt
        : SECURITY_COPY.demoMode,
    ),
    check(
      'mainnet_confirmation',
      'Mainnet requires typed MAINNET confirmation',
      intent.executionMode !== 'wallet_prompt' || network.isTestnet || allowMainnetWalletPrompt,
      `${network.label} wallet prompt confirmation: ${network.isTestnet ? 'testnet' : allowMainnetWalletPrompt ? 'MAINNET typed' : 'missing'}.`,
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
      'permit_signature_scope',
      'Permit signatures are explicit and exact amount',
      !usesPermit || intent.executionMode !== 'wallet_prompt' || permitSignatureConfirmed,
      usesPermit ? SECURITY_COPY.permit : 'No Permit signature is required for this route.',
    ),
    check(
      'amount_not_all_funds',
      'Amount leaves gas buffer',
      noMaxSpend && amountWithinBalance,
      `${intent.amount || 0} ETH requested against ${walletBalanceEth} ETH available balance context.`,
    ),
    check(
      'supported_chain',
      'Puffer route supports the selected network',
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
    decision:
      walletPromptAllowed || candidate?.walletPromptRequired
        ? 'allow_wallet_prompt'
        : 'allow_readonly',
    checks,
    redactions,
    forbiddenCalls,
  }
}
