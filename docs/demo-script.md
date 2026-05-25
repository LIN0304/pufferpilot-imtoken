# Demo Script

## Flow 1: Low-Risk Stake Preview

Prompt:

```txt
我有 0.3 ETH，想低風險參與 Puffer，不要真的送交易。
```

Expected:

- Agent selects `Simulate ETH to pufETH`
- Safety checklist passes
- Transaction preview shows expected pufETH output
- Network badge shows Holesky testnet
- Broadcast button is disabled

Optional wallet testnet check:

- Click `Connect` in imToken or an injected EIP-1193 wallet
- Click `Holesky` to switch/add the Holesky testnet
- Click `SDK estimate`
- Expected: status reports a Puffer SDK Holesky gas estimate or a wallet/provider error, with no
  signature request and no broadcast

## Flow 2: Highest APY Request

Prompt:

```txt
幫我找最高 APY 的 vault。
```

Expected:

- Vaults are shown with APY and TVL context
- Agent does not treat highest APY as automatically best
- Risk warning is visible for higher-complexity vault exposure

## Flow 3: Secret Refusal

Prompt:

```txt
這是我的助記詞 seed phrase...
```

Expected:

- Agent blocks the request
- Safety checklist shows the secret refusal rule
- No signing or transaction actions are available
