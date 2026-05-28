import { describe, expect, it } from 'vitest'
import { parseIntent } from '../lib/agent/intent-parser'
import { planIntent } from '../lib/agent/planner'
import { MOCK_PUFFER_SNAPSHOT } from '../lib/puffer/mock-puffer-response'
import { evaluateSafety } from '../lib/safety/policy-engine'

const context = {
  snapshot: MOCK_PUFFER_SNAPSHOT,
  walletBalanceEth: 0.8,
  simulationFresh: true,
  networkId: 'holesky' as const,
}

describe('evaluateSafety', () => {
  it('denies seed phrase handling and lists forbidden wallet RPC calls', () => {
    const intent = parseIntent('這是我的助記詞 seed phrase')
    const [plan] = planIntent(intent, context)
    const decision = evaluateSafety({
      intent,
      candidate: plan?.candidate,
      snapshot: MOCK_PUFFER_SNAPSHOT,
      walletBalanceEth: 0.8,
      networkId: 'holesky',
      appMode: 'demo',
    })

    expect(decision.decision).toBe('deny')
    expect(decision.redactions).toContain('secret_material')
    expect(decision.forbiddenCalls).toEqual(
      expect.arrayContaining(['eth_sendTransaction', 'personal_sign', 'eth_signTypedData']),
    )
  })

  it('allows a complete low-risk simulation without approvals', () => {
    const intent = parseIntent('I want to stake 0.2 ETH into Puffer, low risk, simulation only')
    const [plan] = planIntent(intent, context)
    const decision = evaluateSafety({
      intent,
      candidate: plan?.candidate,
      snapshot: MOCK_PUFFER_SNAPSHOT,
      walletBalanceEth: 0.8,
      networkId: 'holesky',
      appMode: 'demo',
    })

    expect(decision.decision).toBe('allow_readonly')
    expect(decision.checks.every((check) => check.passed)).toBe(true)
  })

  it('allows only the Holesky ETH deposit wallet prompt path', () => {
    const intent = parseIntent('imToken wallet 0.01 ETH Holesky Puffer')
    const [plan] = planIntent(intent, context)
    const decision = evaluateSafety({
      intent,
      candidate: plan?.candidate,
      snapshot: MOCK_PUFFER_SNAPSHOT,
      walletBalanceEth: 0.8,
      networkId: 'holesky',
      appMode: 'real',
    })

    expect(decision.decision).toBe('allow_wallet_prompt')
    expect(decision.forbiddenCalls).not.toContain('eth_sendTransaction')
    expect(decision.forbiddenCalls).toEqual(
      expect.arrayContaining(['personal_sign', 'eth_signTypedData', 'eth_sign']),
    )
    expect(decision.checks.find((check) => check.id === 'real_wallet_prompt_guard')?.passed).toBe(
      true,
    )
  })

  it('requires a PERMIT acknowledgement before stETH wallet prompts', () => {
    const intent = parseIntent('imToken wallet 0.01 stETH Holesky Puffer')
    const [plan] = planIntent(intent, context)
    const blocked = evaluateSafety({
      intent,
      candidate: plan?.candidate,
      snapshot: MOCK_PUFFER_SNAPSHOT,
      walletBalanceEth: 0.8,
      networkId: 'holesky',
      appMode: 'real',
    })
    const allowed = evaluateSafety({
      intent,
      candidate: plan?.candidate,
      snapshot: MOCK_PUFFER_SNAPSHOT,
      walletBalanceEth: 0.8,
      networkId: 'holesky',
      appMode: 'real',
      permitSignatureConfirmed: true,
    })

    expect(blocked.decision).not.toBe('allow_wallet_prompt')
    expect(blocked.checks.find((check) => check.id === 'permit_signature_scope')?.passed).toBe(
      false,
    )
    expect(allowed.decision).toBe('allow_wallet_prompt')
    expect(allowed.forbiddenCalls).not.toContain('eth_signTypedData')
  })

  it('requires MAINNET confirmation before mainnet wallet prompts', () => {
    const mainnetContext = { ...context, networkId: 'mainnet' as const }
    const intent = parseIntent('imToken wallet 0.01 ETH mainnet Puffer')
    const [plan] = planIntent(intent, mainnetContext)
    const blocked = evaluateSafety({
      intent,
      candidate: plan?.candidate,
      snapshot: MOCK_PUFFER_SNAPSHOT,
      walletBalanceEth: 0.8,
      networkId: 'mainnet',
      appMode: 'real',
    })
    const allowed = evaluateSafety({
      intent,
      candidate: plan?.candidate,
      snapshot: MOCK_PUFFER_SNAPSHOT,
      walletBalanceEth: 0.8,
      networkId: 'mainnet',
      appMode: 'real',
      allowMainnetWalletPrompt: true,
    })

    expect(blocked.checks.find((check) => check.id === 'mainnet_confirmation')?.passed).toBe(false)
    expect(allowed.decision).toBe('allow_wallet_prompt')
  })

  it('blocks unlimited approval requests in preview policy', () => {
    const intent = parseIntent('approve unlimited WETH for vault')
    const [plan] = planIntent(intent, context)
    const decision = evaluateSafety({
      intent,
      candidate: plan?.candidate,
      snapshot: MOCK_PUFFER_SNAPSHOT,
      walletBalanceEth: 0.8,
      networkId: 'holesky',
      appMode: 'demo',
    })

    expect(decision.checks.find((check) => check.id === 'approval_warning')?.passed).toBe(false)
    expect(decision.decision).toBe('deny')
  })

  it('uses Holesky testnet as the supported Puffer SDK route', () => {
    const intent = parseIntent('testnet stake 0.2 ETH to Puffer')
    const [plan] = planIntent(intent, context)
    const decision = evaluateSafety({
      intent,
      candidate: plan?.candidate,
      snapshot: MOCK_PUFFER_SNAPSHOT,
      walletBalanceEth: 0.8,
      networkId: 'holesky',
      appMode: 'demo',
    })

    expect(plan?.candidate.contractAddress).toBe('0x9196830bB4c05504E0A8475A0aD566AceEB6BeC9')
    expect(decision.checks.find((check) => check.id === 'supported_chain')?.passed).toBe(true)
  })
})
