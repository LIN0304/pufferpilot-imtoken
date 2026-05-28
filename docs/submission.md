# Submission Notes

PufferPilot is a safety-first AI wallet mini app for Puffer staking, pufETH, UniFi Vault discovery,
and imToken-compatible wallet operation.

The app reads Puffer public metrics, previews ETH/stETH/wstETH to pufETH, checks contract
allowlists and approval or Permit risks, displays pufETH balance/rate, shows UniFi Vault
opportunities, and learns user preferences locally through an on-device contextual bandit.

## Mode Contract

- Demo Mode: funded mock wallet, executable local stake and Exchange flows, no wallet RPCs.
- Real Wallet Mode: detects imToken, MetaMask, or another EIP-1193/EIP-6963 injected wallet, reads
  balances, switches networks, estimates Puffer SDK gas, and can request wallet prompts only after
  typed confirmation.

## Base Challenge Coverage

- Connect wallet: EIP-1193/EIP-6963 provider detection, provider selector, header connect CTA, and
  explicit `eth_requestAccounts` on the selected injected provider.
- Stake ETH/stETH/wstETH to mint pufETH: official Puffer SDK `PufferVault.depositETH`,
  `PufferDepositor.depositStETH`, and `PufferDepositor.depositWstETH`.
- Display pufETH balance/rate: SDK balance read plus live Puffer public API rate.
- Show UniFi Vault opportunities: APY/TVL scanner with risk-first ranking.
- Guide safe participation: deterministic policy engine, allowlist, gas/approval/Permit warnings,
  confirmation gates, and secret refusal.

## Advanced Coverage

The central Exchange console supports local demo balance updates plus a user-supplied 0x API key for
mainnet any-token-to-pufETH quote and transaction preview. Presets cover ETH/WETH/stETH/wstETH,
common ETH LST/LRT assets, stablecoins, and WBTC, with a custom token address escape hatch. It blocks
transaction send when exact allowance is missing and requires `MAINNET` before the wallet can be
asked to send the aggregator transaction.

## Safety Statement

PufferPilot does not ask for seed phrases, does not store private keys, and does not auto-execute
transactions. Optional AI is off by default; users must provide their own API key, and deterministic
safety policy still controls execution. `personal_sign` and `eth_sign` are never requested.
`eth_signTypedData` is reachable only for exact stETH/wstETH Permit routes after the user types
`PERMIT`.
