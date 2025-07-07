// src/config/chains.ts
import { Chain, Network, WalletType } from "@/types/web3";
import * as markets from "@bgd-labs/aave-address-book";
import { SupportedChainId } from "./aave";

export const chains: Record<string, Chain> = {
  ethereum: {
    id: "ethereum",
    name: "ethereum",
    chainName: "Ethereum Mainnet",
    mayanName: "ethereum",
    alchemyNetworkName: Network.ETH_MAINNET,
    nativeGasToken: {
      symbol: "ETH",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
    },
    nativeWrappedToken: {
      symbol: "WETH",
      address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      decimals: 18,
    },
    currency: "Ethereum",
    icon: "/tokens/mono/ETH.svg",
    brandedIcon: "/tokens/branded/ETH.svg",
    chainTokenSymbol: "ETH",
    backgroundColor: "#627eea",
    fontColor: "#FFFFFF",
    rpcUrl: "https://1rpc.io/eth",
    explorerUrl: "https://etherscan.io",
    chainId: 1,
    decimals: 18,
    l2: false,
    gasDrop: 0.05,
    walletType: WalletType.REOWN_EVM,
  },
  arbitrum: {
    id: "arbitrum",
    name: "arbitrum",
    chainName: "Arbitrum One",
    mayanName: "arbitrum",
    alchemyNetworkName: Network.ARB_MAINNET,
    nativeGasToken: {
      symbol: "ETH",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
    },
    nativeWrappedToken: {
      symbol: "WETH",
      address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      decimals: 18,
    },
    l2Token: {
      symbol: "ARB",
      address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
      decimals: 18,
    },
    currency: "Ethereum",
    icon: "/tokens/mono/ARB.svg",
    brandedIcon: "/tokens/branded/ARB.svg",
    chainTokenSymbol: "ARB",
    backgroundColor: "#28a0f0",
    fontColor: "#FFFFFF",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    explorerUrl: "https://arbiscan.io",
    chainId: 42161,
    decimals: 18,
    l2: true,
    gasDrop: 0.01,
    walletType: WalletType.REOWN_EVM,
  },
  optimism: {
    id: "optimism",
    name: "optimism",
    mayanName: "optimism",
    chainName: "OP Mainnet",
    alchemyNetworkName: Network.OPT_MAINNET,
    nativeGasToken: {
      symbol: "ETH",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
    },
    nativeWrappedToken: {
      symbol: "WETH",
      address: "0x4200000000000000000000000000000000000006",
      decimals: 18,
    },
    l2Token: {
      symbol: "OP",
      address: "0x4200000000000000000000000000000000000042",
      decimals: 18,
    },
    currency: "Ethereum",
    icon: "/tokens/mono/OP.svg",
    brandedIcon: "/tokens/branded/OP.svg",
    chainTokenSymbol: "OP",
    backgroundColor: "#ff0420",
    fontColor: "#FFFFFF",
    rpcUrl: "https://optimism.drpc.org",
    explorerUrl: "https://optimistic.etherscan.io",
    chainId: 10,
    decimals: 18,
    l2: true,
    gasDrop: 0.01,
    walletType: WalletType.REOWN_EVM,
  },
  base: {
    id: "base",
    name: "base",
    chainName: "Base",
    mayanName: "base",
    alchemyNetworkName: Network.BASE_MAINNET,
    nativeGasToken: {
      symbol: "ETH",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
    },
    nativeWrappedToken: {
      symbol: "WETH",
      address: "0x4200000000000000000000000000000000000006",
      decimals: 18,
    },
    currency: "Ethereum",
    icon: "/tokens/mono/BASE.svg",
    brandedIcon: "/tokens/branded/BASE.svg",
    chainTokenSymbol: "BASE",
    backgroundColor: "#0D5BFF",
    fontColor: "#FFFFFF",
    rpcUrl: "https://mainnet.base.org/",
    explorerUrl: "https://basescan.org",
    chainId: 8453,
    decimals: 18,
    l2: true,
    gasDrop: 0.01,
    walletType: WalletType.REOWN_EVM,
  },
  unichain: {
    id: "unichain",
    name: "unichain",
    chainName: "Unichain",
    mayanName: "unichain",
    alchemyNetworkName: Network.UNICHAIN_MAINNET,
    nativeGasToken: {
      symbol: "ETH",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
    },
    nativeWrappedToken: {
      symbol: "WETH",
      address: "0x4200000000000000000000000000000000000006",
      decimals: 18,
    },
    l2Token: {
      symbol: "UNI",
      address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
      decimals: 18,
    },
    currency: "Ethereum",
    icon: "/tokens/mono/UNI.svg",
    brandedIcon: "/tokens/branded/UNI.svg",
    chainTokenSymbol: "UNI",
    backgroundColor: "#F50DB4",
    fontColor: "#FFFFFF",
    rpcUrl: "wss://unichain-rpc.publicnode.com",
    explorerUrl: "https://mainnet.unichain.org",
    chainId: 130,
    decimals: 18,
    l2: true,
    gasDrop: 0.01,
    walletType: WalletType.REOWN_EVM,
  },
  polygon: {
    id: "polygon",
    name: "polygon",
    chainName: "Polygon Mainnet",
    mayanName: "polygon",
    alchemyNetworkName: Network.MATIC_MAINNET,
    nativeGasToken: {
      symbol: "POL",
      address: "0x0000000000000000000000000000000000001010",
      decimals: 18,
    },
    currency: "Polygon",
    icon: "/tokens/mono/MATIC.svg",
    brandedIcon: "/tokens/branded/MATIC.svg",
    chainTokenSymbol: "MATIC",
    backgroundColor: "#8247e5",
    fontColor: "#FFFFFF",
    rpcUrl: "https://polygon.drpc.org",
    explorerUrl: "https://polygonscan.com",
    chainId: 137,
    decimals: 18,
    l2: false,
    gasDrop: 0.2,
    walletType: WalletType.REOWN_EVM,
  },
  "binance-smart-chain": {
    id: "binance-smart-chain",
    name: "bnb chain",
    chainName: "BNB Smart Chain Mainnet",
    mayanName: "bsc",
    alchemyNetworkName: Network.BNB_MAINNET,
    nativeGasToken: {
      symbol: "BNB",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
    },
    nativeWrappedToken: {
      symbol: "WBNB",
      address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
      decimals: 18,
    },
    currency: "BNB",
    icon: "/tokens/mono/BNB.svg",
    brandedIcon: "/tokens/branded/BNB.svg",
    chainTokenSymbol: "BNB",
    backgroundColor: "#f3ba2f",
    fontColor: "#FFFFFF",
    rpcUrl: "https://bsc-dataseed1.bnbchain.org",
    explorerUrl: "https://bscscan.com",
    chainId: 56,
    decimals: 18,
    l2: false,
    gasDrop: 0.02,
    walletType: WalletType.REOWN_EVM,
  },
  avalanche: {
    id: "avalanche",
    name: "avalanche",
    chainName: "Avalanche C-Chain",
    mayanName: "avalanche",
    alchemyNetworkName: Network.AVAX_MAINNET,
    nativeGasToken: {
      symbol: "AVAX",
      address: "0x0000000000000000000000000000000000000000",
      decimals: 18,
    },
    nativeWrappedToken: {
      symbol: "WAVAX",
      address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
      decimals: 18,
    },
    currency: "Avalanche",
    icon: "/tokens/mono/AVAX.svg",
    brandedIcon: "/tokens/branded/AVAX.svg",
    chainTokenSymbol: "AVAX",
    backgroundColor: "#e84142",
    fontColor: "#FFFFFF",
    rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
    explorerUrl: "https://snowtrace.io",
    chainId: 43114,
    decimals: 18,
    l2: false,
    gasDrop: 0.1,
    walletType: WalletType.REOWN_EVM,
  },
  sui: {
    id: "sui",
    name: "sui",
    chainName: "Sui Mainnet",
    mayanName: "sui",
    alchemyNetworkName: Network.ETH_MAINNET,
    nativeGasToken: {
      symbol: "SUI",
      address: "0x2::sui::SUI",
      decimals: 9,
    },
    currency: "Sui",
    icon: "/tokens/mono/SUI.svg",
    brandedIcon: "/tokens/branded/SUI.svg",
    chainTokenSymbol: "SUI",
    backgroundColor: "#4BA2FF",
    fontColor: "#FAFAFA",
    rpcUrl: "https://sui-mainnet-endpoint.blockvision.org",
    explorerUrl: "https://suiscan.xyz/mainnet/home",
    chainId: 0,
    decimals: 9,
    l2: false,
    gasDrop: 0.01,
    walletType: WalletType.SUIET_SUI,
  },
  solana: {
    id: "solana",
    name: "solana",
    chainName: "Solana Mainnet",
    mayanName: "solana",
    alchemyNetworkName: Network.SOLANA_MAINNET,
    nativeGasToken: {
      symbol: "SOL",
      address: "11111111111111111111111111111111",
      decimals: 9,
    },
    currency: "Solana",
    icon: "/tokens/mono/SOL.svg",
    brandedIcon: "/tokens/branded/SOL.svg",
    chainTokenSymbol: "SOL",
    backgroundColor: "#36F295",
    backgroundGradient:
      "linear-gradient(90deg, #9945FF 5%, #6982DC 35%, #34C6B0 70%, #36F195 100%)",
    fontColor: "#FFFFFF",
    rpcUrl: "https://api.mainnet-beta.solana.com",
    explorerUrl: "https://explorer.solana.com/",
    chainId: 101,
    decimals: 9,
    gasDrop: 0.01,
    l2: false,
    walletType: WalletType.REOWN_SOL,
  },
};

export const chainList: Chain[] = Object.values(chains);

export const defaultSourceChain: Chain = chains.ethereum;
export const defaultDestinationChain: Chain = chains.unichain;

export const getChainById = (id: string): Chain => {
  return chains[id] || defaultSourceChain;
};

export const getChainByChainId = (chainId: number): Chain => {
  return (
    chainList.find((chain) => chain.chainId === chainId) || defaultSourceChain
  );
};

export const getTestnetChains = (): Chain[] => {
  return chainList.filter((chain) => chain.testnet);
};

export const getMainnetChains = (): Chain[] => {
  return chainList.filter((chain) => !chain.testnet);
};

export interface ChainConfig {
  poolAddress: string;
  dataProviderAddress: string;
  uiDataProviderAddress?: string;
  addressesProviderAddress: string;
  wethGatewayAddress?: string;
}

// Helper function to get the correct market based on chain ID
export function getAaveMarket(chainId: number) {
  switch (chainId) {
    case 1:
      return markets.AaveV3Ethereum;
    case 137:
      return markets.AaveV3Polygon;
    case 42161:
      return markets.AaveV3Arbitrum;
    case 10:
      return markets.AaveV3Optimism;
    case 43114:
      return markets.AaveV3Avalanche;
    case 8453:
      return markets.AaveV3Base;
    case 100:
      return markets.AaveV3Gnosis;
    case 56:
      return markets.AaveV3BNB;
    case 11155111:
      return markets.AaveV3Sepolia;
    default:
      throw new Error(`Aave V3 not supported on chain ${chainId}`);
  }
}

export function getChainName(chainId: SupportedChainId): string {
  const chainNames: Record<SupportedChainId, string> = {
    1: "Ethereum",
    137: "Polygon",
    42161: "Arbitrum",
    10: "Optimism",
    43114: "Avalanche",
    8453: "Base",
    100: "Gnosis",
    56: "BNB Chain",
    11155111: "Sepolia",
  };
  return chainNames[chainId];
}

export default chains;
