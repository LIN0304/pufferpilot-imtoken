# PufferPilot

[English](./README.md) | [简体中文](./README.zh-CN.md)

PufferPilot 是一个安全优先的 AI 钱包 Agent，用自然语言把用户意图转成可解释、
可预览、可阻挡风险的 Puffer 参与路径。

它读取 Puffer 公共 API，展示 pufETH rate、协议 TVL、UniFi Vault APY/TVL，
并用确定性 intent parser、planner、安全 policy engine 与本地 contextual bandit
做出安全参与建议。项目不请求助记词、不保存私钥、不调用付费 AI API，也不会广播交易。

## 已实现内容

- Puffer 市场看板：pufETH rate、total assets/supply、staking APY、protocol TVL、vault APY/TVL。
- AI intent parser：支持中文和英文的资产、金额、风险偏好、目标与链路解析。
- Agent planner：对只读查看、ETH -> pufETH preview、UniFi Vault scan 做可解释排序。
- Safety policy engine：拒绝助记词/私钥、阻挡 prompt injection、检查官方 allowlist、限制 approval 风险。
- Holesky testnet preview：默认走 Puffer SDK 的 `Chain.Holesky`，支持钱包连接、切换/添加 Holesky、SDK gas estimate。
- Transaction preview：显示输入、预期 pufETH 输出、路线、合约地址、approval、gas、broadcast off。
- Local learning：用户反馈只影响安全候选项排序，不存储密钥或敏感资料。

## 运行

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm verify
```

前端位于 `apps/web`，根目录命令会通过 pnpm workspace 执行。

## 测试网路径

PufferPilot 默认使用 Holesky testnet 作为演示执行网络。Transaction Preview 面板提供：

1. `Connect`：请求 injected EIP-1193 钱包账户。
2. `Holesky`：请求 `wallet_switchEthereumChain` / `wallet_addEthereumChain`。
3. `SDK estimate`：使用 `@pufferfinance/puffer-sdk` 在 Holesky 上估算 `depositETH` gas。

即使进入测试网路径，应用也不会调用 `transact`、`eth_sendTransaction`、`personal_sign`、
`eth_signTypedData` 或 `eth_sign`。

