# Demo Script

## Flow 1: Demo Mode Full Run

Prompt:

```txt
我有 0.3 ETH，想低風險參與 Puffer，先用 Demo Mode 完整跑一次。
```

Expected:

- `Demo Mode` is selected.
- Agent selects `Simulate ETH to pufETH`.
- Safety checklist passes.
- Transaction preview shows funded mock ETH/stETH/wstETH/pufETH assets.
- Click `Demo wallet`, `SDK estimate`, then `Run demo ETH stake`.
- Expected pufETH balance increases locally. No wallet RPC, gas, approval, Permit, or broadcast.
- In `Exchange`, the From/To swap panel is visible. Click `Demo quote`, then `Run demo swap`.
- Expected demo sell-token balance decreases and demo pufETH balance increases locally.

## Flow 2: Real imToken Wallet

Prompt:

```txt
我有 0.01 ETH，想在 Holesky 用 imToken 真實連錢包操作 Puffer，先安全檢查。
```

Expected:

- Select `Real Wallet Mode`.
- Open `https://pufferpilot-imtoken.vercel.app/` in imToken DApp Browser, or click `Open imToken`.
- Choose the detected imToken provider and click `Connect selected`.
- Click `Switch Holesky`.
- Click `SDK estimate`.
- Type `HOLESKY`.
- Click `Request Holesky ETH deposit`.
- Expected: imToken or the injected wallet shows the Holesky `depositETH` transaction prompt.
  Rejecting it is safe; approving it uses only Holesky ETH.

## Flow 3: stETH / wstETH Permit Gate

Prompt:

```txt
我有 0.05 stETH，想在 Holesky 轉成 pufETH。
```

Expected:

- Agent routes through `PufferDepositor`.
- Safety checklist blocks until `PERMIT` is typed.
- Transaction preview explains the exact Permit signature before any wallet prompt.

## Flow 4: Advanced 0x Route

Expected:

- Select `Real Wallet Mode` and `Mainnet`.
- Connect wallet and type `MAINNET`.
- In `Exchange`, choose WETH/stETH/wstETH/USDC or paste a token address.
- Paste your own 0x API key.
- Click `Real 0x quote`.
- If allowance is needed, the UI blocks transaction send and asks for exact allowance first.
- If allowance is already available, `Send 0x tx` opens the wallet transaction prompt.

## Flow 5: Highest APY Request

Prompt:

```txt
幫我找最高 APY 的 vault。
```

Expected:

- Vaults are shown with APY and TVL context.
- Agent does not treat highest APY as automatically best.
- Risk warning is visible for higher-complexity vault exposure.

## Flow 6: Secret Refusal

Prompt:

```txt
這是我的助記詞 seed phrase...
```

Expected:

- Agent blocks the request.
- Safety checklist shows the secret refusal rule.
- No signing or transaction actions are available.
