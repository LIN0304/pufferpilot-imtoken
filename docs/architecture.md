# PufferPilot Architecture

PufferPilot is a preview-only AI wallet mini app for Puffer staking and UniFi Vault exploration.
It uses the official `consenlabs/token-ui` React/Vite workspace as its UI base and keeps wallet
security boundaries explicit. The wallet execution path is testnet-first: Holesky is the default
Puffer SDK network, and Ethereum mainnet is used only for read-only public market data.

## Runtime Flow

1. The user writes a natural-language staking or vault intent.
2. `intent-parser.ts` converts it into deterministic slots: asset, amount, risk tolerance,
   execution mode, goal, chain, and missing fields.
3. `puffer-api.ts` reads Puffer public hackathon metrics and falls back to bundled demo data if
   the API is unavailable.
4. `planner.ts` builds explainable candidates such as read-only market review, ETH to pufETH
   simulation, or UniFi Vault scan.
5. `contract-addresses.ts` provides the Puffer mainnet allowlist plus the SDK Holesky PufferVault
   route (`0x9196830bB4c05504E0A8475A0aD566AceEB6BeC9`).
6. `policy-engine.ts` runs wallet safety checks before any recommendation is shown.
7. `puffer-sdk-client.ts` dynamically imports `@pufferfinance/puffer-sdk` for user-triggered
   Holesky gas estimates without calling `transact`.
8. `ranker.ts` applies local preference weights only to policy-allowed candidates.
9. `pufferpilot-workspace.tsx` renders dashboard, agent plan, safety checklist, transaction
   preview, vault scanner, and feedback controls on the first screen.

## Deterministic Agent Contract

There is no paid LLM dependency in the MVP. The agent uses deterministic rules, explainable
scores, and local preference learning. The preference model can reorder safe candidates but cannot
make a denied candidate executable.

## Data Contract

Primary demo base:

```txt
https://api-v2.puffer.fi/imtoken-hackathon
```

Endpoints used:

- `/pufeth/rate`
- `/vaults/apy`
- `/vaults/tvl`
- `/protocol/tvl`
- `/tokens/prices?addresses=...`

The app labels live versus fallback data in the command bar and warning surface.

## Testnet Wallet Contract

- Default intent chain: Holesky testnet
- SDK chain: `Chain.Holesky`
- PufferVault: `0x9196830bB4c05504E0A8475A0aD566AceEB6BeC9`
- Wallet RPCs used by explicit button clicks: `eth_requestAccounts`, `eth_chainId`,
  `wallet_switchEthereumChain`, `wallet_addEthereumChain`, and SDK gas estimate RPCs
- Wallet RPCs never used: `eth_sendTransaction`, `personal_sign`, `eth_signTypedData`, `eth_sign`
