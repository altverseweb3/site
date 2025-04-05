export interface WalletInfo {
  type: WalletType; // Static Enum to type/identify the wallet
  name: string; // human-readable name of the wallet e.g. "MetaMask"
  icon?: string; // will be an svg imported from /public
  address: string; // users wallet address, can seamlessly change during the session
  chainId: number; // the currently connected chain on the wallet
}

export enum WalletType {
  METAMASK = "METAMASK",
  COINBASE = "COINBASE",
  WALLET_CONNECT = "WALLET_CONNECT",
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
  userBalance?: string;
  userBalanceUsd?: string;
  isWalletToken?: boolean;
};

export type Chain = {
  id: string;
  name: string;
  chainName: string;
  mayanName: MayanChainName;
  symbol: string;
  icon: string;
  currency: string;
  backgroundColor: string;
  fontColor: string;
  rpcUrl?: string;
  explorerUrl?: string;
  chainId: number;
  decimals: number;
  testnet?: boolean;
  l2: boolean;
};

export interface Web3StoreState {
  // Wallet-related state
  connectedWallets: Array<Omit<WalletInfo, "provider">>;
  activeWallet: Omit<WalletInfo, "provider"> | null;

  // Chain selection state
  sourceChain: Chain;
  destinationChain: Chain;

  // Token selection state - new additions
  sourceToken: Token | null;
  destinationToken: Token | null;

  // Token data state
  tokensByCompositeKey: Record<string, Token>;
  tokensByChainId: Record<number, Token[]>;
  tokensByAddress: Record<number, Record<string, Token>>;
  allTokensList: Token[];
  tokensLoading: boolean;
  tokensError: string | null;

  // Transaction details
  transactionDetails: {
    slippage: string;
    receiveAddress: string | null;
  };

  // Wallet actions
  addWallet: (wallet: WalletInfo) => void;
  removeWallet: (walletType: WalletType) => void;
  setActiveWallet: (walletType: WalletType) => void;
  updateWalletAddress: (walletType: WalletType, address: string) => void;
  updateWalletChainId: (walletType: WalletType, chainId: number) => void;
  disconnectAll: () => void;

  // Chain selection actions
  setSourceChain: (chain: Chain) => void;
  setDestinationChain: (chain: Chain) => void;
  swapChains: () => void;

  // Token selection actions - new additions
  setSourceToken: (token: Token | null) => void;
  setDestinationToken: (token: Token | null) => void;
  swapTokens: () => void;

  // Token data actions
  loadTokens: () => Promise<void>;
  getWalletTokens: () => Token[];
  getAllTokens: () => Token[];
  getTokensForChain: (chainId: number) => Token[];
  getTokenById: (compositeKey: string) => Token | undefined;
  getTokenByAddress: (address: string, chainId: number) => Token | undefined;
  findTokenByAddressAnyChain: (address: string) => Token | undefined;

  // Transaction details actions
  setSlippageValue: (value: string) => void;
  setReceiveAddress: (address: string | null) => void;
}
