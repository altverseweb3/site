export const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const TELLER_ABI = [
  {
    inputs: [
      { name: "depositAsset", type: "address" },
      { name: "depositAmount", type: "uint256" },
      { name: "minimumMint", type: "uint256" },
    ],
    name: "deposit",
    outputs: [{ name: "mintedAmount", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
] as const;

export const TELLER_PAUSED_ABI = [
  "function isPaused() view returns (bool)",
  "function paused() view returns (bool)",
] as const;

export const VAULT_SHARES_PREVIEW_ABI = [
  {
    inputs: [
      { name: "depositAsset", type: "address" },
      { name: "depositAmount", type: "uint256" },
      { name: "boringVault", type: "address" },
      { name: "accountant", type: "address" },
    ],
    name: "previewDeposit",
    outputs: [{ name: "shares", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
