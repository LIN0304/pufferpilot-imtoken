# PufferPilot

PufferPilot is a safety-first AI wallet agent for Puffer staking and UniFi Vault exploration.
It converts natural-language intent into a clear, explainable, and risk-aware Puffer
participation flow.

The app reads public Puffer metrics, previews ETH/stETH/wstETH to pufETH and UniFi Vault
opportunities, checks contract allowlists and approval risks, and learns user preferences locally
through a small contextual bandit. It does not ask for seed phrases or store private keys. AI is
optional and off by default; if users want an AI explanation, they bring their own API key.

PufferPilot has two explicit modes:

- **Demo Mode**: fully local, funded mock wallet, executable demo stake and demo aggregator actions,
  no wallet RPCs and no broadcast.
- **Real Wallet Mode**: detects injected imToken/MetaMask/EIP-6963 wallets, lets users choose the
  provider, reads balances, switches Holesky/mainnet, estimates and requests Puffer SDK wallet
  prompts only after typed confirmation.

## What Is Built

- Puffer market dashboard: pufETH rate, total assets/supply, protocol TVL, staking APY, vault APY,
  vault TVL, and token prices.
- AI intent parser: deterministic Traditional Chinese / English slot extraction for asset, amount,
  risk, goal, and execution mode.
- Agent planner: explainable route scoring for read-only review, ETH/stETH/wstETH to pufETH, UniFi
  Vault scanning, and a 0x any-token-to-pufETH route.
- Safety policy engine: seed/private-key refusal, prompt-injection block, allowlist check,
  approval warning, Permit gate, gas buffer, Holesky testnet scope, and mainnet confirmation gate.
- Transaction preview: expected pufETH output, route, contract address, approval requirement, gas
  statement, network state, and broadcast boundary.
- imToken wallet operation: EIP-1193 and EIP-6963 provider detection, imToken/MetaMask provider
  selector, wallet account, chain, native balance, Holesky/mainnet switch helper, pufETH balance
  read, SDK gas estimate, and guarded `PufferVault.depositETH` / `PufferDepositor.depositStETH` /
  `PufferDepositor.depositWstETH` wallet prompts.
- Exchange area: dedicated From/To swap panel with demo balance updates and optional 0x quote.
- Advanced DEX aggregator: optional 0x quote with user-supplied API key for any-token-to-pufETH
  transaction preview, exact allowance warning, and guarded mainnet wallet send.
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

## How To Operate

Production URL:

```txt
https://pufferpilot-imtoken.vercel.app/
```

imToken download:

```txt
https://www.token.im/download
```

### Demo Mode

1. Keep `Demo Mode` selected.
2. Enter an intent such as `我有 0.3 ETH，想低風險參與 Puffer`.
3. Click `Plan`.
4. In `Transaction Preview`, click `Demo wallet`, `SDK estimate`, then `Run demo ETH stake`.
5. The local pufETH balance updates without wallet RPCs, gas, approvals, or broadcast.
6. In `Exchange`, click `Demo quote`, then `Run demo swap`.

### Real Wallet Mode

1. Open the site inside imToken DApp Browser or click `Open imToken`.
2. Select `Real Wallet Mode`.
3. Select `Holesky` for testnet or `Mainnet` for real Puffer contracts.
4. Choose the detected provider, click `Connect selected`, then `Switch Holesky` or
   `Switch Mainnet`.
5. Use an ETH, stETH, or wstETH intent.
6. Click `SDK estimate`.
7. Type `HOLESKY` or `MAINNET`. For stETH/wstETH, also type `PERMIT`.
8. Click the request button so imToken or the injected wallet shows the final confirmation.

### Advanced 0x Route

1. Select `Real Wallet Mode` and `Mainnet`.
2. Connect wallet and type `MAINNET` in the transaction panel.
3. In `Exchange`, paste your own 0x API key.
4. Choose or paste a sell token address.
5. Click `Real 0x quote`.
6. If exact allowance is already available, `Send 0x tx` asks the wallet to send the aggregator
   transaction. If allowance is missing, the UI blocks and tells the user to approve the exact
   sell amount first.

The app does not request `personal_sign` or `eth_sign`. `eth_signTypedData` is only reachable for
stETH/wstETH Permit routes after the user types `PERMIT`.

### Why A Wallet May Not Connect

Real Wallet Mode needs a wallet provider injected into the page. In a normal browser without an
extension, and in the Codex in-app browser, `window.ethereum` is usually absent, so no wallet can
answer `eth_requestAccounts`. imToken works when the page is opened inside the imToken DApp
Browser. MetaMask works in MetaMask Mobile Browser or desktop Chrome/Brave with the MetaMask
extension installed. WalletConnect is shown as an explicit setup boundary because a real QR/session
flow requires adding a WalletConnect/Reown SDK and project ID; this repo does not fake QR connect.

## Safety Boundary

PufferPilot is preview-first and demo-first by default. It never asks for wallet secrets and never
auto-broadcasts. Real wallet prompts require:

- Real Wallet Mode
- connected wallet
- selected network shown in the UI
- allowlisted Puffer contract or 0x quote target
- typed `HOLESKY` or `MAINNET`
- typed `PERMIT` for stETH/wstETH Permit routes

The app never calls:

- `personal_sign`
- `eth_sign`

`eth_signTypedData` is blocked except the exact Permit gate described above.

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
PufferClientHelpers + PufferClient on Chain.Holesky / Chain.Mainnet
```

## Docs

- [Architecture](docs/architecture.md)
- [Safety Policy](docs/safety-policy.md)
- [Zero-Cost Plan](docs/zero-cost-plan.md)
- [Demo Script](docs/demo-script.md)
- [Submission Notes](docs/submission.md)
