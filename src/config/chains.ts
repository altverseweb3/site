// src/config/chains.ts
import { Chain } from "@/types/web3";

export const chains: Record<string, Chain> = {
  ethereum: {
    id: "ethereum",
    name: "ethereum",
    chainName: "Ethereum Mainnet",
    mayanName: "ethereum",
    symbol: "ETH",
    currency: "Ethereum",
    icon: "ETH.svg",
    backgroundColor: "#627eea",
    fontColor: "#FFFFFF",
    rpcUrl: "https://1rpc.io/eth",
    explorerUrl: "https://etherscan.io",
    chainId: 1,
    decimals: 18,
    l2: false,
  },
  arbitrum: {
    id: "arbitrum",
    name: "arbitrum",
    chainName: "Arbitrum One",
    mayanName: "arbitrum",
    symbol: "ETH",
    currency: "Ethereum",
    icon: "ARB.svg",
    backgroundColor: "#28a0f0",
    fontColor: "#FFFFFF",
    rpcUrl: "https://arb1.arbitrum.io/rpc	",
    explorerUrl: "https://arbiscan.io",
    chainId: 42161,
    decimals: 18,
    l2: true,
  },
  optimism: {
    id: "optimism",
    name: "optimism",
    mayanName: "optimism",
    chainName: "OP Mainnet",
    symbol: "ETH",
    currency: "Ethereum",
    icon: "OP.svg",
    backgroundColor: "#ff0420",
    fontColor: "#FFFFFF",
    rpcUrl: "https://optimism.drpc.org",
    explorerUrl: "https://optimistic.etherscan.io",
    chainId: 10,
    decimals: 18,
    l2: true,
  },
  base: {
    id: "base",
    name: "base",
    chainName: "Base",
    mayanName: "base",
    symbol: "ETH",
    currency: "Ethereum",
    icon: "BASE.svg",
    backgroundColor: "#0D5BFF",
    fontColor: "#FFFFFF",
    rpcUrl: "https://mainnet.base.org/",
    explorerUrl: "https://basescan.org",
    chainId: 8453,
    decimals: 18,
    l2: true,
  },
  unichain: {
    id: "unichain",
    name: "unichain",
    chainName: "Unichain",
    mayanName: "unichain",
    symbol: "ETH",
    currency: "Ethereum",
    icon: "UNI.svg",
    backgroundColor: "#F50DB4",
    fontColor: "#FFFFFF",
    rpcUrl: "wss://unichain-rpc.publicnode.com",
    explorerUrl: "https://mainnet.unichain.org",
    chainId: 130,
    decimals: 18,
    l2: true,
  },
  sui: {
    id: "sui",
    name: "sui",
    chainName: "Sui Mainnet",
    mayanName: "sui",
    symbol: "SUI",
    currency: "Sui",
    icon: "SUI.svg",
    backgroundColor: "#4BA2FF",
    fontColor: "#FAFAFA",
    rpcUrl: "https://sui-mainnet-endpoint.blockvision.org",
    explorerUrl: "https://suiscan.xyz/mainnet/home",
    chainId: 999,
    decimals: 9,
    l2: false,
  },
  polygon: {
    id: "polygon",
    name: "polygon",
    chainName: "Polygon Mainnet",
    mayanName: "polygon",
    symbol: "POL",
    currency: "Polygon",
    icon: "MATIC.svg",
    backgroundColor: "#8247e5",
    fontColor: "#FFFFFF",
    rpcUrl: "https://polygon.drpc.org",
    explorerUrl: "https://polygonscan.com",
    chainId: 137,
    decimals: 18,
    l2: false,
  },
  "binance-smart-chain": {
    id: "binance-smart-chain",
    name: "bnb chain",
    chainName: "BNB Smart Chain Mainnet",
    mayanName: "bsc",
    symbol: "BNB",
    currency: "BNB",
    icon: "BNB.svg",
    backgroundColor: "#f3ba2f",
    fontColor: "#FFFFFF",
    rpcUrl: "https://bsc-dataseed1.bnbchain.org",
    explorerUrl: "https://bscscan.com",
    chainId: 56,
    decimals: 18,
    l2: false,
  },
  avalanche: {
    id: "avalanche",
    name: "avalanche",
    chainName: "Avalanche C-Chain",
    mayanName: "avalanche",
    symbol: "AVAX",
    currency: "Avalanche",
    icon: "AVAX.svg",
    backgroundColor: "#e84142",
    fontColor: "#FFFFFF",
    rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
    explorerUrl: "https://snowtrace.io",
    chainId: 43114,
    decimals: 18,
    l2: false,
  },
  solana: {
    id: "solana",
    name: "solana",
    chainName: "Solana Mainnet",
    mayanName: "solana",
    symbol: "SOL",
    currency: "Solana",
    icon: "SOL.svg",
    backgroundColor: "#9945FF",
    fontColor: "#FFFFFF",
    rpcUrl: "https://api.mainnet-beta.solana.com",
    explorerUrl: "https://explorer.solana.com/",
    chainId: 101,
    decimals: 9,
    l2: false,
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

export default chains;
