import { Badge } from '@repo/ui/components/badge'
import { Button } from '@repo/ui/components/button'
import { Input } from '@repo/ui/components/input'
import { Switch } from '@repo/ui/components/switch'
import {
  ArrowRight,
  BadgeCheck,
  Brain,
  CheckCircle2,
  CircleAlert,
  CircleDollarSign,
  Copy,
  DatabaseZap,
  Gauge,
  LockKeyhole,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  XCircle,
} from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState } from 'react'
import type { PreferenceEvent, PreferenceModel, SafetyCheck } from '../../lib/agent/agent-types'
import { generatePlanExplanation } from '../../lib/agent/explanation-generator'
import { parseIntent } from '../../lib/agent/intent-parser'
import { planIntent } from '../../lib/agent/planner'
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
} from '../../lib/puffer/contract-addresses'
import { estimatePufEthOutput } from '../../lib/puffer/pufeth-calculator'
import { getPufferSnapshot } from '../../lib/puffer/puffer-api'
import { estimateSdkDepositGas } from '../../lib/puffer/puffer-sdk-client'
import type { PufferSnapshot } from '../../lib/puffer/types'
import { evaluateSafety } from '../../lib/safety/policy-engine'
import { formatNumber, formatPercent, formatUsd, shortenAddress } from '../../lib/utils/format'
import {
  detectWalletRuntime,
  readWalletChainId,
  requestWalletAccounts,
  switchOrAddEthereumChain,
} from '../../lib/wallet/ethereum-provider'
import { MOCK_WALLET } from '../../lib/wallet/mock-wallet'

const DEFAULT_PROMPT = '我有 0.3 ETH，想低風險參與 Puffer，不要真的送交易。'

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
    <section
      className={`flex min-h-0 flex-col rounded-lg border border-border bg-background shadow-[var(--shadow-card)] ${className}`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-blue text-primary">
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
    </section>
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

function PufferPilotWorkspace() {
  const [snapshot, setSnapshot] = useState<PufferSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [submittedPrompt, setSubmittedPrompt] = useState(DEFAULT_PROMPT)
  const [preferenceModel, setPreferenceModel] = useState<PreferenceModel>(EMPTY_PREFERENCE_MODEL)
  const [activeMobileTab, setActiveMobileTab] = useState('chat')
  const [simulateOnly, setSimulateOnly] = useState(true)
  const [walletAccounts, setWalletAccounts] = useState<`0x${string}`[]>([])
  const [walletChainId, setWalletChainId] = useState<number | undefined>()
  const [testnetStatus, setTestnetStatus] = useState('Holesky SDK preview is ready.')
  const [sdkGasEstimate, setSdkGasEstimate] = useState<string | null>(null)

  useEffect(() => {
    setPreferenceModel(loadPreferenceModel())
    getPufferSnapshot()
      .then((nextSnapshot) => setSnapshot(nextSnapshot))
      .finally(() => setIsLoading(false))
  }, [])

  const walletRuntime = useMemo(() => {
    if (typeof window === 'undefined') {
      return { hasProvider: false, isImToken: false, mode: 'mock' as const }
    }
    return detectWalletRuntime()
  }, [])

  const intent = useMemo(() => parseIntent(submittedPrompt), [submittedPrompt])
  const activeNetwork = useMemo(() => getPufferNetwork(intent.chain), [intent.chain])
  const activePufferVault = useMemo(() => getPufferVaultContract(intent.chain), [intent.chain])
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
      walletBalanceEth: MOCK_WALLET.balanceEth,
      simulationFresh: true,
      networkId: intent.chain,
    }),
    [snapshot, intent.chain],
  )

  const rankedPlans = useMemo(() => {
    const basePlans = planIntent(intent, plannerContext)
    return rankPlansWithPreferences(basePlans, preferenceModel, intent.riskTolerance)
  }, [intent, plannerContext, preferenceModel])

  const selectedPlan = rankedPlans[0]
  const selectedContract = useMemo(
    () =>
      getKnownContract(selectedPlan?.candidate.contractAddress ?? activePufferVault.address) ??
      activePufferVault,
    [selectedPlan, activePufferVault],
  )
  const safetyDecision = useMemo(
    () =>
      evaluateSafety({
        intent,
        candidate: selectedPlan?.candidate,
        snapshot: plannerContext.snapshot,
        walletBalanceEth: MOCK_WALLET.balanceEth,
        networkId: activeNetwork.id,
      }),
    [intent, selectedPlan, plannerContext.snapshot, activeNetwork.id],
  )
  const preview = useMemo(
    () => estimatePufEthOutput(intent.amount, plannerContext.snapshot.rate),
    [intent.amount, plannerContext.snapshot.rate],
  )
  const explanation = useMemo(
    () => generatePlanExplanation(intent, selectedPlan, safetyDecision),
    [intent, selectedPlan, safetyDecision],
  )

  const refreshData = async () => {
    setIsLoading(true)
    const nextSnapshot = await getPufferSnapshot()
    setSnapshot(nextSnapshot)
    setIsLoading(false)
  }

  useEffect(() => {
    if (!walletRuntime.hasProvider) {
      return
    }
    readWalletChainId()
      .then((chainId) => setWalletChainId(chainId))
      .catch(() => setWalletChainId(undefined))
  }, [walletRuntime.hasProvider])

  const submitPrompt = () => {
    setSubmittedPrompt(prompt)
    setActiveMobileTab('plan')
  }

  const recordFeedback = (reason: PreferenceEvent['reason']) => {
    if (!selectedPlan) {
      return
    }
    const contextKey = contextKeyFor(selectedPlan.candidate, intent.riskTolerance)
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
    if (!walletRuntime.hasProvider) {
      setTestnetStatus('No injected wallet detected. The mock Holesky route remains preview-only.')
      return
    }

    try {
      const accounts = await requestWalletAccounts()
      setWalletAccounts(accounts)
      const chainId = await readWalletChainId()
      setWalletChainId(chainId)
      setTestnetStatus(
        accounts[0]
          ? `Connected ${shortenAddress(accounts[0])}. No signature or transaction requested.`
          : 'Wallet returned no account.',
      )
    } catch (error) {
      setTestnetStatus(error instanceof Error ? error.message : 'Wallet connection was cancelled.')
    }
  }

  const switchToHolesky = async () => {
    if (!walletRuntime.hasProvider) {
      setTestnetStatus('No injected wallet detected. Open in imToken or another EIP-1193 wallet.')
      return
    }

    const holesky = getPufferNetwork('holesky')
    try {
      await switchOrAddEthereumChain({
        chainIdHex: holesky.chainIdHex,
        chainName: holesky.label,
        rpcUrls: holesky.rpcUrls,
        blockExplorerUrls: [holesky.explorerUrl],
        nativeCurrency: holesky.nativeCurrency,
      })
      const chainId = await readWalletChainId()
      setWalletChainId(chainId)
      setTestnetStatus(`Wallet network switched to ${holesky.label}.`)
    } catch (error) {
      setTestnetStatus(error instanceof Error ? error.message : 'Network switch was cancelled.')
    }
  }

  const estimateHoleskyGas = async () => {
    if (!activeNetwork.isTestnet) {
      setTestnetStatus('SDK gas estimate is locked to Holesky. Ask for testnet mode first.')
      return
    }
    if (!walletRuntime.hasProvider || !window.ethereum) {
      setTestnetStatus('No injected wallet provider is available for SDK gas estimate.')
      return
    }

    try {
      let [walletAddress] = walletAccounts
      if (!walletAddress) {
        const accounts = await requestWalletAccounts()
        walletAddress = accounts[0]
        setWalletAccounts(accounts)
      }
      if (!walletAddress) {
        setTestnetStatus('No wallet account selected.')
        return
      }
      if (walletChainId !== activeNetwork.chainId) {
        await switchToHolesky()
      }
      const gas = await estimateSdkDepositGas({
        provider: window.ethereum,
        walletAddress,
        networkId: 'holesky',
      })
      setSdkGasEstimate(gas)
      setTestnetStatus(`Puffer SDK Holesky estimate returned ${gas} gas units.`)
    } catch (error) {
      setTestnetStatus(error instanceof Error ? error.message : 'SDK gas estimate failed.')
    }
  }

  const topVaults = [...plannerContext.snapshot.vaultApys].sort(
    (left, right) => right.apy - left.apy,
  )
  const modeBadge = plannerContext.snapshot.mode === 'live' ? 'Live Puffer API' : 'Fallback data'

  return (
    <div className="min-h-screen bg-surface-cool text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-3 p-3">
        <header className="sticky top-0 z-20 flex min-h-14 flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background px-4 py-3 shadow-[var(--shadow-card)]">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
              <ShieldCheck className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-title-sm font-bold">PufferPilot</h1>
              <p className="truncate text-caption text-muted-foreground">
                AI intent-to-stake safety agent for pufETH and UniFi Vault previews
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={plannerContext.snapshot.mode === 'live' ? 'success' : 'neutral'}>
              {isLoading ? 'Refreshing' : modeBadge}
            </Badge>
            <Badge variant="primary">Demo mode</Badge>
            <Badge variant={activeNetwork.isTestnet ? 'success' : 'neutral'}>
              {activeNetwork.label}
            </Badge>
            <Badge variant={walletRuntime.isImToken ? 'success' : 'neutral'}>
              {walletRuntime.isImToken
                ? 'imToken WebView'
                : walletRuntime.mode === 'injected'
                  ? 'Injected wallet'
                  : 'Mock wallet'}
            </Badge>
            <Button size="sm" variant="outline" onClick={refreshData}>
              <RefreshCw className="size-4" />
              Refresh
            </Button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(280px,340px)_minmax(420px,1fr)_minmax(320px,400px)] lg:grid-rows-[minmax(280px,44vh)_minmax(280px,1fr)]">
          <div className="grid min-h-0 gap-3 lg:row-span-2 lg:grid-rows-[minmax(300px,1fr)_minmax(280px,0.9fr)]">
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

          <div className="grid min-h-0 gap-3 lg:row-span-2 lg:grid-rows-[minmax(340px,1fr)_minmax(280px,0.9fr)]">
            <Panel
              title="Intent Chat"
              subtitle="Rule-based parser, deterministic output"
              icon={<MessageSquareText className="size-4" />}
            >
              <div className="flex h-full min-h-[300px] flex-col gap-3">
                <div className="rounded-md border border-border bg-surface-cool px-3 py-3">
                  <div className="text-caption font-semibold text-muted-foreground">
                    User intent
                  </div>
                  <p className="mt-2 text-body-sm leading-6">{submittedPrompt}</p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <MetricRow label="Asset" value={intent.asset} />
                  <MetricRow
                    label="Amount"
                    value={intent.amount ? `${formatNumber(intent.amount, 4)} ETH` : 'Read-only'}
                  />
                  <MetricRow label="Risk" value={intent.riskTolerance} />
                  <MetricRow label="Goal" value={intent.goal.replaceAll('_', ' ')} />
                  <MetricRow label="Chain" value={activeNetwork.label} />
                  <MetricRow label="SDK" value={activeNetwork.sdkChain} />
                </div>

                <div className="mt-auto space-y-2 border-t border-border pt-3">
                  <div className="flex items-center justify-between gap-3 rounded-md bg-card px-3 py-2">
                    <div>
                      <div className="text-caption font-semibold">Simulation guard</div>
                      <div className="text-[11px] text-muted-foreground">
                        Broadcast remains disabled even when Holesky estimate is used
                      </div>
                    </div>
                    <Switch checked={simulateOnly} disabled onCheckedChange={setSimulateOnly} />
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
              subtitle="Explainable scoring and local preference ranker"
              icon={<Brain className="size-4" />}
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
                      <Badge variant={plan.candidate.risk === 'high' ? 'destructive' : 'success'}>
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
              </div>
            </Panel>
          </div>

          <div className="grid min-h-0 gap-3 lg:row-span-2 lg:grid-rows-[minmax(260px,0.95fr)_minmax(260px,1fr)_minmax(190px,0.7fr)]">
            <Panel
              title="Safety Checklist"
              subtitle={safetyDecision.decision.replaceAll('_', ' ')}
              icon={<LockKeyhole className="size-4" />}
            >
              <div className="space-y-2">
                {safetyDecision.checks.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 rounded-md border border-border bg-card px-3 py-2"
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
              subtitle={`${activeNetwork.label} ETH to pufETH preview, not broadcast`}
              icon={<CircleDollarSign className="size-4" />}
            >
              <div className="space-y-3">
                <div className="rounded-md border border-success-border bg-success-surface px-3 py-2 text-caption text-success-text">
                  Testnet-first preview. SDK estimate may call wallet read/estimate RPC, but
                  signing, Permit, and broadcast remain disabled.
                </div>
                <MetricRow
                  label="Network"
                  value={`${activeNetwork.label} (${activeNetwork.chainId})`}
                />
                <MetricRow
                  label="Wallet chain"
                  value={walletChainId ? `${walletChainId}` : 'Not connected'}
                />
                <MetricRow label="Input" value={`${formatNumber(preview.inputEth, 4)} ETH`} />
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
                      : (selectedPlan?.candidate.estimatedGas ?? 'Preview only')
                  }
                />
                <div className="rounded-md border border-border bg-card px-3 py-2">
                  <div className="flex items-center gap-2 text-caption font-semibold">
                    <BadgeCheck className="size-4 text-success-text" />
                    Official {selectedContract.label}
                  </div>
                  <div className="mt-2 break-all font-mono text-[11px] text-muted-foreground">
                    {selectedPlan?.candidate.contractAddress}
                  </div>
                </div>
                <div className="rounded-md border border-info-border bg-surface-blue px-3 py-2 text-caption text-primary">
                  {testnetStatus}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={connectWalletForTestnet}>
                    Connect
                  </Button>
                  <Button variant="outline" size="sm" onClick={switchToHolesky}>
                    Holesky
                  </Button>
                  <Button variant="outline" size="sm">
                    <Copy className="size-4" />
                    Copy
                  </Button>
                  <Button variant="secondary" size="sm" onClick={estimateHoleskyGas}>
                    SDK estimate
                  </Button>
                  <Button variant="outline" size="sm" className="col-span-2" disabled>
                    Broadcast off
                  </Button>
                </div>
              </div>
            </Panel>

            <Panel
              title="Local Learning"
              subtitle={`${preferenceModel.events.length} feedback events stored locally`}
              icon={<Sparkles className="size-4" />}
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

        <nav className="grid grid-cols-5 gap-1 rounded-lg border border-border bg-background p-1 shadow-[var(--shadow-card)] lg:hidden">
          {['chat', 'plan', 'tx', 'vault', 'safety'].map((tab) => (
            <button
              key={tab}
              type="button"
              className={`rounded-md px-2 py-2 text-caption font-semibold ${activeMobileTab === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
              onClick={() => setActiveMobileTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>
    </div>
  )
}

export { PufferPilotWorkspace }
