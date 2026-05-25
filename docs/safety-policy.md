# Safety Policy

PufferPilot is not an auto-trading bot. It explains, previews, and blocks unsafe interactions.

## Hard Blocks

- Seed phrase, mnemonic, private key, keystore JSON, or wallet password input
- Prompt injection such as "ignore safety" or "sign silently"
- Unlimited approval requests in demo mode
- Unsupported chain requests outside the Holesky Puffer SDK route or read-only mainnet context
- Unknown contract addresses outside the bundled Puffer allowlist
- Amounts that spend the full mock wallet balance without a gas buffer

## Preview Boundary

The MVP does not call:

- `eth_sendTransaction`
- `personal_sign`
- `eth_signTypedData`
- `eth_sign`

Wallet connection, when available, is used only as identity/runtime context and for explicit
Holesky gas estimates. Transaction preview is separate from user confirmation, signing prompt, and
broadcast/result.

## Testnet Boundary

- Default execution route: Holesky testnet
- SDK route: `PufferClient` on `Chain.Holesky`
- Testnet contract: Holesky PufferVault `0x9196830bB4c05504E0A8475A0aD566AceEB6BeC9`
- Mainnet data: read-only public API metrics and allowlisted contract references
- Broadcast: disabled in all modes

## User-Facing Checks

Every recommended route shows:

- Contract address and allowlist status
- Expected output
- pufETH exchange rate
- Approval requirement
- Gas statement
- Active network and wallet chain
- Slippage/risk note
- Demo mode broadcast disabled state
