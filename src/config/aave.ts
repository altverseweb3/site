export const chainNames: Record<number, string> = {
  1: "ethereum",
  137: "polygon",
  42161: "arbitrum",
  10: "optimism",
  43114: "avalanche",
  8453: "base",
  100: "gnosis",
  56: "bsc",
};

export type SupportedChainId =
  | 1
  | 137
  | 42161
  | 10
  | 43114
  | 8453
  | 100
  | 56
  | 11155111;
