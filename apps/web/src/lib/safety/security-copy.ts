export const SECURITY_COPY = {
  seedRefusal:
    'PufferPilot will not process seed phrases, private keys, keystore JSON, or wallet passwords.',
  demoMode: 'Preview mode does not sign or broadcast transactions.',
  testnetWalletPrompt:
    'Holesky ETH, stETH, or wstETH to pufETH can request a wallet transaction only after UI and wallet confirmation.',
  mainnetWalletPrompt:
    'Mainnet wallet prompts require typed MAINNET confirmation, exact route details, and small disposable amounts.',
  approval:
    'Approvals grant token spending permission. This demo blocks unlimited approval requests.',
  permit:
    'stETH and wstETH routes require an exact Permit signature to PufferDepositor before the transaction.',
  allowlist: 'Contract addresses are checked against the bundled Puffer SDK allowlist.',
}
