import { Alert, AlertDescription, AlertTitle } from '@repo/ui/components/alert'
import { Badge } from '@repo/ui/components/badge'
import { Button } from '@repo/ui/components/button'
import { Input } from '@repo/ui/components/input'
import { SectionPanel } from '@repo/ui/components/section-panel'
import { Switch } from '@repo/ui/components/switch'
import { cn } from '@repo/ui/lib/utils'
import {
  ArrowRight,
  BadgeCheck,
  Brain,
  Cable,
  CheckCircle2,
  CircleAlert,
  CircleDollarSign,
  Copy,
  DatabaseZap,
  Download,
  ExternalLink,
  Gauge,
  KeyRound,
  LockKeyhole,
  MessageSquareText,
  PlugZap,
  RefreshCw,
  Repeat2,
  SendHorizontal,
  ShieldCheck,
  ShieldX,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Wallet,
  XCircle,
} from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { ThemeToggle } from '../../app/theme-toggle'
import type {
  AssetSymbol,
  PreferenceEvent,
  PreferenceModel,
  SafetyCheck,
} from '../../lib/agent/agent-types'
import { generatePlanExplanation } from '../../lib/agent/explanation-generator'
import { parseIntent } from '../../lib/agent/intent-parser'
import { requestOptionalAiAgentSummary } from '../../lib/agent/optional-ai-agent'
import { planIntent } from '../../lib/agent/planner'
import type { AggregatorQuote } from '../../lib/dex/zeroex-aggregator'
import {
  getDemoAggregatorQuote,
  getZeroExPufEthQuote,
  tokenAmountToBaseUnits,
} from '../../lib/dex/zeroex-aggregator'
import {
  contextKeyFor,
  EMPTY_PREFERENCE_MODEL,
  updatePreferenceModel,
} from '../../lib/learning/contextual-bandit'
import { loadPreferenceModel, savePreferenceModel } from '../../lib/learning/preference-store'
import { rankPlansWithPreferences } from '../../lib/learning/ranker'
import { rewardForReason } from '../../lib/learning/reward-model'
import {
  getKnownContract,
  getPufferNetwork,
  getPufferVaultContract,
  PUFFER_NETWORKS,
} from '../../lib/puffer/contract-addresses'
import { estimatePufEthOutput } from '../../lib/puffer/pufeth-calculator'
import { getPufferSnapshot } from '../../lib/puffer/puffer-api'
import {
  estimateSdkStakeGas,
  executeSdkStake,
  type PufferStakeAsset,
  readSdkPufEthBalance,
} from '../../lib/puffer/puffer-sdk-client'
import type { PufferSnapshot } from '../../lib/puffer/types'
import { evaluateSafety } from '../../lib/safety/policy-engine'
import { formatNumber, formatPercent, formatUsd, shortenAddress } from '../../lib/utils/format'
import {
  detectWalletRuntime,
  discoverInjectedWalletProviders,
  formatWeiToEth,
  parseChainId,
  readNativeBalance,
  readWalletChainId,
  requestPreviewOnlyAccounts,
  requestWalletAccounts,
  sendWalletTransaction,
  switchOrAddEthereumChain,
  type WalletProviderOption,
  weiToEthNumber,
} from '../../lib/wallet/ethereum-provider'
import { MOCK_WALLET } from '../../lib/wallet/mock-wallet'

const DEFAULT_PROMPT = '我有 0.3 ETH，想低風險參與 Puffer，先用 Demo Mode 完整跑一次。'
const IMTOKEN_DOWNLOAD_URL = 'https://www.token.im/download'
const IMTOKEN_DAPP_BROWSER_HELP_URL =
  'https://support.token.im/hc/en-us/articles/360015520514-How-to-Use-the-DApp-Browser-in-imToken'
const METAMASK_DOWNLOAD_URL = 'https://metamask.io/download/'
const WALLETCONNECT_DOCS_URL = 'https://walletconnect.com/'
const ZERO_EX_DASHBOARD_URL = 'https://dashboard.0x.org/apps'
const ZERO_EX_NATIVE_ETH = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
const ZERO_EX_SELL_TOKEN_PRESETS = [
  { symbol: 'WETH', address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', decimals: 18 },
  { symbol: 'stETH', address: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84', decimals: 18 },
  { symbol: 'wstETH', address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', decimals: 18 },
  { symbol: 'USDC', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6 },
  { symbol: 'ETH', address: ZERO_EX_NATIVE_ETH, decimals: 18 },
] as const
const MOBILE_TABS = [
  { id: 'chat', label: 'Chat' },
  { id: 'plan', label: 'Plan' },
  { id: 'tx', label: 'Tx' },
  { id: 'dex', label: 'Swap' },
  { id: 'vault', label: 'Vaults' },
  { id: 'safety', label: 'Safety' },
] as const

type MobileTab = (typeof MOBILE_TABS)[number]['id']
type AppMode = 'demo' | 'real'
type ZeroExSellTokenPreset = (typeof ZERO_EX_SELL_TOKEN_PRESETS)[number]

function Panel({
  title,
  subtitle,
  icon,
  action,
  children,
  className = '',
}: {
  title: string
  subtitle?: string
  icon: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <SectionPanel
      padding="sm"
      className={cn('flex min-h-0 flex-col overflow-hidden bg-background p-0', className)}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-surface-blue text-primary">
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="text-body-md font-semibold text-foreground">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 text-caption text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-4 py-3">{children}</div>
    </SectionPanel>
  )
}

function MetricRow({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string
  value: string
  detail?: string
  tone?: 'neutral' | 'success' | 'warning'
}) {
  const toneClass =
    tone === 'success'
      ? 'text-success-text'
      : tone === 'warning'
        ? 'text-warning-text'
        : 'text-foreground'

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/70 py-2 last:border-0">
      <div className="min-w-0">
        <div className="text-caption text-muted-foreground">{label}</div>
        {detail ? (
          <div className="truncate text-[11px] leading-4 text-text-tertiary">{detail}</div>
        ) : null}
      </div>
      <div className={`text-right text-body-sm font-semibold ${toneClass}`}>{value}</div>
    </div>
  )
}

function StatusIcon({ check }: { check: SafetyCheck }) {
  if (check.passed) {
    return <CheckCircle2 className="size-4 text-success-text" />
  }
  if (check.severity === 'block') {
    return <XCircle className="size-4 text-destructive" />
  }
  return <CircleAlert className="size-4 text-warning-text" />
}

function planRiskBadgeVariant(risk: string) {
  if (risk === 'blocked') {
    return 'destructive' as const
  }
  if (risk === 'high') {
    return 'danger' as const
  }
  if (risk === 'medium') {
    return 'warning' as const
  }
  return 'success' as const
}

function safetyCheckClass(check: SafetyCheck) {
  if (check.passed) {
    return 'border-border bg-card'
  }
  if (check.severity === 'block' || check.severity === 'danger') {
    return 'border-danger-border bg-error-surface'
  }
  return 'border-warning-border bg-warning-surface'
}

function walletChainLabel(chainId: number | undefined) {
  if (!chainId) {
    return 'Not connected'
  }
  const network = Object.values(PUFFER_NETWORKS).find((item) => item.chainId === chainId)
  return network ? `${network.label} (${chainId})` : `Unknown chain (${chainId})`
}

function getStakeAsset(asset: AssetSymbol): PufferStakeAsset {
  if (asset === 'stETH' || asset === 'wstETH') {
    return asset
  }
  return 'ETH'
}

function getNetworkConfirmWord(isTestnet: boolean) {
  return isTestnet ? 'HOLESKY' : 'MAINNET'
}

function makeDemoTxHash(seed: string): `0x${string}` {
  const encoded = Array.from(seed)
    .map((char) => char.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
    .padEnd(64, '0')
    .slice(0, 64)

  return `0x${encoded}`
}

function formatBaseUnits(amount: string, decimals: number, maxFractionDigits = 6) {
  const value = BigInt(amount || '0')
  const base = 10n ** BigInt(decimals)
  const whole = value / base
  const fractional = value % base
  const renderedFraction = fractional
    .toString()
    .padStart(decimals, '0')
    .slice(0, maxFractionDigits)
    .replace(/0+$/, '')

  return `${whole.toString()}${renderedFraction ? `.${renderedFraction}` : ''}`
}

type DemoBalanceAsset = keyof typeof MOCK_WALLET.balances

function demoBalanceAssetForSymbol(symbol: string): DemoBalanceAsset | undefined {
  if (symbol in MOCK_WALLET.balances) {
    return symbol as DemoBalanceAsset
  }
  return undefined
}

function parsePositiveAmount(value: string) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? amount : 0
}

function preferredProviderId(providers: WalletProviderOption[]) {
  return (
    providers.find((provider) => provider.isImToken)?.id ??
    providers.find((provider) => provider.isMetaMask)?.id ??
    providers[0]?.id ??
    ''
  )
}

function PufferPilotWorkspace() {
  const [snapshot, setSnapshot] = useState<PufferSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [submittedPrompt, setSubmittedPrompt] = useState(DEFAULT_PROMPT)
  const [preferenceModel, setPreferenceModel] = useState<PreferenceModel>(EMPTY_PREFERENCE_MODEL)
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>('chat')
  const [appMode, setAppMode] = useState<AppMode>('demo')
  const [selectedNetworkId, setSelectedNetworkId] = useState<'holesky' | 'mainnet'>('holesky')
  const [autoRefreshLiveData, setAutoRefreshLiveData] = useState(true)
  const [demoBalances, setDemoBalances] = useState(MOCK_WALLET.balances)
  const [walletAccounts, setWalletAccounts] = useState<`0x${string}`[]>([])
  const [walletProviders, setWalletProviders] = useState<WalletProviderOption[]>([])
  const [selectedWalletProviderId, setSelectedWalletProviderId] = useState('')
  const [walletChainId, setWalletChainId] = useState<number | undefined>()
  const [walletBalanceWei, setWalletBalanceWei] = useState<bigint | null>(null)
  const [walletBalanceChainId, setWalletBalanceChainId] = useState<number | undefined>()
  const [pufEthBalanceWei, setPufEthBalanceWei] = useState<bigint | null>(null)
  const [testnetStatus, setTestnetStatus] = useState(
    'Demo Mode is ready. All actions run locally with funded mock assets.',
  )
  const [sdkGasEstimate, setSdkGasEstimate] = useState<string | null>(null)
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null)
  const [isWalletBusy, setIsWalletBusy] = useState(false)
  const [executionConfirmText, setExecutionConfirmText] = useState('')
  const [permitConfirmText, setPermitConfirmText] = useState('')
  const [aiEnabled, setAiEnabled] = useState(false)
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiSummary, setAiSummary] = useState('')
  const [aiStatus, setAiStatus] = useState(
    'Optional AI is off. The deterministic policy engine still runs.',
  )
  const [isAiBusy, setIsAiBusy] = useState(false)
  const [aggregatorApiKey, setAggregatorApiKey] = useState('')
  const [exchangeAmountInput, setExchangeAmountInput] = useState('0.3')
  const [aggregatorSellToken, setAggregatorSellToken] = useState<ZeroExSellTokenPreset>(
    ZERO_EX_SELL_TOKEN_PRESETS[0],
  )
  const [aggregatorCustomToken, setAggregatorCustomToken] = useState('')
  const [aggregatorQuote, setAggregatorQuote] = useState<AggregatorQuote | null>(null)
  const [aggregatorStatus, setAggregatorStatus] = useState(
    'Demo aggregator is local. Real 0x quotes require your own API key and Ethereum mainnet.',
  )
  const [isAggregatorBusy, setIsAggregatorBusy] = useState(false)
  const [addressCopyStatus, setAddressCopyStatus] = useState(
    'Copy the full contract address, then verify it before use.',
  )

  useEffect(() => {
    setPreferenceModel(loadPreferenceModel())
    getPufferSnapshot()
      .then((nextSnapshot) => setSnapshot(nextSnapshot))
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    if (!autoRefreshLiveData) {
      return
    }

    const intervalId = window.setInterval(() => {
      getPufferSnapshot().then((nextSnapshot) => setSnapshot(nextSnapshot))
    }, 30_000)

    return () => window.clearInterval(intervalId)
  }, [autoRefreshLiveData])

  const [walletRuntime, setWalletRuntime] = useState(() => detectWalletRuntime())

  const intent = useMemo(() => parseIntent(submittedPrompt), [submittedPrompt])
  const effectiveIntent = useMemo(
    () => ({
      ...intent,
      chain: selectedNetworkId,
      executionMode:
        appMode === 'real'
          ? ('wallet_prompt' as const)
          : intent.executionMode === 'readonly'
            ? ('readonly' as const)
            : ('simulation' as const),
    }),
    [intent, appMode, selectedNetworkId],
  )
  const activeNetwork = useMemo(() => getPufferNetwork(selectedNetworkId), [selectedNetworkId])
  const activePufferVault = useMemo(
    () => getPufferVaultContract(selectedNetworkId),
    [selectedNetworkId],
  )
  const selectedWalletProvider = useMemo(
    () =>
      walletProviders.find((provider) => provider.id === selectedWalletProviderId) ??
      walletProviders[0],
    [walletProviders, selectedWalletProviderId],
  )
  const activeWalletProvider =
    selectedWalletProvider?.provider ??
    (typeof window === 'undefined' ? undefined : window.ethereum)
  const stakeAsset = getStakeAsset(effectiveIntent.asset)
  const usesPermit = stakeAsset === 'stETH' || stakeAsset === 'wstETH'
  const connectedAddress = appMode === 'demo' ? MOCK_WALLET.address : walletAccounts[0]
  const connectedBalanceEth =
    walletBalanceWei !== null && walletBalanceChainId === activeNetwork.chainId
      ? weiToEthNumber(walletBalanceWei)
      : undefined
  const policyWalletBalanceEth = appMode === 'demo' ? demoBalances.ETH : (connectedBalanceEth ?? 0)
  const plannerContext = useMemo(
    () => ({
      snapshot: snapshot ?? {
        mode: 'fallback' as const,
        fetchedAt: '',
        source: '',
        rate: { pufEthPerEth: 0, ethPerPufEth: 0, totalAssets: 0, totalSupply: 0 },
        protocol: {
          lrtTotalUsd: 0,
          avsTotalUsd: 0,
          avsEigenTotalUsd: 0,
          unifiTotalUsd: 0,
          tvlPufferStaking: 0,
          stakingApy: 0,
          timestamp: '',
        },
        vaultApys: [],
        vaultTvl: { unifiEthVault: 0, unifiUsdVault: 0, unifiBtcVault: 0 },
        tokenPrices: [],
        warnings: ['Snapshot is loading.'],
      },
      walletBalanceEth: policyWalletBalanceEth,
      simulationFresh: true,
      networkId: selectedNetworkId,
    }),
    [snapshot, selectedNetworkId, policyWalletBalanceEth],
  )

  const rankedPlans = useMemo(() => {
    const basePlans = planIntent(effectiveIntent, plannerContext)
    return rankPlansWithPreferences(basePlans, preferenceModel, effectiveIntent.riskTolerance)
  }, [effectiveIntent, plannerContext, preferenceModel])

  const selectedPlan = rankedPlans[0]
  const selectedContractAddress =
    selectedPlan?.candidate.contractAddress ?? activePufferVault.address
  const selectedContract = useMemo(
    () => getKnownContract(selectedContractAddress),
    [selectedContractAddress],
  )
  const networkConfirmWord = getNetworkConfirmWord(activeNetwork.isTestnet)
  const realExecutionConfirmed = executionConfirmText.trim().toUpperCase() === networkConfirmWord
  const permitSignatureConfirmed =
    !usesPermit || permitConfirmText.trim().toUpperCase() === 'PERMIT'
  const safetyDecision = useMemo(
    () =>
      evaluateSafety({
        intent: effectiveIntent,
        candidate: selectedPlan?.candidate,
        snapshot: plannerContext.snapshot,
        walletBalanceEth: policyWalletBalanceEth,
        networkId: activeNetwork.id,
        appMode,
        allowMainnetWalletPrompt:
          appMode === 'real' && !activeNetwork.isTestnet && realExecutionConfirmed,
        permitSignatureConfirmed,
      }),
    [
      effectiveIntent,
      selectedPlan,
      plannerContext.snapshot,
      policyWalletBalanceEth,
      activeNetwork.id,
      activeNetwork.isTestnet,
      appMode,
      realExecutionConfirmed,
      permitSignatureConfirmed,
    ],
  )
  const preview = useMemo(
    () => estimatePufEthOutput(effectiveIntent.amount, plannerContext.snapshot.rate, stakeAsset),
    [effectiveIntent.amount, plannerContext.snapshot.rate, stakeAsset],
  )
  const explanation = useMemo(
    () => generatePlanExplanation(effectiveIntent, selectedPlan, safetyDecision),
    [effectiveIntent, selectedPlan, safetyDecision],
  )
  const failedSafetyChecks = safetyDecision.checks.filter((check) => !check.passed)
  const blockingSafetyChecks = failedSafetyChecks.filter(
    (check) => check.severity === 'block' || check.severity === 'danger',
  )
  const contractVerification = selectedContract ? 'Verified' : 'Unverified'
  const contractBadgeVariant = selectedContract ? 'success' : 'warning'
  const contractLabel = selectedContract?.label ?? 'Unverified contract'
  const displayedWalletChainId = appMode === 'demo' ? MOCK_WALLET.chainId : walletChainId
  const walletChain = walletChainLabel(displayedWalletChainId)
  const walletBalanceLabel =
    appMode === 'demo'
      ? `${formatNumber(demoBalances.ETH, 4)} ETH`
      : walletBalanceWei === null
        ? connectedAddress
          ? 'Reading balance'
          : 'Connect wallet'
        : `${formatWeiToEth(walletBalanceWei, 6)} ETH`
  const walletBalanceDetail =
    appMode === 'demo'
      ? 'Funded mock wallet, local only'
      : walletBalanceChainId
        ? `Native balance on ${walletChainLabel(walletBalanceChainId)}`
        : 'Uses eth_getBalance after wallet connection'
  const pufEthBalanceLabel =
    appMode === 'demo'
      ? `${formatNumber(demoBalances.pufETH, 6)} pufETH`
      : pufEthBalanceWei === null
        ? 'Connect wallet'
        : `${formatWeiToEth(pufEthBalanceWei, 6)} pufETH`
  const dappUrl =
    typeof window === 'undefined' ? 'https://pufferpilot-imtoken.vercel.app/' : window.location.href
  const imTokenDappLink = `https://connect.token.im/link/navigate/DappView?url=${encodeURIComponent(dappUrl)}`
  const txExplorerUrl = txHash ? `${activeNetwork.explorerUrl}/tx/${txHash}` : null
  const realExecutionReady =
    appMode === 'real' &&
    realExecutionConfirmed &&
    permitSignatureConfirmed &&
    !blockingSafetyChecks.length &&
    Boolean(connectedAddress) &&
    effectiveIntent.amount > 0
  const demoExecutionReady =
    appMode === 'demo' && !blockingSafetyChecks.length && effectiveIntent.amount > 0
  const selectedAggregatorDecimals = aggregatorSellToken.decimals
  const selectedAggregatorSellTokenAddress =
    aggregatorCustomToken.trim() || aggregatorSellToken.address
  const exchangeAmount = parsePositiveAmount(exchangeAmountInput)
  const mobileGridClass = (tab: MobileTab) => (activeMobileTab === tab ? '' : '!hidden lg:!grid')
  const mobilePanelClass = (tab: MobileTab) => (activeMobileTab === tab ? '' : '!hidden lg:!flex')

  const refreshData = async () => {
    setIsLoading(true)
    const nextSnapshot = await getPufferSnapshot()
    setSnapshot(nextSnapshot)
    setIsLoading(false)
  }

  const refreshWalletSnapshot = async (accounts = walletAccounts) => {
    if (!walletRuntime.hasProvider || !activeWalletProvider) {
      setWalletChainId(undefined)
      setWalletBalanceWei(null)
      setWalletBalanceChainId(undefined)
      setPufEthBalanceWei(null)
      return
    }

    const chainId = await readWalletChainId(activeWalletProvider)
    setWalletChainId(chainId)

    const walletAddress = accounts[0]
    if (!walletAddress) {
      setWalletBalanceWei(null)
      setWalletBalanceChainId(chainId)
      setPufEthBalanceWei(null)
      return
    }

    const nativeBalance = await readNativeBalance(walletAddress, activeWalletProvider)
    setWalletBalanceWei(nativeBalance ?? null)
    setWalletBalanceChainId(chainId)

    if (chainId === activeNetwork.chainId) {
      try {
        const pufEthBalance = await readSdkPufEthBalance({
          provider: activeWalletProvider,
          walletAddress,
          networkId: activeNetwork.id,
        })
        setPufEthBalanceWei(pufEthBalance)
      } catch {
        setPufEthBalanceWei(null)
      }
    } else {
      setPufEthBalanceWei(null)
    }
  }

  useEffect(() => {
    discoverInjectedWalletProviders().then((providers) => {
      setWalletProviders(providers)
      setSelectedWalletProviderId((current) =>
        providers.some((provider) => provider.id === current)
          ? current
          : preferredProviderId(providers),
      )
      setWalletRuntime(detectWalletRuntime(providers[0]?.provider))
    })
  }, [])

  useEffect(() => {
    const nextRuntime = detectWalletRuntime(activeWalletProvider)
    setWalletRuntime(nextRuntime)
  }, [activeWalletProvider])

  useEffect(() => {
    if (effectiveIntent.amount > 0) {
      setExchangeAmountInput(String(effectiveIntent.amount))
    }
  }, [effectiveIntent.amount])

  useEffect(() => {
    if (appMode !== 'real' || !walletRuntime.hasProvider || !activeWalletProvider) {
      return
    }

    requestPreviewOnlyAccounts(activeWalletProvider)
      .then((accounts) => {
        setWalletAccounts(accounts)
        return refreshWalletSnapshot(accounts)
      })
      .catch(() => refreshWalletSnapshot([]))

    const handleAccountsChanged = (payload: unknown) => {
      const accounts = Array.isArray(payload)
        ? payload.filter(
            (item): item is `0x${string}` => typeof item === 'string' && item.startsWith('0x'),
          )
        : []
      setWalletAccounts(accounts)
      setTestnetStatus(
        accounts[0]
          ? `Wallet account changed to ${shortenAddress(accounts[0])}.`
          : 'Wallet disconnected.',
      )
      void refreshWalletSnapshot(accounts)
    }

    const handleChainChanged = (payload: unknown) => {
      const nextChainId = parseChainId(payload)
      setWalletChainId(nextChainId)
      setSdkGasEstimate(null)
      setTxHash(null)
      setTestnetStatus(`Wallet network changed to ${walletChainLabel(nextChainId)}.`)
      void refreshWalletSnapshot(walletAccounts)
    }

    activeWalletProvider.on?.('accountsChanged', handleAccountsChanged)
    activeWalletProvider.on?.('chainChanged', handleChainChanged)

    return () => {
      activeWalletProvider.removeListener?.('accountsChanged', handleAccountsChanged)
      activeWalletProvider.removeListener?.('chainChanged', handleChainChanged)
    }
  }, [walletRuntime.hasProvider, appMode, activeNetwork.id, activeWalletProvider])

  const submitPrompt = () => {
    const nextIntent = parseIntent(prompt)
    setSubmittedPrompt(prompt)
    setSelectedNetworkId(nextIntent.chain)
    if (nextIntent.mentionsSecret) {
      setPrompt(nextIntent.sanitizedText)
    }
    setActiveMobileTab(nextIntent.mentionsSecret ? 'safety' : 'plan')
  }

  const recordFeedback = (reason: PreferenceEvent['reason']) => {
    if (!selectedPlan) {
      return
    }
    const contextKey = contextKeyFor(selectedPlan.candidate, effectiveIntent.riskTolerance)
    const event: PreferenceEvent = {
      contextKey,
      actionId: selectedPlan.candidate.action,
      reward: rewardForReason(reason),
      reason,
      timestamp: new Date().toISOString(),
    }
    const nextModel = updatePreferenceModel(preferenceModel, event)
    setPreferenceModel(nextModel)
    savePreferenceModel(nextModel)
  }

  const connectWalletForTestnet = async () => {
    if (appMode === 'demo') {
      setTestnetStatus(
        `Demo wallet connected: ${shortenAddress(MOCK_WALLET.address)} with ${formatNumber(demoBalances.ETH, 4)} ETH, ${formatNumber(demoBalances.stETH, 4)} stETH, and ${formatNumber(demoBalances.wstETH, 4)} wstETH.`,
      )
      return
    }

    const providers = await discoverInjectedWalletProviders()
    setWalletProviders(providers)
    if (!selectedWalletProviderId) {
      setSelectedWalletProviderId(preferredProviderId(providers))
    }
    const provider = activeWalletProvider ?? providers[0]?.provider
    const runtime = detectWalletRuntime(provider)
    setWalletRuntime(runtime)
    if (!runtime.hasProvider || !provider) {
      setTestnetStatus(
        'No injected wallet detected in this browser. Use imToken DApp Browser, MetaMask extension, Coinbase Wallet extension, or a mobile wallet browser. WalletConnect requires SDK setup.',
      )
      return
    }

    try {
      setIsWalletBusy(true)
      const accounts = await requestWalletAccounts(provider)
      setWalletAccounts(accounts)
      await refreshWalletSnapshot(accounts)
      setTestnetStatus(
        accounts[0]
          ? `Connected ${shortenAddress(accounts[0])} through ${selectedWalletProvider?.label ?? 'injected wallet'}. Wallet prompts are gated by ${networkConfirmWord} confirmation.`
          : 'Wallet returned no account.',
      )
    } catch (error) {
      setTestnetStatus(error instanceof Error ? error.message : 'Wallet connection was cancelled.')
    } finally {
      setIsWalletBusy(false)
    }
  }

  const switchToHolesky = async () => {
    if (appMode === 'demo') {
      setSelectedNetworkId('holesky')
      setTestnetStatus('Demo wallet is on Holesky testnet. No wallet RPC was called.')
      return
    }

    if (!walletRuntime.hasProvider || !activeWalletProvider) {
      setTestnetStatus('No injected wallet detected. Open in imToken or another EIP-1193 wallet.')
      return
    }

    try {
      setIsWalletBusy(true)
      await switchOrAddEthereumChain({
        chainIdHex: activeNetwork.chainIdHex,
        chainName: activeNetwork.label,
        rpcUrls: activeNetwork.rpcUrls,
        blockExplorerUrls: [activeNetwork.explorerUrl],
        nativeCurrency: activeNetwork.nativeCurrency,
        provider: activeWalletProvider,
      })
      await refreshWalletSnapshot(walletAccounts)
      setTestnetStatus(`Wallet network switched to ${activeNetwork.label}.`)
    } catch (error) {
      setTestnetStatus(error instanceof Error ? error.message : 'Network switch was cancelled.')
    } finally {
      setIsWalletBusy(false)
    }
  }

  const estimateHoleskyGas = async () => {
    if (appMode === 'demo') {
      const demoGas = usesPermit ? '186000' : '128000'
      setSdkGasEstimate(demoGas)
      setTestnetStatus(
        `Demo SDK estimate produced ${demoGas} gas units for ${stakeAsset} -> pufETH. No wallet RPC was called.`,
      )
      return
    }

    if (!activeNetwork.isTestnet && !realExecutionConfirmed) {
      setTestnetStatus('Type MAINNET before requesting a mainnet SDK estimate.')
      return
    }
    if (usesPermit && !permitSignatureConfirmed) {
      setTestnetStatus(
        'Type PERMIT before a stETH/wstETH route can request an exact Permit signature.',
      )
      return
    }
    if (!walletRuntime.hasProvider || !activeWalletProvider) {
      setTestnetStatus('No injected wallet provider is available for SDK gas estimate.')
      return
    }

    try {
      setIsWalletBusy(true)
      let [walletAddress] = walletAccounts
      if (!walletAddress) {
        const accounts = await requestWalletAccounts(activeWalletProvider)
        walletAddress = accounts[0]
        setWalletAccounts(accounts)
        await refreshWalletSnapshot(accounts)
      }
      if (!walletAddress) {
        setTestnetStatus('No wallet account selected.')
        return
      }
      if (walletChainId !== activeNetwork.chainId) {
        await switchOrAddEthereumChain({
          chainIdHex: activeNetwork.chainIdHex,
          chainName: activeNetwork.label,
          rpcUrls: activeNetwork.rpcUrls,
          blockExplorerUrls: [activeNetwork.explorerUrl],
          nativeCurrency: activeNetwork.nativeCurrency,
          provider: activeWalletProvider,
        })
        await refreshWalletSnapshot([walletAddress])
        const chainId = await readWalletChainId(activeWalletProvider)
        if (chainId !== activeNetwork.chainId) {
          throw new Error(`Wallet must be on ${activeNetwork.label} before deposit.`)
        }
      }
      const gas = await estimateSdkStakeGas({
        provider: activeWalletProvider,
        walletAddress,
        networkId: activeNetwork.id,
        asset: stakeAsset,
        amountEth: effectiveIntent.amount || 0.01,
        allowMainnet: !activeNetwork.isTestnet && realExecutionConfirmed,
      })
      setSdkGasEstimate(gas)
      await refreshWalletSnapshot([walletAddress])
      setTestnetStatus(
        `Puffer SDK ${activeNetwork.label} estimate returned ${gas} gas units. Wallet will show final fee before any transaction.`,
      )
    } catch (error) {
      setTestnetStatus(error instanceof Error ? error.message : 'SDK gas estimate failed.')
    } finally {
      setIsWalletBusy(false)
    }
  }

  const requestHoleskyDeposit = async () => {
    if (appMode === 'demo') {
      if (!demoExecutionReady) {
        setTestnetStatus(
          'Demo stake is blocked until a positive amount passes the safety checklist.',
        )
        return
      }

      const inputAsset = stakeAsset
      const available = demoBalances[inputAsset]
      if (effectiveIntent.amount > available) {
        setTestnetStatus(`Demo wallet only has ${formatNumber(available, 4)} ${inputAsset}.`)
        return
      }

      setDemoBalances((balances) => ({
        ...balances,
        [inputAsset]: Math.max((balances[inputAsset] ?? 0) - effectiveIntent.amount, 0),
        pufETH: balances.pufETH + preview.outputPufEth,
      }))
      const hash = makeDemoTxHash(`${inputAsset}-${effectiveIntent.amount}-${Date.now()}`)
      setTxHash(hash)
      setTestnetStatus(
        `Demo executed ${inputAsset} -> pufETH locally. Added ~${formatNumber(preview.outputPufEth, 6)} pufETH; no transaction was broadcast.`,
      )
      return
    }

    if (appMode !== 'real') {
      setTestnetStatus('Switch to Real Wallet Mode before requesting a wallet transaction.')
      return
    }
    if (!realExecutionConfirmed) {
      setTestnetStatus(`Type ${networkConfirmWord} before requesting this wallet transaction.`)
      return
    }
    if (usesPermit && !permitSignatureConfirmed) {
      setTestnetStatus('Type PERMIT before this stETH/wstETH route can ask for a Permit signature.')
      return
    }
    if (blockingSafetyChecks.length) {
      setTestnetStatus(`Blocked: ${blockingSafetyChecks[0]?.label}.`)
      return
    }
    if (!walletRuntime.hasProvider || !activeWalletProvider) {
      setTestnetStatus('No injected wallet provider is available for the transaction prompt.')
      return
    }
    if (effectiveIntent.amount <= 0) {
      setTestnetStatus(
        `Enter a positive ${stakeAsset} amount before requesting a wallet transaction.`,
      )
      return
    }

    try {
      setIsWalletBusy(true)
      let [walletAddress] = walletAccounts
      if (!walletAddress) {
        const accounts = await requestWalletAccounts(activeWalletProvider)
        walletAddress = accounts[0]
        setWalletAccounts(accounts)
        await refreshWalletSnapshot(accounts)
      }
      if (!walletAddress) {
        setTestnetStatus('No wallet account selected.')
        return
      }
      if (walletChainId !== activeNetwork.chainId) {
        await switchOrAddEthereumChain({
          chainIdHex: activeNetwork.chainIdHex,
          chainName: activeNetwork.label,
          rpcUrls: activeNetwork.rpcUrls,
          blockExplorerUrls: [activeNetwork.explorerUrl],
          nativeCurrency: activeNetwork.nativeCurrency,
          provider: activeWalletProvider,
        })
        await refreshWalletSnapshot([walletAddress])
        const chainId = await readWalletChainId(activeWalletProvider)
        if (chainId !== activeNetwork.chainId) {
          throw new Error(`Wallet must be on ${activeNetwork.label} before deposit.`)
        }
      }
      const hash = await executeSdkStake({
        provider: activeWalletProvider,
        walletAddress,
        networkId: activeNetwork.id,
        amountEth: effectiveIntent.amount,
        asset: stakeAsset,
        allowMainnet: !activeNetwork.isTestnet && realExecutionConfirmed,
      })
      setTxHash(hash)
      setTestnetStatus(
        `Wallet accepted ${activeNetwork.label} ${stakeAsset} deposit transaction ${shortenAddress(hash)}. Track it on the explorer.`,
      )
      await refreshWalletSnapshot([walletAddress])
    } catch (error) {
      setTestnetStatus(error instanceof Error ? error.message : 'Wallet transaction was rejected.')
    } finally {
      setIsWalletBusy(false)
    }
  }

  const copyContractAddress = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard is not available in this browser.')
      }
      await navigator.clipboard.writeText(selectedContractAddress)
      setAddressCopyStatus('Copied full contract address. Verify every character before use.')
    } catch (error) {
      setAddressCopyStatus(
        error instanceof Error ? error.message : 'Copy failed. Select the full address manually.',
      )
    }
  }

  const copyDappUrl = async () => {
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard is not available in this browser.')
      }
      await navigator.clipboard.writeText(dappUrl)
      setAddressCopyStatus('Copied DApp URL. Open it inside imToken Browser to use imToken wallet.')
    } catch (error) {
      setAddressCopyStatus(
        error instanceof Error ? error.message : 'Copy failed. Select the URL manually.',
      )
    }
  }

  const askOptionalAiAgent = async () => {
    if (!aiEnabled) {
      setAiStatus('Turn on Optional AI Agent first.')
      return
    }

    try {
      setIsAiBusy(true)
      setAiStatus('Calling your API key from this browser session.')
      const summary = await requestOptionalAiAgentSummary({
        apiKey: aiApiKey,
        intent: effectiveIntent,
        selectedPlan,
        pufEthRate: plannerContext.snapshot.rate.pufEthPerEth,
        protocolTvlUsd: plannerContext.snapshot.protocol.tvlPufferStaking,
      })
      setAiSummary(summary)
      setAiStatus('AI summary returned. Deterministic safety checks still control execution.')
    } catch (error) {
      setAiStatus(error instanceof Error ? error.message : 'Optional AI request failed.')
    } finally {
      setIsAiBusy(false)
    }
  }

  const requestDemoAggregatorQuote = () => {
    try {
      const sellAmount = tokenAmountToBaseUnits(exchangeAmount || 1, selectedAggregatorDecimals)
      const quote = getDemoAggregatorQuote(selectedAggregatorSellTokenAddress, sellAmount, {
        sellTokenSymbol: aggregatorSellToken.symbol,
        sellDecimals: selectedAggregatorDecimals,
      })
      setAggregatorQuote(quote)
      setAggregatorStatus(
        'Demo 0x-style quote generated locally. No network or wallet call was made.',
      )
    } catch (error) {
      setAggregatorStatus(error instanceof Error ? error.message : 'Demo quote failed.')
    }
  }

  const requestRealAggregatorQuote = async () => {
    if (appMode !== 'real') {
      setAggregatorStatus('Switch to Real Wallet Mode before requesting a live 0x quote.')
      return
    }
    if (activeNetwork.id !== 'mainnet') {
      setAggregatorStatus('0x any-token-to-pufETH quotes are enabled for Ethereum mainnet.')
      return
    }
    if (!connectedAddress) {
      setAggregatorStatus('Connect imToken or another injected wallet before requesting a quote.')
      return
    }

    try {
      setIsAggregatorBusy(true)
      const sellAmount = tokenAmountToBaseUnits(exchangeAmount || 1, selectedAggregatorDecimals)
      const quote = await getZeroExPufEthQuote({
        apiKey: aggregatorApiKey,
        taker: connectedAddress,
        sellToken: selectedAggregatorSellTokenAddress,
        sellAmountWei: sellAmount,
        chainId: activeNetwork.chainId,
      })
      setAggregatorQuote(quote)
      setAggregatorStatus(
        quote.needsAllowance
          ? '0x returned a quote, but exact allowance is required before a single swap transaction.'
          : '0x returned a transaction preview. Type MAINNET before asking the wallet to send it.',
      )
    } catch (error) {
      setAggregatorStatus(error instanceof Error ? error.message : '0x quote request failed.')
    } finally {
      setIsAggregatorBusy(false)
    }
  }

  const requestAggregatorTransaction = async () => {
    if (appMode === 'demo') {
      if (!aggregatorQuote) {
        requestDemoAggregatorQuote()
        return
      }
      const demoAsset = demoBalanceAssetForSymbol(aggregatorSellToken.symbol)
      if (!demoAsset) {
        setAggregatorStatus(
          'Demo swap supports preset demo assets only. Use real mode for custom tokens.',
        )
        return
      }
      if (exchangeAmount <= 0) {
        setAggregatorStatus('Enter a positive exchange amount before running the demo swap.')
        return
      }
      if ((demoBalances[demoAsset] ?? 0) < exchangeAmount) {
        setAggregatorStatus(
          `Demo wallet only has ${formatNumber(demoBalances[demoAsset] ?? 0, 6)} ${aggregatorSellToken.symbol}.`,
        )
        return
      }
      const pufEthOutput = Number(formatBaseUnits(aggregatorQuote.buyAmountWei, 18, 8))
      setDemoBalances((balances) => ({
        ...balances,
        [demoAsset]: Math.max((balances[demoAsset] ?? 0) - exchangeAmount, 0),
        pufETH: balances.pufETH + pufEthOutput,
      }))
      const hash = makeDemoTxHash(
        `swap-${aggregatorSellToken.symbol}-${exchangeAmount}-${Date.now()}`,
      )
      setTxHash(hash)
      setTestnetStatus(
        `Demo exchange completed locally: ${formatNumber(exchangeAmount, 6)} ${aggregatorSellToken.symbol} -> ~${formatNumber(pufEthOutput, 6)} pufETH.`,
      )
      setAggregatorStatus(
        'Demo exchange updated local balances. No broadcast, approval, or wallet RPC.',
      )
      return
    }
    if (!aggregatorQuote?.transaction) {
      setAggregatorStatus('Request a real 0x quote before sending an aggregator transaction.')
      return
    }
    if (aggregatorQuote.needsAllowance) {
      setAggregatorStatus(
        'Blocked: approve the exact sell amount in your wallet first, then refresh quote.',
      )
      return
    }
    if (activeNetwork.id !== 'mainnet' || !realExecutionConfirmed) {
      setAggregatorStatus('Type MAINNET on Ethereum mainnet before sending the 0x transaction.')
      return
    }
    if (!walletRuntime.hasProvider || !activeWalletProvider || !connectedAddress) {
      setAggregatorStatus(
        'No injected wallet provider is available for the aggregator transaction.',
      )
      return
    }
    if (walletChainId !== activeNetwork.chainId) {
      setAggregatorStatus(
        `Switch the wallet to ${activeNetwork.label} before sending the 0x transaction.`,
      )
      return
    }

    try {
      setIsAggregatorBusy(true)
      const hash = await sendWalletTransaction(
        {
          from: connectedAddress,
          to: aggregatorQuote.transaction.to,
          data: aggregatorQuote.transaction.data,
          value: aggregatorQuote.transaction.value ?? '0x0',
          gas: aggregatorQuote.transaction.gas,
          gasPrice: aggregatorQuote.transaction.gasPrice,
        },
        activeWalletProvider,
      )
      setTxHash(hash)
      setAggregatorStatus(`Wallet accepted 0x pufETH transaction ${shortenAddress(hash)}.`)
    } catch (error) {
      setAggregatorStatus(
        error instanceof Error ? error.message : 'Aggregator transaction rejected.',
      )
    } finally {
      setIsAggregatorBusy(false)
    }
  }

  const topVaults = [...plannerContext.snapshot.vaultApys].sort(
    (left, right) => right.apy - left.apy,
  )
  const modeBadge = plannerContext.snapshot.mode === 'live' ? 'Live Puffer API' : 'Fallback data'
  const aggregatorSellAmountLabel = aggregatorQuote
    ? `${formatBaseUnits(aggregatorQuote.sellAmountWei, selectedAggregatorDecimals)} ${aggregatorSellToken.symbol}`
    : 'No quote'
  const aggregatorBuyAmountLabel = aggregatorQuote
    ? `${formatBaseUnits(aggregatorQuote.buyAmountWei, 18)} pufETH`
    : 'No quote'

  return (
    <div className="h-dvh overflow-hidden bg-surface-cool text-foreground">
      <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col gap-3 p-3 pb-20 lg:pb-3">
        <header className="z-20 flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3 shadow-[var(--shadow-card)]">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
              <ShieldCheck className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-title-sm font-bold">PufferPilot</h1>
              <p className="truncate text-caption text-muted-foreground">
                Deterministic intent-to-stake wallet agent for Puffer and imToken
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ThemeToggle />
            <Badge variant={plannerContext.snapshot.mode === 'live' ? 'success' : 'neutral'}>
              {isLoading ? 'Refreshing' : modeBadge}
            </Badge>
            <Badge variant={aiEnabled ? 'primary' : 'neutral'}>
              {aiEnabled ? 'Optional AI on' : 'No LLM by default'}
            </Badge>
            <Badge variant={appMode === 'real' ? 'warning' : 'success'}>
              {appMode === 'real' ? 'Real Wallet Mode' : 'Demo Mode'}
            </Badge>
            <Badge variant={activeNetwork.isTestnet ? 'success' : 'neutral'}>
              {activeNetwork.label}
            </Badge>
            <Badge variant={walletRuntime.isImToken ? 'success' : 'neutral'}>
              {appMode === 'demo'
                ? 'Funded demo wallet'
                : walletRuntime.isImToken
                  ? 'imToken WebView'
                  : walletRuntime.isMetaMask
                    ? 'MetaMask'
                    : walletRuntime.isCoinbaseWallet
                      ? 'Coinbase Wallet'
                      : walletRuntime.mode === 'injected'
                        ? 'Injected wallet'
                        : 'No wallet provider'}
            </Badge>
            <Button size="sm" variant="outline" onClick={refreshData}>
              <RefreshCw className="size-4" />
              Refresh
            </Button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[minmax(280px,340px)_minmax(420px,1fr)_minmax(320px,400px)]">
          <div
            className={cn(
              'grid min-h-0 gap-3 overflow-hidden lg:grid-rows-[minmax(0,1fr)_minmax(0,0.95fr)]',
              mobileGridClass('vault'),
            )}
          >
            <Panel
              title="Puffer Market"
              subtitle={
                plannerContext.snapshot.fetchedAt
                  ? `Fetched ${new Date(plannerContext.snapshot.fetchedAt).toLocaleString()}`
                  : 'Loading public metrics'
              }
              icon={<DatabaseZap className="size-4" />}
            >
              <MetricRow
                label="pufETH per ETH"
                value={formatNumber(plannerContext.snapshot.rate.pufEthPerEth, 6)}
                detail="Exchange preview input"
                tone="success"
              />
              <MetricRow
                label="ETH per pufETH"
                value={formatNumber(plannerContext.snapshot.rate.ethPerPufEth, 6)}
                detail="Current reverse rate"
              />
              <MetricRow
                label="pufETH total assets"
                value={formatNumber(plannerContext.snapshot.rate.totalAssets, 2)}
                detail="API pufETH/rate field"
              />
              <MetricRow
                label="Protocol staking TVL"
                value={formatUsd(plannerContext.snapshot.protocol.tvlPufferStaking)}
                detail="protocol/tvl"
              />
              <MetricRow
                label="Staking APY"
                value={formatPercent(plannerContext.snapshot.protocol.stakingApy)}
                detail="Indicative public API APY"
                tone="success"
              />
              <MetricRow
                label="UniFi TVL"
                value={formatUsd(plannerContext.snapshot.protocol.unifiTotalUsd)}
                detail="Total across UniFi vaults"
              />
              {plannerContext.snapshot.warnings.map((warning) => (
                <div
                  key={warning}
                  className="mt-3 rounded-md border border-warning-border bg-warning-surface px-3 py-2 text-caption text-warning-text"
                >
                  {warning}
                </div>
              ))}
            </Panel>

            <Panel
              title="UniFi Scanner"
              subtitle="APY is ranked with TVL and risk gates"
              icon={<Gauge className="size-4" />}
            >
              <div className="space-y-2">
                {topVaults.map((vault) => {
                  const isHighApy = vault.apy > 8
                  return (
                    <div
                      key={vault.id}
                      className="rounded-md border border-border bg-card px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-body-sm font-semibold">{vault.label}</div>
                          <div className="truncate font-mono text-[11px] text-muted-foreground">
                            {shortenAddress(vault.tokenAddress)}
                          </div>
                        </div>
                        <Badge variant={isHighApy ? 'destructive' : 'success'}>
                          {formatPercent(vault.apy)}
                        </Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-caption text-muted-foreground">
                        <span>{vault.lookbackDays}d lookback</span>
                        <span className="text-right">
                          {isHighApy ? 'Needs warning' : 'Balanced'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Panel>
          </div>

          <div
            className={cn(
              'grid min-h-0 gap-3 overflow-hidden lg:grid-rows-[minmax(0,1.05fr)_minmax(0,0.95fr)]',
              activeMobileTab === 'chat' || activeMobileTab === 'plan' ? '' : '!hidden lg:!grid',
            )}
          >
            <Panel
              title="Intent Chat"
              subtitle="Describe the action; private material is blocked"
              icon={<MessageSquareText className="size-4" />}
              className={mobilePanelClass('chat')}
            >
              <div className="flex h-full min-h-[300px] flex-col gap-3">
                <div className="rounded-md border border-border bg-surface-cool px-3 py-3">
                  <div className="text-caption font-semibold text-muted-foreground">
                    User intent
                  </div>
                  <p className="mt-2 text-body-sm leading-6">{effectiveIntent.sanitizedText}</p>
                </div>

                {safetyDecision.redactions.length ? (
                  <Alert variant="destructive" className="border-danger-border bg-error-surface">
                    <ShieldX className="size-4" />
                    <AlertTitle>Secret material redacted</AlertTitle>
                    <AlertDescription>
                      Seed phrases, private keys, keystore JSON, and wallet passwords stay out of
                      the plan. This request is blocked before any wallet action.
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="grid gap-2 sm:grid-cols-2">
                  <MetricRow label="Asset" value={effectiveIntent.asset} />
                  <MetricRow
                    label="Amount"
                    value={
                      effectiveIntent.amount
                        ? `${formatNumber(effectiveIntent.amount, 4)} ${stakeAsset}`
                        : 'Read-only'
                    }
                  />
                  <MetricRow label="Risk" value={effectiveIntent.riskTolerance} />
                  <MetricRow label="Goal" value={effectiveIntent.goal.replaceAll('_', ' ')} />
                  <MetricRow label="Chain" value={activeNetwork.label} />
                  <MetricRow
                    label="Mode"
                    value={effectiveIntent.executionMode.replaceAll('_', ' ')}
                  />
                  <MetricRow label="SDK" value={activeNetwork.sdkChain} />
                </div>

                <div className="mt-auto space-y-2 border-t border-border pt-3">
                  <div className="grid gap-2 rounded-md bg-card px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-caption font-semibold">Execution mode</div>
                        <div className="text-[11px] text-muted-foreground">
                          Demo is fully local; Real Wallet Mode connects imToken or another wallet
                        </div>
                      </div>
                      <Badge variant={appMode === 'demo' ? 'success' : 'warning'}>
                        {appMode === 'demo' ? 'Demo Mode' : 'Real Wallet Mode'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={appMode === 'demo' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setAppMode('demo')
                          setExecutionConfirmText('')
                          setPermitConfirmText('')
                          setTxHash(null)
                          setTestnetStatus(
                            'Demo Mode is ready. All actions run locally with funded mock assets.',
                          )
                        }}
                      >
                        Demo Mode
                      </Button>
                      <Button
                        variant={appMode === 'real' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setAppMode('real')
                          setExecutionConfirmText('')
                          setPermitConfirmText('')
                          setTxHash(null)
                          setTestnetStatus(
                            'Real Wallet Mode is ready. Connect imToken or any EIP-1193 wallet.',
                          )
                        }}
                      >
                        Real Wallet Mode
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2 rounded-md bg-card px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-caption font-semibold">Network</div>
                        <div className="text-[11px] text-muted-foreground">
                          Holesky is safest for demos; mainnet requires MAINNET confirmation
                        </div>
                      </div>
                      <Switch
                        aria-label="Auto refresh live Puffer data"
                        checked={autoRefreshLiveData}
                        onCheckedChange={setAutoRefreshLiveData}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={selectedNetworkId === 'holesky' ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setSelectedNetworkId('holesky')
                          setExecutionConfirmText('')
                        }}
                      >
                        Holesky
                      </Button>
                      <Button
                        variant={selectedNetworkId === 'mainnet' ? 'secondary' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setSelectedNetworkId('mainnet')
                          setExecutionConfirmText('')
                        }}
                      >
                        Mainnet
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <Input
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      aria-label="PufferPilot intent"
                    />
                    <Button onClick={submitPrompt}>
                      Plan
                      <ArrowRight className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Panel>

            <Panel
              title="Agent Plan"
              subtitle="Best safe route first, risky routes stay gated"
              icon={<Brain className="size-4" />}
              className={mobilePanelClass('plan')}
            >
              <div className="space-y-3">
                {rankedPlans.map((plan, index) => (
                  <div
                    key={plan.candidate.id}
                    className={`rounded-md border px-3 py-3 ${index === 0 ? 'border-primary bg-surface-blue' : 'border-border bg-card'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-body-sm font-semibold">{plan.candidate.title}</div>
                        <div className="mt-1 text-caption text-muted-foreground">
                          Score {formatNumber(plan.score.total, 3)} · Complexity{' '}
                          {plan.candidate.complexity}/5
                        </div>
                      </div>
                      <Badge variant={planRiskBadgeVariant(plan.candidate.risk)}>
                        {plan.candidate.risk}
                      </Badge>
                    </div>
                    <ol className="mt-3 space-y-1">
                      {plan.candidate.steps.map((step) => (
                        <li key={step} className="flex gap-2 text-caption text-muted-foreground">
                          <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success-text" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}

                <div className="rounded-md border border-border bg-background px-3 py-3">
                  <div className="text-caption font-semibold text-muted-foreground">
                    Agent explanation
                  </div>
                  <ul className="mt-2 space-y-1">
                    {explanation.map((line) => (
                      <li key={line} className="text-caption leading-5 text-foreground">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="grid gap-2 rounded-md border border-border bg-card px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-caption font-semibold">Optional AI Agent</div>
                      <div className="text-[11px] text-muted-foreground">
                        Off by default. If enabled, you provide your own API key.
                      </div>
                    </div>
                    <Switch
                      aria-label="Optional AI Agent"
                      checked={aiEnabled}
                      onCheckedChange={(checked) => {
                        setAiEnabled(checked)
                        setAiSummary('')
                        setAiStatus(
                          checked
                            ? 'Optional AI enabled. Enter your own API key to request a summary.'
                            : 'Optional AI is off. The deterministic policy engine still runs.',
                        )
                      }}
                    />
                  </div>
                  {aiEnabled ? (
                    <>
                      <Input
                        value={aiApiKey}
                        onChange={(event) => setAiApiKey(event.target.value)}
                        aria-label="Optional AI API key"
                        placeholder="OpenAI API key, stored only in this browser state"
                        type="password"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={askOptionalAiAgent}
                        disabled={isAiBusy}
                      >
                        <Brain className="size-4" />
                        Ask optional AI
                      </Button>
                    </>
                  ) : null}
                  <div className="text-[11px] leading-4 text-muted-foreground">{aiStatus}</div>
                  {aiSummary ? (
                    <div className="whitespace-pre-wrap rounded-md border border-info-border bg-surface-blue px-3 py-2 text-caption text-primary">
                      {aiSummary}
                    </div>
                  ) : null}
                </div>
              </div>
            </Panel>
          </div>

          <div
            className={cn(
              'grid min-h-0 gap-3 overflow-hidden lg:grid-rows-[minmax(0,0.55fr)_minmax(380px,1.45fr)_minmax(0,0.75fr)_minmax(0,0.45fr)]',
              activeMobileTab === 'tx' || activeMobileTab === 'dex' || activeMobileTab === 'safety'
                ? ''
                : '!hidden lg:!grid',
            )}
          >
            <Panel
              title="Safety Checklist"
              subtitle={safetyDecision.decision.replaceAll('_', ' ')}
              icon={<LockKeyhole className="size-4" />}
              className={cn('lg:order-1', mobilePanelClass('safety'))}
            >
              <div className="space-y-2">
                {safetyDecision.redactions.length ? (
                  <Alert variant="destructive" className="border-danger-border bg-error-surface">
                    <ShieldX className="size-4" />
                    <AlertTitle>Secret material redacted</AlertTitle>
                    <AlertDescription>
                      Private wallet material was removed from the visible request. PufferPilot will
                      only explain the safety issue.
                    </AlertDescription>
                  </Alert>
                ) : null}
                {safetyDecision.checks.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'grid grid-cols-[auto_minmax(0,1fr)] gap-2 rounded-md border px-3 py-2',
                      safetyCheckClass(item),
                    )}
                  >
                    <StatusIcon check={item} />
                    <div className="min-w-0">
                      <div className="text-caption font-semibold">{item.label}</div>
                      <div className="mt-0.5 break-words text-[11px] leading-4 text-muted-foreground">
                        {item.evidence}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel
              title="Transaction Preview"
              subtitle={`${activeNetwork.label} ${stakeAsset} to pufETH with imToken-compatible wallet prompts`}
              icon={<CircleDollarSign className="size-4" />}
              className={cn('lg:order-3', mobilePanelClass('tx'))}
            >
              <div className="space-y-3">
                {blockingSafetyChecks.length ? (
                  <Alert variant="destructive" className="border-danger-border bg-error-surface">
                    <ShieldX className="size-4" />
                    <AlertTitle>Blocked by safety policy</AlertTitle>
                    <AlertDescription>
                      {blockingSafetyChecks[0]?.label}. No signature, Permit, approval, or
                      transaction can be requested from this screen.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="rounded-md border border-success-border bg-success-surface px-3 py-2 text-caption text-success-text">
                    Safety checks passed. Demo Mode runs locally; Real Wallet Mode requires wallet
                    connection, exact route review, and typed {networkConfirmWord} confirmation.
                  </div>
                )}
                {!activeNetwork.isTestnet && appMode === 'real' ? (
                  <div className="rounded-md border border-warning-border bg-warning-surface px-3 py-2 text-caption text-warning-text">
                    Ethereum mainnet can prompt a real wallet transaction only after MAINNET is
                    typed. Use small disposable amounts and verify the full contract address.
                  </div>
                ) : null}
                <MetricRow
                  label="Network"
                  value={`${activeNetwork.label} (${activeNetwork.chainId})`}
                />
                <MetricRow label="Wallet chain" value={walletChain} />
                <div className="rounded-md border border-border bg-card px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-caption font-semibold">Wallet connection</div>
                      <div className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                        Browser wallets appear only when they inject an EIP-1193 provider into this
                        page.
                      </div>
                    </div>
                    <Badge variant={walletRuntime.hasProvider ? 'success' : 'warning'}>
                      {walletProviders.length
                        ? `${walletProviders.length} provider${walletProviders.length > 1 ? 's' : ''}`
                        : 'No provider'}
                    </Badge>
                  </div>
                  {walletProviders.length ? (
                    <div className="mt-3 grid gap-2">
                      {walletProviders.map((provider) => (
                        <button
                          key={provider.id}
                          type="button"
                          onClick={() => {
                            setSelectedWalletProviderId(provider.id)
                            setWalletAccounts([])
                            setWalletBalanceWei(null)
                            setPufEthBalanceWei(null)
                            setWalletRuntime(detectWalletRuntime(provider.provider))
                            setTestnetStatus(
                              `Selected ${provider.label}. Click Connect to request accounts.`,
                            )
                          }}
                          className={cn(
                            'flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-caption transition-colors',
                            selectedWalletProvider?.id === provider.id
                              ? 'border-primary bg-surface-blue text-primary'
                              : 'border-border bg-background text-foreground hover:bg-accent',
                          )}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <PlugZap className="size-4 shrink-0" />
                            <span className="truncate font-semibold">{provider.label}</span>
                          </span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {provider.source === 'eip6963' ? 'EIP-6963' : 'Injected'}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 grid gap-2 text-[11px] leading-4 text-muted-foreground">
                      <div className="rounded-md border border-warning-border bg-warning-surface px-3 py-2 text-warning-text">
                        Codex / normal in-app browsers usually do not include MetaMask or imToken
                        injection. Open this URL in imToken DApp Browser, MetaMask mobile browser,
                        or desktop Chrome with the MetaMask extension installed.
                      </div>
                      <div className="rounded-md border border-border bg-background px-3 py-2">
                        WalletConnect is not bundled in this build because it requires a dedicated
                        SDK and Reown/WalletConnect project ID. This panel keeps that boundary
                        explicit instead of pretending QR connect exists.
                      </div>
                    </div>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={connectWalletForTestnet}>
                      <Wallet className="size-4" />
                      Connect selected
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        discoverInjectedWalletProviders().then((providers) => {
                          setWalletProviders(providers)
                          setSelectedWalletProviderId((current) =>
                            providers.some((provider) => provider.id === current)
                              ? current
                              : preferredProviderId(providers),
                          )
                          setWalletRuntime(detectWalletRuntime(providers[0]?.provider))
                          setTestnetStatus(
                            providers.length
                              ? `Detected ${providers.length} injected wallet provider${providers.length > 1 ? 's' : ''}.`
                              : 'No injected wallet provider detected in this browser.',
                          )
                        })
                      }}
                    >
                      <RefreshCw className="size-4" />
                      Detect wallets
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <a href={METAMASK_DOWNLOAD_URL} target="_blank" rel="noreferrer">
                        <ExternalLink className="size-4" />
                        MetaMask
                      </a>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <a href={WALLETCONNECT_DOCS_URL} target="_blank" rel="noreferrer">
                        <Cable className="size-4" />
                        WalletConnect
                      </a>
                    </Button>
                  </div>
                </div>
                <MetricRow
                  label="Connected wallet"
                  value={connectedAddress ? shortenAddress(connectedAddress) : 'Not connected'}
                  detail={
                    appMode === 'demo'
                      ? 'Funded mock wallet, no provider access'
                      : walletRuntime.isImToken
                        ? 'imToken injected provider'
                        : walletRuntime.isMetaMask
                          ? 'MetaMask injected provider'
                          : walletRuntime.isCoinbaseWallet
                            ? 'Coinbase Wallet injected provider'
                            : walletRuntime.hasProvider
                              ? 'EIP-1193 injected provider'
                              : 'No injected provider'
                  }
                />
                <MetricRow
                  label="Native balance"
                  value={walletBalanceLabel}
                  detail={walletBalanceDetail}
                  tone={connectedBalanceEth === undefined ? 'neutral' : 'success'}
                />
                <MetricRow
                  label="pufETH balance"
                  value={pufEthBalanceLabel}
                  detail={
                    appMode === 'demo'
                      ? 'Local demo balance updates after demo stake'
                      : 'Read from Puffer SDK after connection'
                  }
                />
                {appMode === 'demo' ? (
                  <MetricRow
                    label="Demo token assets"
                    value={`${formatNumber(demoBalances.stETH, 2)} stETH / ${formatNumber(demoBalances.wstETH, 2)} wstETH`}
                    detail={`${formatNumber(demoBalances.WETH, 2)} WETH and ${formatNumber(demoBalances.USDC, 0)} USDC available for DEX demo`}
                    tone="success"
                  />
                ) : null}
                <MetricRow label="Action type" value={selectedPlan?.candidate.title ?? 'Preview'} />
                <MetricRow
                  label="Input"
                  value={`${formatNumber(preview.inputEth, 4)} ${stakeAsset}`}
                />
                <MetricRow
                  label="Expected output"
                  value={`${formatNumber(preview.outputPufEth, 6)} pufETH`}
                  tone="success"
                />
                <MetricRow
                  label="Rate"
                  value={`${formatNumber(preview.exchangeRate, 6)} pufETH / ETH`}
                />
                <MetricRow label="Route" value={preview.route.join(' -> ')} />
                <MetricRow
                  label="Approval required"
                  value={selectedPlan?.candidate.requiredApprovals.length ? 'Yes' : 'No'}
                  tone={selectedPlan?.candidate.requiredApprovals.length ? 'warning' : 'success'}
                />
                <MetricRow
                  label="Gas"
                  value={
                    sdkGasEstimate
                      ? `${sdkGasEstimate} units`
                      : (selectedPlan?.candidate.estimatedGas ?? 'Wallet will quote final fee')
                  }
                />
                <MetricRow
                  label="Broadcast boundary"
                  value={appMode === 'demo' ? 'Disabled' : `${activeNetwork.label} wallet prompt`}
                  detail={
                    appMode === 'demo'
                      ? 'Demo actions never broadcast'
                      : 'Wallet remains the final approval screen'
                  }
                  tone={appMode === 'demo' ? 'success' : 'warning'}
                />
                <div
                  className={cn(
                    'rounded-md border px-3 py-2',
                    selectedContract
                      ? 'border-success-border bg-success-surface'
                      : 'border-warning-border bg-warning-surface',
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2 text-caption font-semibold">
                    <BadgeCheck
                      className={cn(
                        'size-4',
                        selectedContract ? 'text-success-text' : 'text-warning-text',
                      )}
                    />
                    <span>{contractLabel}</span>
                    <Badge variant={contractBadgeVariant}>{contractVerification}</Badge>
                  </div>
                  <div className="mt-2 break-all font-mono text-[11px] text-foreground">
                    {selectedContractAddress}
                  </div>
                  <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
                    Full address is shown for verification. The copy action never includes secret
                    material.
                  </p>
                </div>
                <div className="rounded-md border border-info-border bg-surface-blue px-3 py-2 text-caption text-primary">
                  {testnetStatus}
                </div>
                {txExplorerUrl ? (
                  <a
                    href={txExplorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 rounded-md border border-success-border bg-success-surface px-3 py-2 text-caption font-semibold text-success-text"
                  >
                    <span className="truncate">
                      View {activeNetwork.label} transaction {txHash ? shortenAddress(txHash) : ''}
                    </span>
                    <ExternalLink className="size-4 shrink-0" />
                  </a>
                ) : null}
                <div className="rounded-md border border-border bg-card px-3 py-2 text-caption text-muted-foreground">
                  Data used: public Puffer API, bundled Puffer SDK addresses, connected wallet
                  address, current chain, and wallet-read balances. No seed phrases, private keys,
                  or passwords are requested. Permit signatures are shown only for stETH/wstETH.
                </div>
                <div className="grid gap-2 rounded-md border border-warning-border bg-warning-surface px-3 py-2">
                  <div className="text-caption font-semibold text-warning-text">
                    Confirm real wallet operation
                  </div>
                  <div className="text-[11px] leading-4 text-warning-text">
                    Type {networkConfirmWord} to enable the Puffer SDK {stakeAsset} to pufETH wallet
                    prompt for {formatNumber(effectiveIntent.amount, 4)} {stakeAsset}. The wallet
                    remains the final approval screen.
                  </div>
                  <Input
                    value={executionConfirmText}
                    onChange={(event) => setExecutionConfirmText(event.target.value)}
                    aria-label={`${networkConfirmWord} execution confirmation`}
                    placeholder={networkConfirmWord}
                  />
                </div>
                {usesPermit ? (
                  <div className="grid gap-2 rounded-md border border-warning-border bg-warning-surface px-3 py-2">
                    <div className="text-caption font-semibold text-warning-text">
                      Permit signature gate
                    </div>
                    <div className="text-[11px] leading-4 text-warning-text">
                      Type PERMIT to acknowledge the wallet may show an EIP-2612 Permit signature
                      for the exact {formatNumber(effectiveIntent.amount, 4)} {stakeAsset} amount.
                    </div>
                    <Input
                      value={permitConfirmText}
                      onChange={(event) => setPermitConfirmText(event.target.value)}
                      aria-label="Permit confirmation"
                      placeholder="PERMIT"
                    />
                  </div>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  <Button asChild variant="outline" size="sm">
                    <a href={imTokenDappLink} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" />
                      Open imToken
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href={IMTOKEN_DOWNLOAD_URL} target="_blank" rel="noreferrer">
                      <Download className="size-4" />
                      Download imToken
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href={IMTOKEN_DAPP_BROWSER_HELP_URL} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" />
                      DApp Browser
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyDappUrl}>
                    <Copy className="size-4" />
                    Copy URL
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={connectWalletForTestnet}
                    disabled={isWalletBusy}
                  >
                    <Wallet className="size-4" />
                    {appMode === 'demo' ? 'Demo wallet' : 'Connect'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={switchToHolesky}
                    disabled={isWalletBusy}
                  >
                    Switch {activeNetwork.isTestnet ? 'Holesky' : 'Mainnet'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={copyContractAddress}>
                    <Copy className="size-4" />
                    Copy
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={estimateHoleskyGas}
                    disabled={isWalletBusy}
                  >
                    SDK estimate
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="col-span-2"
                    onClick={requestHoleskyDeposit}
                    disabled={
                      appMode === 'demo' ? !demoExecutionReady : !realExecutionReady || isWalletBusy
                    }
                  >
                    <SendHorizontal className="size-4" />
                    {appMode === 'demo'
                      ? `Run demo ${stakeAsset} stake`
                      : `Request ${activeNetwork.isTestnet ? 'Holesky' : 'Mainnet'} ${stakeAsset} deposit`}
                  </Button>
                </div>
                <div className="text-[11px] leading-4 text-muted-foreground">
                  {addressCopyStatus}
                </div>
              </div>
            </Panel>

            <Panel
              title="Exchange"
              subtitle="Advanced route: any token to pufETH through 0x"
              icon={<Repeat2 className="size-4" />}
              className={cn('lg:order-2', mobilePanelClass('dex'))}
            >
              <div className="space-y-3">
                <div className="rounded-xl border border-primary bg-surface-blue p-2">
                  <div className="grid gap-2">
                    <div className="rounded-lg border border-border bg-background px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-caption font-semibold text-muted-foreground">
                          From
                        </span>
                        <Badge variant={appMode === 'demo' ? 'success' : 'warning'}>
                          {appMode === 'demo' ? 'Local demo balance' : 'Real wallet balance'}
                        </Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                        <Input
                          value={exchangeAmountInput}
                          onChange={(event) => {
                            setExchangeAmountInput(event.target.value)
                            setAggregatorQuote(null)
                          }}
                          aria-label="Exchange sell amount"
                          inputMode="decimal"
                          placeholder="0.3"
                          className="h-10 bg-background text-title-sm font-semibold"
                        />
                        <Badge variant="primary">{aggregatorSellToken.symbol}</Badge>
                      </div>
                      {appMode === 'demo' ? (
                        <div className="mt-2 text-[11px] text-muted-foreground">
                          Available:{' '}
                          {formatNumber(
                            demoBalances[
                              demoBalanceAssetForSymbol(aggregatorSellToken.symbol) ?? 'ETH'
                            ] ?? 0,
                            aggregatorSellToken.decimals === 6 ? 2 : 6,
                          )}{' '}
                          {aggregatorSellToken.symbol}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex justify-center">
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-cta-sm)]">
                        <ArrowRight className="size-4 rotate-90" />
                      </div>
                    </div>
                    <div className="rounded-lg border border-success-border bg-success-surface px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-caption font-semibold text-success-text">To</span>
                        <Badge variant="success">pufETH</Badge>
                      </div>
                      <div className="mt-2 text-title-sm font-bold text-success-text">
                        {aggregatorBuyAmountLabel}
                      </div>
                      <div className="mt-1 text-[11px] text-success-text">
                        Route: {aggregatorSellToken.symbol} {'->'} 0x AllowanceHolder {'->'} pufETH
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-md border border-border bg-card px-3 py-2 text-caption text-muted-foreground">
                  Demo exchange is local and updates demo balances. Real 0x quotes use your own API
                  key in this browser session, target Ethereum mainnet pufETH, and never ask for
                  seed phrases.
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {ZERO_EX_SELL_TOKEN_PRESETS.map((token) => (
                    <Button
                      key={token.symbol}
                      variant={
                        aggregatorSellToken.symbol === token.symbol ? 'secondary' : 'outline'
                      }
                      size="sm"
                      onClick={() => {
                        setAggregatorSellToken(token)
                        setAggregatorCustomToken('')
                        setAggregatorQuote(null)
                      }}
                    >
                      {token.symbol}
                    </Button>
                  ))}
                </div>
                <Input
                  value={aggregatorCustomToken}
                  onChange={(event) => {
                    setAggregatorCustomToken(event.target.value)
                    setAggregatorQuote(null)
                  }}
                  aria-label="Custom sell token address"
                  placeholder="Optional custom sell token address"
                />
                <Input
                  value={aggregatorApiKey}
                  onChange={(event) => setAggregatorApiKey(event.target.value)}
                  aria-label="0x API key"
                  placeholder="0x API key for real quotes"
                  type="password"
                />
                <MetricRow label="Sell token" value={aggregatorSellToken.symbol} />
                <MetricRow
                  label="Sell amount"
                  value={aggregatorSellAmountLabel}
                  detail={`${exchangeAmount || 1} user units, ${selectedAggregatorDecimals} decimals`}
                />
                <MetricRow
                  label="Expected pufETH"
                  value={aggregatorBuyAmountLabel}
                  tone="success"
                />
                <MetricRow
                  label="Allowance"
                  value={aggregatorQuote?.needsAllowance ? 'Exact approval needed' : 'Ready / demo'}
                  tone={aggregatorQuote?.needsAllowance ? 'warning' : 'success'}
                />
                <MetricRow
                  label="Transaction target"
                  value={
                    aggregatorQuote?.transaction?.to
                      ? shortenAddress(aggregatorQuote.transaction.to)
                      : 'Quote first'
                  }
                  detail={aggregatorQuote?.source ?? '0x quote source appears after request'}
                />
                <div className="rounded-md border border-info-border bg-surface-blue px-3 py-2 text-caption text-primary">
                  {aggregatorStatus}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={requestDemoAggregatorQuote}>
                    Demo quote
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={requestRealAggregatorQuote}
                    disabled={isAggregatorBusy}
                  >
                    <KeyRound className="size-4" />
                    Real 0x quote
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href={ZERO_EX_DASHBOARD_URL} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" />
                      Get 0x key
                    </a>
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={requestAggregatorTransaction}
                    disabled={isAggregatorBusy || (appMode === 'real' && !aggregatorQuote)}
                  >
                    <SendHorizontal className="size-4" />
                    {appMode === 'demo' ? 'Run demo swap' : 'Send 0x tx'}
                  </Button>
                </div>
              </div>
            </Panel>

            <Panel
              title="Local Learning"
              subtitle={`${preferenceModel.events.length} feedback events stored locally`}
              icon={<Sparkles className="size-4" />}
              className={cn('lg:order-4', mobilePanelClass('safety'))}
            >
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => recordFeedback('useful')}>
                    <ThumbsUp className="size-4" />
                    Useful
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => recordFeedback('too_risky')}>
                    <ThumbsDown className="size-4" />
                    Too risky
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => recordFeedback('too_complex')}>
                    Too complex
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => recordFeedback('clear')}>
                    Clear
                  </Button>
                </div>
                <div className="rounded-md border border-border bg-card px-3 py-2 text-caption text-muted-foreground">
                  Preference learning only reorders policy-allowed plans. It never stores private
                  keys, seed phrases, or raw wallet secrets.
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setPreferenceModel(EMPTY_PREFERENCE_MODEL)
                    savePreferenceModel(EMPTY_PREFERENCE_MODEL)
                  }}
                >
                  Reset local learning
                </Button>
              </div>
            </Panel>
          </div>
        </div>

        <div
          aria-label="Mobile workspace sections"
          role="tablist"
          className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-6 gap-1 rounded-xl border border-border bg-background p-1 shadow-[var(--shadow-card-lg)] lg:hidden"
        >
          {MOBILE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeMobileTab === tab.id}
              className={cn(
                'h-11 rounded-lg px-1 text-[11px] font-semibold transition-colors',
                activeMobileTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-[var(--shadow-cta-sm)]'
                  : 'text-muted-foreground hover:bg-secondary',
              )}
              onClick={() => setActiveMobileTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export { PufferPilotWorkspace }
