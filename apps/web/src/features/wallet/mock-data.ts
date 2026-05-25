type ChecklistState = 'completed' | 'active' | 'pending'

interface WalletAsset {
  symbol: string
  amount: string
  value: string
  detail: string
}

interface ChecklistStep {
  label: string
  detail: string
  state: ChecklistState
}

const walletAssets: WalletAsset[] = [
  {
    symbol: 'ETH',
    amount: '1.28 ETH',
    value: '$4,128.40',
    detail: '+2.4%',
  },
  {
    symbol: 'USDC',
    amount: '2,460 USDC',
    value: '$2,460.00',
    detail: 'Stable',
  },
  {
    symbol: 'IMT',
    amount: '860 IMT',
    value: '$688.00',
    detail: '+8.1%',
  },
]

const checklistSteps: ChecklistStep[] = [
  {
    label: 'Install the kit',
    detail: 'Clone, install dependencies, and run the Vite demo locally.',
    state: 'completed',
  },
  {
    label: 'Use UI components',
    detail: 'Import components from @repo/ui and compose wallet screens.',
    state: 'active',
  },
  {
    label: 'Customize with tokens',
    detail: 'Follow DESIGN.md before changing color, radius, or spacing.',
    state: 'pending',
  },
]

export { checklistSteps, walletAssets }
