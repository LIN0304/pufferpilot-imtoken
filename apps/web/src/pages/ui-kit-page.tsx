import { ActionBar, ActionButton } from '@repo/ui/components/action-bar'
import { Alert, AlertDescription, AlertTitle } from '@repo/ui/components/alert'
import { AssetRow } from '@repo/ui/components/asset-row'
import { Avatar, AvatarFallback } from '@repo/ui/components/avatar'
import { Badge } from '@repo/ui/components/badge'
import { Button } from '@repo/ui/components/button'
import { ChecklistCard } from '@repo/ui/components/checklist-card'
import { Chip } from '@repo/ui/components/chip'
import { FeatureItem } from '@repo/ui/components/feature-item'
import { HoldingCard } from '@repo/ui/components/holding-card'
import { IconButton } from '@repo/ui/components/icon-button'
import { Input } from '@repo/ui/components/input'
import { SectionPanel } from '@repo/ui/components/section-panel'
import { Skeleton } from '@repo/ui/components/skeleton'
import { StatCell } from '@repo/ui/components/stat-cell'
import { StepCard } from '@repo/ui/components/step-card'
import { Switch } from '@repo/ui/components/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/components/tabs'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

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

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-caption font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5">
        {children}
      </div>
    </div>
  )
}

function UiKitPage() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
      <header className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-title-lg font-bold tracking-tight text-foreground">UI Kit Gallery</h1>
          <p className="mt-2 text-body-md text-muted-foreground">
            A partial showcase — see{' '}
            <code className="rounded bg-secondary px-1 py-0.5 text-body-sm font-medium">
              packages/ui
            </code>{' '}
            for the full list.
          </p>
        </div>
        <Button variant="outline" asChild className="mt-1 shrink-0">
          <Link to="/">← Back</Link>
        </Button>
      </header>

      <Group label="Button">
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
        </div>
      </Group>

      <Group label="Badge · Chip">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary">Primary</Badge>
          <Badge variant="success">Connected</Badge>
          <Badge variant="positive">+2.4%</Badge>
          <Badge variant="destructive">Error</Badge>
          <span className="mx-1 h-4 w-px bg-border" />
          <Chip selected>All assets</Chip>
          <Chip>Tokens</Chip>
          <Chip>NFTs</Chip>
        </div>
      </Group>

      <Group label="Action bar · Icon button">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <ActionBar columns={2} className="w-full sm:grid-cols-4 lg:max-w-xl">
            <ActionButton variant="primary" icon={<Glyph>+</Glyph>}>
              Buy
            </ActionButton>
            <ActionButton icon={<Glyph>-&gt;</Glyph>}>Send</ActionButton>
            <ActionButton icon={<Glyph>&lt;&gt;</Glyph>}>Swap</ActionButton>
            <ActionButton icon={<Glyph>&lt;-</Glyph>}>Receive</ActionButton>
          </ActionBar>
          <div className="flex items-center gap-2 lg:shrink-0">
            <IconButton icon={<Glyph>?</Glyph>} label="Help" variant="ghost" size="md" />
            <IconButton icon={<Glyph>!</Glyph>} label="Notifications" variant="muted" size="md" />
            <IconButton icon={<Glyph>0x</Glyph>} label="Account" variant="foreground" size="md" />
          </div>
        </div>
      </Group>

      <Group label="Asset row · Avatar">
        <div className="space-y-1">
          <AssetRow
            avatar={<TokenAvatar symbol="ETH" />}
            symbol="ETH"
            amount="1.28 ETH"
            value="$4,128.40"
            detail="+2.4%"
            detailColor="var(--positive)"
            className="bg-background"
          />
          <AssetRow
            avatar={<TokenAvatar symbol="USDC" />}
            symbol="USDC"
            amount="2,460 USDC"
            value="$2,460.00"
            detail="Stable"
            detailColor="var(--muted-foreground)"
            className="bg-background"
          />
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-background p-4">
          <Avatar size="lg">
            <AvatarFallback className="bg-surface-blue text-primary">VB</AvatarFallback>
          </Avatar>
          <div>
            <div className="text-body-md font-semibold">Vitalik Buterin</div>
            <div className="text-body-sm text-muted-foreground">0xd8dA...9604</div>
          </div>
        </div>
      </Group>

      <Group label="Holding card · Stat cell">
        <div className="grid gap-3 sm:grid-cols-2">
          <HoldingCard
            label="Main wallet"
            amount="$7,276.40"
            value="3 assets"
            change="+3.8%"
            pnl="+$264.80 today"
          />
          <HoldingCard
            label="Stable balance"
            amount="2,460"
            suffix="USDC"
            value="$2,460.00"
            change="Pegged"
          />
        </div>
        <SectionPanel variant="flat" padding="sm" className="grid grid-cols-3 gap-4">
          <StatCell label="24H PNL" value="+$264.80" valueClassName="text-positive" />
          <StatCell label="NETWORKS" value="3" />
          <StatCell label="RISK" value="Low" />
        </SectionPanel>
      </Group>

      <Group label="Input · Switch · Tabs">
        <Input aria-label="Search tokens" placeholder="Search tokens or addresses" />
        <div className="flex items-center justify-between rounded-xl bg-background p-4">
          <div>
            <div className="text-body-md font-semibold">Hide small balances</div>
            <div className="text-body-sm text-muted-foreground">Keep token lists focused.</div>
          </div>
          <Switch aria-label="Hide small balances" defaultChecked />
        </div>
        <Tabs defaultValue="assets">
          <TabsList>
            <TabsTrigger value="assets">Assets</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="assets" className="rounded-xl bg-background p-4 text-body-sm">
            Token-centric balance views stay scannable and calm.
          </TabsContent>
          <TabsContent value="activity" className="rounded-xl bg-background p-4 text-body-sm">
            Activity feeds reuse the same surface and spacing rhythm.
          </TabsContent>
          <TabsContent value="settings" className="rounded-xl bg-background p-4 text-body-sm">
            Settings controls remain secondary to wallet actions.
          </TabsContent>
        </Tabs>
      </Group>

      <Group label="Alert · Skeleton">
        <Alert>
          <AlertTitle>Demo mode</AlertTitle>
          <AlertDescription>
            This starter uses mocked wallet data until chain integration is requested.
          </AlertDescription>
        </Alert>
        <div className="space-y-3 rounded-xl bg-background p-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-2/3" />
        </div>
      </Group>

      <Group label="Guided flows">
        <div className="grid gap-3 sm:grid-cols-3">
          <StepCard
            icon={<Glyph>1</Glyph>}
            label="Read design rules"
            detail="Start with DESIGN.md before changing UI details."
            state="completed"
          />
          <StepCard
            icon={<Glyph>2</Glyph>}
            label="Compose components"
            detail="Use shared imports before creating app-specific UI."
            state="active"
          />
          <StepCard
            icon={<Glyph>3</Glyph>}
            label="Verify changes"
            detail="Run pnpm verify before handing work back."
            state="pending"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ChecklistCard
            tone="info"
            title="Import from leaf paths"
            description="Use @repo/ui/components/button, @repo/ui/components/card, and other component subpaths."
          />
          <FeatureItem>
            Keep wallet data mocked until chain integration is explicitly requested.
          </FeatureItem>
        </div>
      </Group>
    </div>
  )
}

export { UiKitPage }
