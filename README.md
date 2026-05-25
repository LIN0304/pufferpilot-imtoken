# PufferPilot

PufferPilot is a safety-first AI wallet agent for Puffer staking and UniFi Vault exploration.
It converts natural-language intent into a clear, explainable, and risk-aware Puffer
participation flow.

The demo reads public Puffer metrics, previews ETH to pufETH and UniFi Vault opportunities,
checks contract allowlists and approval risks, and learns user preferences locally through a small
contextual bandit. It does not ask for seed phrases, does not store private keys, does not use paid
AI APIs, and does not broadcast transactions in demo mode. The execution preview is testnet-first:
Holesky is the default Puffer SDK route, while mainnet Puffer API data is read-only market context.

## What Is Built

- Puffer market dashboard: pufETH rate, total assets/supply, protocol TVL, staking APY, vault APY,
  vault TVL, and token prices.
- AI intent parser: deterministic Traditional Chinese / English slot extraction for asset, amount,
  risk, goal, and execution mode.
- Agent planner: explainable route scoring for read-only review, ETH to pufETH simulation, and
  UniFi Vault scanning.
- Safety policy engine: seed/private-key refusal, prompt-injection block, allowlist check,
  approval warning, gas buffer, Holesky testnet scope, and demo-mode broadcast boundary.
- Transaction preview: expected pufETH output, route, contract address, approval requirement, gas
  statement, testnet network state, and broadcast disabled state.
- Testnet wallet preview: EIP-1193 wallet detection, Holesky switch/add-network helper, and
  `@pufferfinance/puffer-sdk` gas estimate path for `PufferVault.depositETH`.
- Local preference learning: explicit feedback changes future ranking for safe candidates only.
- Validation: Vitest coverage for parser, planner, policy, API fallback, preference ranking, and
  server render.

## Commands

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm verify
```

The web app runs from `apps/web` through the root workspace command.

## Testnet Run Path

PufferPilot defaults intent execution to Holesky because the Puffer SDK quick start uses
`Chain.Holesky` for browser wallet flows. In the transaction preview panel:

1. Use `Connect` inside imToken or another injected EIP-1193 wallet.
2. Use `Holesky` to request `wallet_switchEthereumChain` / `wallet_addEthereumChain`.
3. Use `SDK estimate` to run the Puffer SDK Holesky gas-estimate path.

The app still never calls `transact`, `eth_sendTransaction`, `personal_sign`, `eth_signTypedData`,
or `eth_sign`.

## Safety Boundary

PufferPilot is preview-only by default. The MVP never calls:

- `eth_sendTransaction`
- `personal_sign`
- `eth_signTypedData`
- `eth_sign`

Wallet runtime detection and Holesky estimate are included for imToken/injected-provider context,
but real signing and broadcast are intentionally out of scope for this zero-cost demo.

## Data Provenance

The demo uses:

```txt
https://api-v2.puffer.fi/imtoken-hackathon
```

If the live API is unavailable, the app falls back to bundled mock data and labels that state in
the UI. Public API metrics are used for dashboard and preview context, not as a guarantee that any
route should be executed.

SDK alignment:

```txt
@pufferfinance/puffer-sdk
PufferClientHelpers + PufferClient on Chain.Holesky
```

## Docs

- [Architecture](docs/architecture.md)
- [Safety Policy](docs/safety-policy.md)
- [Zero-Cost Plan](docs/zero-cost-plan.md)
- [Demo Script](docs/demo-script.md)
- [Submission Notes](docs/submission.md)
