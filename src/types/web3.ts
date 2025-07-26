// types/web3.ts

import { Transaction, VersionedTransaction } from "@solana/web3.js";

export interface WalletInfo {
  type: WalletType; // Static Enum to type/identify the wallet
  name: string; // human-readable name of the wallet e.g. "MetaMask"
  icon?: string; // will be an svg imported from /public
  address: string; // users wallet address, can seamlessly change during the session
  chainId: number; // the currently connected chain on the wallet
}

export enum WalletType {
  REOWN_EVM = "REOWN_EVM",
  REOWN_SOL = "REOWN_SOL",
  SUIET_SUI = "SUIET_SUI",
}

export type MayanChainName =
  | "solana"
  | "ethereum"
  | "bsc"
  | "polygon"
  | "avalanche"
  | "arbitrum"
  | "optimism"
  | "base"
  | "aptos"
  | "sui"
  | "unichain";

export type Token = {
  id: string;
  name: string;
  ticker: string;
  icon: string;
  address: string;
  decimals: number;
  chainId: number;
  stringChainId: string;
  userBalance?: string;
  userBalanceUsd?: string;
  priceUsd?: string;
  isWalletToken?: boolean;
  customToken?: boolean;
  alwaysLoadPrice?: boolean;
  isNativeGas?: boolean;
  isNativeWrapped?: boolean;
  isL2Token?: boolean;
};

export type Chain = {
  id: string;
  name: string;
  chainName: string;
  mayanName: MayanChainName;
  alchemyNetworkName: Network;
  nativeGasToken: {
    symbol: string;
    address: string;
    decimals: number;
  };
  nativeWrappedToken?: {
    symbol: string;
    address: string;
    decimals: number;
  };
  l2Token?: {
    symbol: string;
    address: string;
    decimals: number;
  };
  icon: string;
  brandedIcon: string;
  chainTokenSymbol: string;
  currency: string;
  backgroundColor: string;
  backgroundGradient?: string;
  fontColor: string;
  rpcUrls?: string[];
  explorerUrl?: string;
  chainId: number;
  mayanChainId: number;
  decimals: number;
  testnet?: boolean;
  l2: boolean;
  gasDrop: number;
  walletType: WalletType;
};

export type SectionKey = "swap" | "earn" | "lend";

export interface Web3StoreState {
  version: number;
  connectedWallets: Array<Omit<WalletInfo, "provider">>;

  // Replace single state with keyed integrations
  swapIntegrations: Record<string, SwapStateForSection>;
  activeSwapSection: SectionKey;

  // Token management (remains the same)
  tokensByCompositeKey: Record<string, Token>;
  tokensByChainId: Record<number, Token[]>;
  tokensByAddress: Record<number, Record<string, Token>>;
  allTokensList: Token[];
  tokensLoading: boolean;
  tokensError: string | null;
  tokenBalancesByWallet: Record<string, Record<string, string>>;
  tokenPricesUsd: Record<string, string>;

  aaveChain: Chain;

  // Wallet actions (remain the same)
  addWallet: (wallet: WalletInfo) => void;
  removeWallet: (walletType: WalletType) => void;
  updateWalletAddress: (walletType: WalletType, address: string) => void;
  updateWalletChainId: (walletType: WalletType, chainId: number) => void;
  disconnectAll: () => void;
  getWalletsOfType: (walletType?: WalletType) => WalletInfo[];
  getWalletByChain: (chain: Chain) => WalletInfo | null;
  isWalletTypeConnected: (walletType: WalletType) => boolean;
  getWalletByType: (walletType: WalletType) => WalletInfo | null;

  // New integration-specific actions
  getSwapStateForSection: () => SwapStateForSection;
  initializeSwapStateForSection: () => void;
  setActiveSwapSection: (sectionKey: SectionKey) => void;
  setSourceChain: (chain: Chain) => void;
  setDestinationChain: (chain: Chain) => void;
  swapChains: () => void;
  setSourceToken: (token: Token | null) => void;
  setDestinationToken: (token: Token | null) => void;
  setSlippageValue: (value: "auto" | string) => void;
  setReceiveAddress: (address: string | null) => void;
  setGasDrop: (gasDrop: number) => void;

  // Helper methods for backward compatibility and convenience
  getWalletBySourceChain: () => WalletInfo | null;
  getWalletByDestinationChain: () => WalletInfo | null;

  // Token management (remains largely the same)
  loadTokens: () => Promise<void>;
  getTokensForChain: (chainId: number) => Token[];
  updateTokenBalances: (
    chainId: number,
    userAddress: string,
    balances: TokenBalance[],
  ) => void;
  updateTokenPrices: (priceResults: TokenPriceResult[]) => void;
  addCustomToken: (token: Token) => void;
  setTokensLoading: (loading: boolean) => void;
  setAaveChain: (chain: Chain) => void;
}

export enum Network {
  ETH_MAINNET = "eth-mainnet",
  /** @deprecated */
  ETH_GOERLI = "eth-goerli",
  ETH_SEPOLIA = "eth-sepolia",
  ETH_HOLESKY = "eth-holesky",
  OPT_MAINNET = "opt-mainnet",
  /** @deprecated */
  OPT_GOERLI = "opt-goerli",
  OPT_SEPOLIA = "opt-sepolia",
  ARB_MAINNET = "arb-mainnet",
  /** @deprecated */
  ARB_GOERLI = "arb-goerli",
  ARB_SEPOLIA = "arb-sepolia",
  MATIC_MAINNET = "polygon-mainnet",
  /** @deprecated */
  MATIC_MUMBAI = "polygon-mumbai",
  MATIC_AMOY = "polygon-amoy",
  ASTAR_MAINNET = "astar-mainnet",
  POLYGONZKEVM_MAINNET = "polygonzkevm-mainnet",
  /** @deprecated */
  POLYGONZKEVM_TESTNET = "polygonzkevm-testnet",
  POLYGONZKEVM_CARDONA = "polygonzkevm-cardona",
  BASE_MAINNET = "base-mainnet",
  /** @deprecated */
  BASE_GOERLI = "base-goerli",
  BASE_SEPOLIA = "base-sepolia",
  ZKSYNC_MAINNET = "zksync-mainnet",
  ZKSYNC_SEPOLIA = "zksync-sepolia",
  SHAPE_MAINNET = "shape-mainnet",
  SHAPE_SEPOLIA = "shape-sepolia",
  LINEA_MAINNET = "linea-mainnet",
  LINEA_SEPOLIA = "linea-sepolia",
  FANTOM_MAINNET = "fantom-mainnet",
  FANTOM_TESTNET = "fantom-testnet",
  ZETACHAIN_MAINNET = "zetachain-mainnet",
  ZETACHAIN_TESTNET = "zetachain-testnet",
  ARBNOVA_MAINNET = "arbnova-mainnet",
  BLAST_MAINNET = "blast-mainnet",
  BLAST_SEPOLIA = "blast-sepolia",
  MANTLE_MAINNET = "mantle-mainnet",
  MANTLE_SEPOLIA = "mantle-sepolia",
  SCROLL_MAINNET = "scroll-mainnet",
  SCROLL_SEPOLIA = "scroll-sepolia",
  GNOSIS_MAINNET = "gnosis-mainnet",
  GNOSIS_CHIADO = "gnosis-chiado",
  BNB_MAINNET = "bnb-mainnet",
  BNB_TESTNET = "bnb-testnet",
  AVAX_MAINNET = "avax-mainnet",
  AVAX_FUJI = "avax-fuji",
  CELO_MAINNET = "celo-mainnet",
  CELO_ALFAJORES = "celo-alfajores",
  METIS_MAINNET = "metis-mainnet",
  OPBNB_MAINNET = "opbnb-mainnet",
  OPBNB_TESTNET = "opbnb-testnet",
  BERACHAIN_BARTIO = "berachain-bartio",
  SONEIUM_MAINNET = "soneium-mainnet",
  SONEIUM_MINATO = "soneium-minato",
  WORLDCHAIN_MAINNET = "worldchain-mainnet",
  WORLDCHAIN_SEPOLIA = "worldchain-sepolia",
  ROOTSTOCK_MAINNET = "rootstock-mainnet",
  ROOTSTOCK_TESTNET = "rootstock-testnet",
  FLOW_MAINNET = "flow-mainnet",
  FLOW_TESTNET = "flow-testnet",
  ZORA_MAINNET = "zora-mainnet",
  ZORA_SEPOLIA = "zora-sepolia",
  FRAX_MAINNET = "frax-mainnet",
  FRAX_SEPOLIA = "frax-sepolia",
  POLYNOMIAL_MAINNET = "polynomial-mainnet",
  POLYNOMIAL_SEPOLIA = "polynomial-sepolia",
  CROSSFI_MAINNET = "crossfi-mainnet",
  CROSSFI_TESTNET = "crossfi-testnet",
  APECHAIN_MAINNET = "apechain-mainnet",
  APECHAIN_CURTIS = "apechain-curtis",
  LENS_SEPOLIA = "lens-sepolia",
  GEIST_MAINNET = "geist-mainnet",
  GEIST_POLTER = "geist-polter",
  LUMIA_PRISM = "lumia-prism",
  LUMIA_TESTNET = "lumia-testnet",
  UNICHAIN_MAINNET = "unichain-mainnet",
  SONIC_MAINNET = "sonic-mainnet",
  SONIC_BLAZE = "sonic-blaze",
  XMTP_TESTNET = "xmtp-testnet",
  ABSTRACT_TESTNET = "abstract-testnet",
  DEGEN_MAINNET = "degen-mainnet",
  INK_MAINNET = "ink-mainnet",
  INK_SEPOLIA = "ink-sepolia",
  SOLANA_MAINNET = "solana-mainnet",
}

export interface TokenBalance {
  contractAddress: string;
  tokenBalance: string;
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
  logo?: string;
  totalSupply?: string;
}

export interface TokenPrice {
  currency: string;
  value: string;
  lastUpdatedAt: string;
}

export interface TokenAddressInfo {
  network: Network;
  address: string;
}

export interface TokenPriceResult {
  network: Network;
  address: string;
  prices: TokenPrice[];
  error: string | null;
}

// you can thank our linting for this...
type EthereumMethod =
  | "eth_chainId"
  | "eth_accounts"
  | "eth_requestAccounts"
  | "eth_sendTransaction"
  | "eth_sign"
  | "eth_signTransaction"
  | "eth_signTypedData"
  | "eth_signTypedData_v4"
  | "wallet_switchEthereumChain"
  | "wallet_addEthereumChain"
  | "personal_sign"
  | "net_version"
  | "eth_getBalance"
  | string;

type EthereumParam =
  | string
  | number
  | boolean
  | null
  | Array<string | number | boolean | null | Record<string, unknown>>
  | Record<string, unknown>;

type EthereumResult =
  | string
  | string[]
  | boolean
  | number
  | Record<string, unknown>
  | null;

export interface Eip1193Provider {
  request(args: {
    method: EthereumMethod;
    params?: EthereumParam[];
  }): Promise<EthereumResult>;
}

export type ChainNamespace = "eip155" | "solana" | "polkadot" | "bip122";

export interface SolanaSigner {
  publicKey: string;
  signTransaction: (
    transaction: Transaction | VersionedTransaction,
  ) => Promise<Transaction | VersionedTransaction>;
  signAllTransactions?: (
    transactions: (Transaction | VersionedTransaction)[],
  ) => Promise<(Transaction | VersionedTransaction)[]>;
  signMessage?: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
}

export interface SolanaTokenBalance {
  pubkey: string;
  mint: string;
  owner: string;
  amount: string;
  decimals: number;
  uiAmount: number;
  uiAmountString: string;
  isNative?: boolean;
}

// Extended TokenBalance for Solana compatibility
export interface EnhancedTokenBalance extends TokenBalance {
  decimals?: number;
  uiAmount?: number;
  uiAmountString?: string;
  pubkey?: string;
  owner?: string;
  isNative?: boolean;
  rawAmount?: string;
}

export interface SwapStatus {
  id: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "REFUNDED";
  clientStatus: string;
  trader: string;
  sourceChain: string;
  destChain: string;
  fromTokenSymbol: string;
  toTokenSymbol: string;
  fromAmount: string;
  toAmount: string;
  steps: Array<{
    title: string;
    status: string;
    type: string;
  }>;
  completedAt?: string;
  txs: Array<{
    txHash: string;
    goals: string[];
    scannerUrl: string;
  }>;
}

export interface SwapTrackingOptions {
  pollInterval?: number; // ms, default 5000
  maxRetries?: number; // default 120 (10 minutes with 5s interval)
  onStatusUpdate?: (status: SwapStatus) => void;
  onComplete?: (status: SwapStatus) => void;
  onError?: (error: Error) => void;
}

export interface SwapStateForSection {
  sourceChain: Chain;
  destinationChain: Chain;
  sourceToken: Token | null;
  destinationToken: Token | null;
  transactionDetails: {
    slippage: "auto" | string;
    receiveAddress: string | null;
    gasDrop: number;
  };
}

export type SerializedToken = {
  id: string;
  name: string;
  ticker: string;
  icon: string;
  address: string;
  decimals: number;
  chainId: number;
  userBalance?: string;
  userBalanceUsd?: string;
  isWalletToken?: boolean;
  alwaysLoadPrice?: boolean;
  isNativeGas?: boolean;
  isNativeWrapped?: boolean;
  isL2Token?: boolean;
} | null;

export type SerializedSwapStateForSection = {
  sourceChain: Chain;
  destinationChain: Chain;
  sourceToken: SerializedToken;
  destinationToken: SerializedToken;
  transactionDetails: {
    slippage: "auto" | string;
    receiveAddress: string | null;
    gasDrop: number;
  };
};

export interface UserWallets {
  evm?: string;
  solana?: string;
  sui?: string;
}

export interface SwapData {
  trader: string;
  sourceTxHash: string;
  sourceChain: string;
  swapChain: string;
  destChain: string;
  fromAmount: string;
  fromTokenAddress: string;
  fromTokenChain: string;
  fromTokenSymbol: string;
  fromTokenLogoUri: string;
  fromTokenPrice: number;
  toTokenPrice: number;
  toTokenAddress: string;
  toTokenChain: string;
  toTokenSymbol: string;
  toTokenLogoUri: string;
  destAddress: string;
  status: string;
  clientStatus: string;
  initiatedAt: string;
  toAmount: string;
  stateAddr: string;
  service: string;
  statusUpdatedAt: string;
  auctionMode: number;
  referrerBps: number;
  mayanBps: number;
  orderHash: string;
  cctpNonce: string | null;
  fulfillTxHash: string;
  refundTxHash: string | null;
  clientRelayerFeeRefund: number;
  orderId: string;
}

export interface SwapResponse {
  data: SwapData[];
  metadata: {
    count: number;
    volume: number;
  };
}

export interface SwapQueryResult {
  referrerAddress: string;
  traderAddress: string;
  response: SwapResponse;
  rawResponse?: Response;
  error?: string;
}

export type ChainType = "EVM" | "SOL" | "SUI";

export type WalletFilterType = "all" | "metamask" | "phantom" | "suiet";

export interface WalletOption {
  value: WalletFilterType;
  label: string;
  icon?: string;
  icons?: string[]; // For "all" option
  walletType?: WalletType; // Map to actual wallet type
}

export interface WalletFilterProps {
  selectedWallet: WalletFilterType;
  onWalletChange: (wallet: WalletFilterType) => void;
  className?: string;
}
