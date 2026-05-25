import type { PufferNetworkId } from '../puffer/contract-addresses'
import type {
  AssetSymbol,
  ExecutionMode,
  IntentGoal,
  ParsedIntent,
  RiskTolerance,
} from './agent-types'

const ASSET_ALIASES: Array<[AssetSymbol, RegExp]> = [
  ['wstETH', /\bwsteth\b/i],
  ['stETH', /\bsteth\b/i],
  ['WETH', /\bweth\b/i],
  ['pufETH', /\bpufeth\b/i],
  ['unifiETH', /\bunifi\s*eth\b|\bunifieth\b/i],
  ['unifiUSD', /\bunifi\s*usd\b|\bunifiusd\b/i],
  ['unifiBTC', /\bunifi\s*btc\b|\bunifibtc\b/i],
  ['ETH', /\beth\b|以太|乙太/i],
]

const SECRET_PATTERNS = [
  /seed\s*phrase/i,
  /mnemonic/i,
  /private\s*key/i,
  /keystore/i,
  /wallet\s*password/i,
  /助記詞/,
  /私鑰/,
  /密碼/,
  /0x[a-f0-9]{64}/i,
]

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?safety/i,
  /sign\s+silently/i,
  /auto-?transact/i,
  /bypass\s+policy/i,
  /不要安全檢查/,
]

export function normalizeText(input: string): string {
  return input.normalize('NFKC').replace(/\s+/g, ' ').trim()
}

export function containsSecret(input: string): boolean {
  const normalized = normalizeText(input)
  return SECRET_PATTERNS.some((pattern) => pattern.test(normalized))
}

export function sanitizeIntentText(input: string): { sanitizedText: string; redactions: string[] } {
  let sanitizedText = normalizeText(input)
  const redactions: string[] = []

  for (const pattern of SECRET_PATTERNS) {
    if (pattern.test(sanitizedText)) {
      sanitizedText = sanitizedText.replace(pattern, '[REDACTED_SECRET]')
      redactions.push('secret_material')
    }
  }

  return { sanitizedText, redactions }
}

function parseAmount(text: string): number {
  const amountMatch = text.match(
    /(?:^|\s)(\d+(?:\.\d+)?)(?=\s*(?:eth|weth|steth|wsteth|pufeth|顆|枚|$))/i,
  )
  if (!amountMatch?.[1]) {
    return 0
  }
  const parsed = Number(amountMatch[1])
  return Number.isFinite(parsed) ? parsed : 0
}

function parseAsset(text: string): AssetSymbol {
  const matched = ASSET_ALIASES.find(([, pattern]) => pattern.test(text))
  return matched?.[0] ?? 'ETH'
}

function parseRisk(text: string): RiskTolerance {
  if (/low\s*risk|safe|conservative|低風險|安全|保守|不要高風險/i.test(text)) {
    return 'low'
  }
  if (/highest|high\s*apy|high\s*yield|aggressive|最高|高收益|高風險/i.test(text)) {
    return 'high'
  }
  return 'balanced'
}

function parseMode(text: string): ExecutionMode {
  if (/view|read.?only|只看|查看|資料/i.test(text)) {
    return 'readonly'
  }
  if (
    /wallet|connect|send|broadcast|送出|錢包/i.test(text) &&
    !/不要真的|不送|simulation|simulate|模擬/i.test(text)
  ) {
    return 'wallet_prompt'
  }
  return 'simulation'
}

function parseGoal(text: string): IntentGoal {
  if (containsSecret(text)) {
    return 'show_security_lesson'
  }
  if (/vault|unifi|opportunit|apy|收益|金庫|機會/i.test(text)) {
    return 'explore_unifi_vault'
  }
  if (/stake|staking|mint|deposit|puffer|pufeth|質押|參與|鑄造/i.test(text)) {
    return 'mint_pufeth'
  }
  return 'view_puffer_data'
}

function parseChain(text: string): { chain: PufferNetworkId; unsupported: boolean } {
  if (/mainnet|ethereum\s+mainnet|主網/i.test(text)) {
    return { chain: 'mainnet', unsupported: false }
  }
  if (/holesky|testnet|test\s*net|測試網/i.test(text)) {
    return { chain: 'holesky', unsupported: false }
  }
  if (/sepolia|base\s*sepolia|base|arbitrum|polygon|bsc|optimism/i.test(text)) {
    return { chain: 'holesky', unsupported: true }
  }
  return { chain: 'holesky', unsupported: false }
}

export function parseIntent(input: string): ParsedIntent {
  const rawText = input
  const normalized = normalizeText(input)
  const { sanitizedText } = sanitizeIntentText(input)
  const amount = parseAmount(normalized)
  const asset = parseAsset(normalized)
  const goal = parseGoal(normalized)
  const executionMode = parseMode(normalized)
  const chainPreference = parseChain(normalized)
  const missing: ParsedIntent['missing'] = []
  const flags: string[] = []

  if (goal === 'mint_pufeth' && amount <= 0) {
    missing.push('amount')
  }
  if (!ASSET_ALIASES.some(([, pattern]) => pattern.test(normalized)) && goal === 'mint_pufeth') {
    missing.push('asset')
  }
  if (chainPreference.unsupported) {
    missing.push('chain')
    flags.push('unsupported_chain_requested')
  }
  if (/all\s+(?:my\s+)?eth|全部|全倉/i.test(normalized)) {
    flags.push('max_spend_requested')
  }
  if (/unlimited|無限|不限/i.test(normalized)) {
    flags.push('unlimited_approval_requested')
  }
  if (INJECTION_PATTERNS.some((pattern) => pattern.test(normalized))) {
    flags.push('policy_bypass_attempt')
  }

  return {
    rawText,
    sanitizedText,
    asset,
    amount,
    riskTolerance: parseRisk(normalized),
    executionMode,
    goal,
    wantsVault: /vault|unifi|金庫/i.test(normalized),
    chain: chainPreference.chain,
    missing,
    flags,
    mentionsSecret: containsSecret(normalized),
  }
}
