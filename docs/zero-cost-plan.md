# Zero-Cost Plan

PufferPilot is designed to demo without mainnet gas and without paid APIs.

- Puffer data is read from public demo endpoints with bundled fallback data.
- Demo Mode is fully local and uses funded mock ETH, stETH, wstETH, WETH, USDC, and pufETH.
- The default AI experience is deterministic local logic plus localStorage preference learning.
- Optional AI is user-owned: no API key is bundled or stored by the app.
- Holesky support includes wallet connection, network switching, SDK gas estimate, pufETH balance
  reads, and optional real ETH/stETH/wstETH wallet prompts.
- Mainnet support is guarded by typed `MAINNET` and should be used only with small disposable
  amounts.
- 0x aggregator support requires the user's own 0x API key.
- No smart contract is deployed.
- No wallet secrets are requested, stored, or transmitted.
- The project can be hosted as a static Vite app on Vercel or GitHub Pages.

The app still displays where gas, approval, Permit, or signing would be required in a real wallet
flow.
