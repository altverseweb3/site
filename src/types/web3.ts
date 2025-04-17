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
  priceUsd?: string;
  isWalletToken?: boolean;
};

export type Chain = {
  id: string;
  name: string;
  chainName: string;
  mayanName: MayanChainName;
  alchemyNetworkName: Network;
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
    slippage: "auto" | string;
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
  setSlippageValue: (value: "auto" | string) => void;
  setReceiveAddress: (address: string | null) => void;
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
  UNICHAIN_SEPOLIA = "unichain-sepolia",
  SONIC_MAINNET = "sonic-mainnet",
  SONIC_BLAZE = "sonic-blaze",
  XMTP_TESTNET = "xmtp-testnet",
  ABSTRACT_TESTNET = "abstract-testnet",
  DEGEN_MAINNET = "degen-mainnet",
  INK_MAINNET = "ink-mainnet",
  INK_SEPOLIA = "ink-sepolia",
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
