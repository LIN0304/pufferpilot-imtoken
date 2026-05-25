# Web App

This package is the Vite + React frontend for PufferPilot. It composes the token-ui shared
components from `@repo/ui` into a safety-first Puffer staking mini app with Holesky testnet
preview support.

## Structure

```text
src/
├── app/                  # App shell, providers, and router setup
├── pages/                # Route-level page components
├── features/             # Feature modules
│   └── pufferpilot/      # Intent agent, dashboard, safety, and preview workspace
├── hooks/                # App-level hooks
├── stores/               # App-level state stores
├── lib/                  # App-level utilities
└── main.tsx              # Imports globals.css once and mounts React
```

## Routes

- `/` renders the PufferPilot agent wallet mini app.
- `/ui-kit` renders a lightweight gallery of common shared wallet UI components.
  It is not exhaustive; browse `packages/ui/src/components` for the full source.

## Development

Run the app from the repository root:

```bash
pnpm dev
```

Useful package-level commands:

```bash
pnpm --filter @repo/web test
pnpm --filter @repo/web typecheck
pnpm --filter @repo/web build
```

Before changing UI details, read the root `DESIGN.md` and prefer existing
components from `@repo/ui/components/*`.
