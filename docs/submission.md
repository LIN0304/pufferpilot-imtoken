# Submission Notes

PufferPilot is a safety-first AI wallet agent for Puffer staking and UniFi Vault exploration.
It converts user intent into a clear, explainable, and risk-aware Puffer participation flow.

The app reads Puffer public metrics, previews ETH to pufETH and UniFi vault opportunities, checks
contract allowlists and approval risks, and learns user preferences locally through an on-device
contextual bandit.

PufferPilot does not ask for seed phrases, does not store private keys, does not send user data to
paid AI APIs, and does not broadcast transactions in demo mode.

For testnet execution, PufferPilot defaults to Holesky and uses the official Puffer SDK
`PufferClient` / `PufferClientHelpers` path for a user-triggered `depositETH` gas estimate. The
testnet route checks the Holesky PufferVault allowlist address and can request wallet network
switching, but it never calls `transact` or `eth_sendTransaction`.
