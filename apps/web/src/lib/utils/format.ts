export function formatNumber(value: number, maximumFractionDigits = 2): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits,
  }).format(value)
}

export function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value >= 1000 ? 0 : 2,
  }).format(value)
}

export function formatPercent(value: number): string {
  return `${formatNumber(value, 2)}%`
}

export function shortenAddress(address: string): string {
  if (address.length <= 14) {
    return address
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
