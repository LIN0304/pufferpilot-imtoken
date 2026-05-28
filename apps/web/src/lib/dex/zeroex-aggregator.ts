import { PUFFER_CONTRACTS } from '../puffer/contract-addresses'

export interface ZeroExQuoteRequest {
  apiKey: string
  taker: `0x${string}`
  sellToken: string
  sellAmountWei: string
  chainId: number
}

export interface AggregatorTransaction {
  to: `0x${string}`
  data: `0x${string}`
  value?: `0x${string}`
  gas?: string
  gasPrice?: string
}

export interface AggregatorQuote {
  provider: '0x' | 'demo'
  sellToken: string
  buyToken: string
  sellAmountWei: string
  buyAmountWei: string
  allowanceTarget?: `0x${string}`
  needsAllowance: boolean
  transaction?: AggregatorTransaction
  source: string
}

export function tokenAmountToBaseUnits(amount: number, decimals: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Enter a positive token amount before requesting an aggregator quote.')
  }
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    throw new Error('Unsupported token decimals.')
  }

  const normalized = amount.toLocaleString('en-US', {
    maximumFractionDigits: decimals,
    useGrouping: false,
  })
  const [whole = '0', fraction = ''] = normalized.split('.')
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals)

  return (BigInt(whole) * 10n ** BigInt(decimals) + BigInt(paddedFraction || '0')).toString()
}

function parseTransaction(value: unknown): AggregatorTransaction | undefined {
  if (!value || typeof value !== 'object') {
    return undefined
  }

  const tx = value as Record<string, unknown>
  if (typeof tx.to !== 'string' || !tx.to.startsWith('0x')) {
    return undefined
  }
  if (typeof tx.data !== 'string' || !tx.data.startsWith('0x')) {
    return undefined
  }

  return {
    to: tx.to as `0x${string}`,
    data: tx.data as `0x${string}`,
    value:
      typeof tx.value === 'string' && tx.value.startsWith('0x')
        ? (tx.value as `0x${string}`)
        : undefined,
    gas: typeof tx.gas === 'string' ? tx.gas : undefined,
    gasPrice: typeof tx.gasPrice === 'string' ? tx.gasPrice : undefined,
  }
}

function parseNeedsAllowance(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false
  }
  const issues = value as { allowance?: { actual?: string; spender?: string } }
  return Boolean(issues.allowance?.spender)
}

export async function getZeroExPufEthQuote({
  apiKey,
  taker,
  sellToken,
  sellAmountWei,
  chainId,
}: ZeroExQuoteRequest): Promise<AggregatorQuote> {
  if (!apiKey.trim()) {
    throw new Error('Enter your own 0x API key before requesting a real aggregator quote.')
  }

  const url = new URL('https://api.0x.org/swap/allowance-holder/quote')
  url.searchParams.set('chainId', String(chainId))
  url.searchParams.set('sellToken', sellToken)
  url.searchParams.set('buyToken', PUFFER_CONTRACTS.pufferVault.address)
  url.searchParams.set('sellAmount', sellAmountWei)
  url.searchParams.set('taker', taker)

  const response = await fetch(url, {
    headers: {
      '0x-api-key': apiKey.trim(),
      '0x-version': 'v2',
    },
  })

  const payload = (await response.json()) as Record<string, unknown>
  if (!response.ok) {
    const reason =
      typeof payload.reason === 'string'
        ? payload.reason
        : typeof payload.message === 'string'
          ? payload.message
          : `0x quote failed with HTTP ${response.status}`
    throw new Error(reason)
  }

  const allowanceTarget =
    typeof payload.allowanceTarget === 'string' && payload.allowanceTarget.startsWith('0x')
      ? (payload.allowanceTarget as `0x${string}`)
      : undefined

  return {
    provider: '0x',
    sellToken,
    buyToken: PUFFER_CONTRACTS.pufferVault.address,
    sellAmountWei,
    buyAmountWei: typeof payload.buyAmount === 'string' ? payload.buyAmount : '0',
    allowanceTarget,
    needsAllowance: parseNeedsAllowance(payload.issues),
    transaction: parseTransaction(payload.transaction),
    source: url.origin,
  }
}

export function getDemoAggregatorQuote(sellToken: string, sellAmountWei: string): AggregatorQuote {
  const sellAmount = BigInt(sellAmountWei || '0')
  const demoBuyAmount = (sellAmount * 997n) / 1000n

  return {
    provider: 'demo',
    sellToken,
    buyToken: PUFFER_CONTRACTS.pufferVault.address,
    sellAmountWei,
    buyAmountWei: demoBuyAmount.toString(),
    needsAllowance: false,
    transaction: {
      to: PUFFER_CONTRACTS.pufferVault.address,
      data: '0x',
      value: '0x0',
    },
    source: 'local deterministic demo quote',
  }
}
