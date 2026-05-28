# Safety Policy

PufferPilot is not an auto-trading bot. It explains, previews, and blocks unsafe interactions.

## Hard Blocks

- Seed phrase, mnemonic, private key, keystore JSON, or wallet password input
- Prompt injection such as "ignore safety" or "sign silently"
- Unlimited approval requests
- Unsupported chain requests outside Holesky or Ethereum mainnet
- Unknown contract addresses outside the bundled Puffer allowlist for Puffer routes
- Amounts that spend the full wallet balance without a gas buffer
- Real wallet prompts from Demo Mode
- Mainnet wallet prompts without typed `MAINNET`
- stETH/wstETH Permit routes without typed `PERMIT`

## Preview Boundary

Demo Mode does not request signatures or transactions. Real Wallet Mode can request wallet prompts
only after the route is shown with:

- contract address and verification status
- function intent
- asset and amount
- expected pufETH output
- active network and wallet chain
- gas estimate or wallet-fee note
- approval or Permit requirement

## Network Boundary

- Holesky is the safest real-wallet demonstration path.
- Mainnet is available only in Real Wallet Mode and requires typed `MAINNET`.
- stETH/wstETH routes use PufferDepositor and require a visible Permit explanation plus typed
  `PERMIT`.
- 0x aggregator transactions are mainnet-only, require a user-supplied API key, and are blocked
  when exact allowance is missing.

## Never Requested

- `personal_sign`
- `eth_sign`
- seed phrases
- private keys
- wallet passwords

`eth_signTypedData` is treated as a Permit risk surface and is only reachable for exact
stETH/wstETH Permit routes after explicit user acknowledgement.
