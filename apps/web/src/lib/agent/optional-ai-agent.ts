import type { ParsedIntent, RankedPlan } from './agent-types'

export interface OptionalAiAgentInput {
  apiKey: string
  intent: ParsedIntent
  selectedPlan?: RankedPlan
  pufEthRate: number
  protocolTvlUsd: number
}

export async function requestOptionalAiAgentSummary({
  apiKey,
  intent,
  selectedPlan,
  pufEthRate,
  protocolTvlUsd,
}: OptionalAiAgentInput): Promise<string> {
  if (!apiKey.trim()) {
    throw new Error('Enter your own OpenAI API key to use optional AI mode.')
  }

  const prompt = [
    'You are an optional wallet explanation assistant.',
    'Do not request seed phrases, private keys, passwords, or signatures.',
    'Do not override the deterministic safety policy.',
    'Summarize the selected Puffer route in Traditional Chinese in 3 short bullets.',
    `Intent asset: ${intent.asset}`,
    `Intent amount: ${intent.amount}`,
    `Risk tolerance: ${intent.riskTolerance}`,
    `Execution mode: ${intent.executionMode}`,
    `Selected route: ${selectedPlan?.candidate.title ?? 'none'}`,
    `pufETH/ETH rate: ${pufEthRate}`,
    `Protocol TVL USD: ${protocolTvlUsd}`,
  ].join('\n')

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      input: prompt,
      max_output_tokens: 220,
    }),
  })

  const payload = (await response.json()) as {
    output_text?: string
    error?: { message?: string }
  }
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `AI request failed with HTTP ${response.status}`)
  }

  return payload.output_text?.trim() || 'AI returned no summary.'
}
