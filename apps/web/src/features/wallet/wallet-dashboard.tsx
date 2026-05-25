import { ActionBar, ActionButton } from '@repo/ui/components/action-bar'
import { AssetRow } from '@repo/ui/components/asset-row'
import { Badge } from '@repo/ui/components/badge'
import { Button } from '@repo/ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/card'
import { Progress } from '@repo/ui/components/progress'
import { StepCard } from '@repo/ui/components/step-card'
import { toast } from '@repo/ui/components/toast'
import { Link } from 'react-router'
import { checklistSteps, walletAssets } from './mock-data'

function TokenAvatar({ symbol }: { symbol: string }) {
  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-blue text-body-sm font-bold text-primary">
      {symbol.slice(0, 1)}
    </div>
  )
}

function Glyph({ children }: { children: string }) {
  return (
    <span className="flex size-5 items-center justify-center rounded-full bg-primary-soft text-caption font-bold text-primary">
      {children}
    </span>
  )
}

function WalletDashboard() {
  const handlePreviewToast = () => {
    toast.success('UI Kit is ready', {
      description: 'You can now build with shared wallet components.',
    })
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
      <section className="flex flex-col justify-center gap-6 rounded-3xl border border-border bg-surface-cool p-6 shadow-[var(--shadow-card)] sm:p-8 lg:p-10">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="primary" size="lg">
            Co-Creation
          </Badge>
          <Badge variant="neutral" size="lg">
            UI Kit
          </Badge>
        </div>

        <div className="max-w-2xl">
          <p className="mb-4 text-body-md font-semibold text-primary">Wallet UI Starter Kit</p>
          <h1 className="text-display-lg font-bold tracking-tight text-foreground">
            Build consistent wallet experiences with AI agents.
          </h1>
          <p className="mt-5 max-w-xl text-body-lg leading-7 text-muted-foreground">
            A minimal React template for co-creation participants. It ships shared design tokens,
            wallet-ready UI components, and a runnable demo surface.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-caption text-muted-foreground">Design tokens</div>
            <div className="mt-2 text-title-sm font-bold">Semantic</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-caption text-muted-foreground">Components</div>
            <div className="mt-2 text-title-sm font-bold">60+</div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-caption text-muted-foreground">Starter app</div>
            <div className="mt-2 text-title-sm font-bold">Vite</div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="hero" onClick={handlePreviewToast}>
            Preview toast
          </Button>
          <Button variant="outline" size="hero" asChild>
            <Link to="/ui-kit">Explore UI kit</Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-6">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Unified balance</CardTitle>
              <CardDescription>Mock data for starter-kit composition</CardDescription>
            </div>
            <Badge variant="success">Connected</Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="text-caption text-muted-foreground">Total assets</div>
              <div className="mt-2 text-display-lg font-bold tracking-tight">$7,276.40</div>
            </div>

            <ActionBar columns={2} className="xl:grid-cols-4">
              <ActionButton variant="primary" icon={<Glyph>+</Glyph>}>
                Buy
              </ActionButton>
              <ActionButton icon={<Glyph>-&gt;</Glyph>}>Send</ActionButton>
              <ActionButton icon={<Glyph>&lt;&gt;</Glyph>}>Swap</ActionButton>
              <ActionButton icon={<Glyph>&lt;-</Glyph>}>Receive</ActionButton>
            </ActionBar>

            <div className="space-y-2">
              {walletAssets.map((asset) => (
                <AssetRow
                  key={asset.symbol}
                  avatar={<TokenAvatar symbol={asset.symbol} />}
                  symbol={asset.symbol}
                  amount={asset.amount}
                  value={asset.value}
                  detail={asset.detail}
                  detailColor="var(--positive)"
                  className="bg-background"
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card id="agent-checklist">
          <CardHeader>
            <CardTitle>AI agent checklist</CardTitle>
            <CardDescription>Keep generated work aligned with the UI Kit.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={64} className="h-2" />
            <div className="grid gap-3">
              {checklistSteps.map((step, index) => (
                <StepCard
                  key={step.label}
                  icon={<Glyph>{String(index + 1)}</Glyph>}
                  label={step.label}
                  detail={step.detail}
                  state={step.state}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

export { WalletDashboard }
