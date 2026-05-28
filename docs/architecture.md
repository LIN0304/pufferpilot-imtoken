# PufferPilot Architecture

PufferPilot is a deterministic wallet mini app for Puffer staking and UniFi Vault exploration. It
uses the official `consenlabs/token-ui` React/Vite workspace as its UI base and keeps wallet
security boundaries explicit.

## Runtime Flow

1. The user writes a natural-language staking, vault, or DEX intent.
2. `intent-parser.ts` converts it into deterministic slots: asset, amount, risk tolerance,
   execution mode, goal, chain, and missing fields.
3. `puffer-api.ts` reads Puffer public hackathon metrics and falls back to bundled demo data if
   the API is unavailable.
4. `planner.ts` builds explainable candidates such as market review, ETH/stETH/wstETH to pufETH,
   UniFi Vault scan, and safety lesson.
5. `contract-addresses.ts` provides allowlisted Puffer mainnet and Holesky contracts.
6. `policy-engine.ts` runs wallet safety checks before any recommendation is executable.
7. `puffer-sdk-client.ts` dynamically imports `@pufferfinance/puffer-sdk` for SDK gas estimates,
   pufETH balance reads, and guarded wallet prompts on `Chain.Holesky` or `Chain.Mainnet`.
8. `zeroex-aggregator.ts` supports optional user-key 0x quotes for any-token-to-pufETH.
9. `ranker.ts` applies local preference weights only to policy-allowed candidates.
10. `pufferpilot-workspace.tsx` renders dashboard, mode selector, agent plan, safety checklist,
    transaction preview, Exchange panel, vault scanner, optional AI, and feedback controls.

## Mode Contract

- Demo Mode never touches `window.ethereum`. It uses `MOCK_WALLET`, local balances, fake tx hashes,
  local SDK estimates, and local 0x-style quotes.
- Real Wallet Mode is the only mode that calls wallet RPCs, Puffer SDK write helpers, or 0x.
- Real Wallet Mode can use imToken, MetaMask, or another injected EIP-1193/EIP-6963 provider.
  WalletConnect QR/session support is intentionally not bundled until a WalletConnect/Reown SDK and
  project ID are added.
- Optional AI is off by default. The deterministic planner and policy engine are always primary.

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

## Wallet Contract

- PufferVault Holesky: `0x9196830bB4c05504E0A8475A0aD566AceEB6BeC9`
- PufferDepositor Holesky: `0x824AC05aeb86A0aD770b8acDe0906d2d4a6c4A8c`
- PufferVault mainnet / pufETH: `0xD9A442856C234a39a81a089C06451EBAa4306a72`
- PufferDepositor mainnet: `0x4aa799c5dFc01ee7D790e3bf1a7C2257CE1DcefF`
- Wallet RPCs used by explicit button clicks: `eth_requestAccounts`, `eth_chainId`,
  `eth_getBalance`, `wallet_switchEthereumChain`, `wallet_addEthereumChain`,
  `eth_sendTransaction`, and Puffer SDK RPCs.
- Wallet RPCs never used: `personal_sign`, `eth_sign`.
- Permit RPC boundary: `eth_signTypedData` can only occur after typed `PERMIT` for stETH/wstETH
  depositor routes.
