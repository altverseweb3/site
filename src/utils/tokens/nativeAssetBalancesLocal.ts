// src/utils/nativeAssetBalancesLocal.ts

import { ethers } from "ethers";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { SuiClient } from "@mysten/sui/client";
import { chains, chainList } from "@/config/chains";
import { WalletType, Chain } from "@/types/web3";
import { useWalletProviderAndSigner } from "@/utils/wallet/reownEthersUtils";
import { useWallet } from "@suiet/wallet-kit";
import { createEthersJsonRpcProvider } from "@/utils/wallet/ethersJsonRpcProvider";

export interface NativeBalance {
  chainId: string;
  chainName: string;
  symbol: string;
  balance: string;
  balanceFormatted: string;
  decimals: number;
  address: string;
  error?: string;
}

export interface NativeBalanceResult {
  balances: NativeBalance[];
  errors: Array<{
    chainId: string;
    error: string;
  }>;
}

/**
 * Fetches native asset balance for EVM chains using ethers.js and RPC endpoints
 */
async function getEvmNativeBalance(
  chain: Chain,
  walletAddress: string,
): Promise<NativeBalance> {
  try {
    if (!chain.rpcUrls || chain.rpcUrls.length === 0) {
      throw new Error(`No RPC URLs configured for chain ${chain.chainName}`);
    }

    const provider = createEthersJsonRpcProvider(chain);
    const balance = await provider.getBalance(walletAddress);
    const balanceFormatted = ethers.formatUnits(balance, chain.decimals);

    return {
      chainId: chain.id,
      chainName: chain.chainName,
      symbol: chain.nativeGasToken.symbol,
      balance: balance.toString(),
      balanceFormatted,
      decimals: chain.decimals,
      address: walletAddress,
    };
  } catch (error) {
    return {
      chainId: chain.id,
      chainName: chain.chainName,
      symbol: chain.nativeGasToken.symbol,
      balance: "0",
      balanceFormatted: "0",
      decimals: chain.decimals,
      address: walletAddress,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fetches native SOL balance using Solana web3.js
 */
async function getSolanaNativeBalance(
  chain: Chain,
  walletAddress: string,
): Promise<NativeBalance> {
  try {
    if (!chain.rpcUrls || chain.rpcUrls.length === 0) {
      throw new Error(`No RPC URLs configured for Solana`);
    }

    const connection = new Connection(chain.rpcUrls[0], "confirmed");
    const publicKey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(publicKey);
    const balanceFormatted = (balance / LAMPORTS_PER_SOL).toString();

    return {
      chainId: chain.id,
      chainName: chain.chainName,
      symbol: chain.nativeGasToken.symbol,
      balance: balance.toString(),
      balanceFormatted,
      decimals: chain.decimals,
      address: walletAddress,
    };
  } catch (error) {
    return {
      chainId: chain.id,
      chainName: chain.chainName,
      symbol: chain.nativeGasToken.symbol,
      balance: "0",
      balanceFormatted: "0",
      decimals: chain.decimals,
      address: walletAddress,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fetches native SUI balance using Sui client
 */
async function getSuiNativeBalance(
  chain: Chain,
  walletAddress: string,
): Promise<NativeBalance> {
  try {
    if (!chain.rpcUrls || chain.rpcUrls.length === 0) {
      throw new Error(`No RPC URLs configured for Sui`);
    }

    const client = new SuiClient({ url: chain.rpcUrls[0] });
    const balance = await client.getBalance({
      owner: walletAddress,
    });

    const balanceFormatted = (
      parseInt(balance.totalBalance) / Math.pow(10, chain.decimals)
    ).toString();

    return {
      chainId: chain.id,
      chainName: chain.chainName,
      symbol: chain.nativeGasToken.symbol,
      balance: balance.totalBalance,
      balanceFormatted,
      decimals: chain.decimals,
      address: walletAddress,
    };
  } catch (error) {
    return {
      chainId: chain.id,
      chainName: chain.chainName,
      symbol: chain.nativeGasToken.symbol,
      balance: "0",
      balanceFormatted: "0",
      decimals: chain.decimals,
      address: walletAddress,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Fetches native asset balances for all supported chains for a given wallet address
 */
export async function fetchNativeBalanceForChain(
  chain: Chain,
  walletAddress: string,
): Promise<NativeBalance> {
  switch (chain.walletType) {
    case WalletType.REOWN_EVM:
      return getEvmNativeBalance(chain, walletAddress);
    case WalletType.REOWN_SOL:
      return getSolanaNativeBalance(chain, walletAddress);
    case WalletType.SUIET_SUI:
      return getSuiNativeBalance(chain, walletAddress);
    default:
      return {
        chainId: chain.id,
        chainName: chain.chainName,
        symbol: chain.nativeGasToken.symbol,
        balance: "0",
        balanceFormatted: "0",
        decimals: chain.decimals,
        address: walletAddress,
        error: `Unsupported wallet type: ${chain.walletType}`,
      };
  }
}

/**
 * Fetches native asset balances for all chains of a specific wallet type
 */
export async function fetchNativeBalancesForWalletType(
  walletType: WalletType,
  walletAddress: string,
): Promise<NativeBalanceResult> {
  const supportedChains = chainList.filter(
    (chain) => chain.walletType === walletType,
  );

  const balancePromises = supportedChains.map((chain) =>
    fetchNativeBalanceForChain(chain, walletAddress),
  );

  const results = await Promise.all(balancePromises);
  const balances = results.filter((result) => !result.error);
  const errors = results
    .filter((result) => result.error)
    .map((result) => ({
      chainId: result.chainId,
      error: result.error!,
    }));

  return { balances, errors };
}

/**
 * Fetches native asset balances for all supported chains using provided wallet addresses
 * This function accepts wallet addresses directly instead of using hooks
 */
export async function fetchAllNativeBalances(walletAddresses: {
  evmAddress?: string;
  solanaAddress?: string;
  suiAddress?: string;
}): Promise<NativeBalanceResult> {
  const { evmAddress, solanaAddress, suiAddress } = walletAddresses;
  const allBalances: NativeBalance[] = [];
  const allErrors: Array<{ chainId: string; error: string }> = [];

  // Fetch EVM balances if EVM address is provided
  if (evmAddress) {
    try {
      const evmResult = await fetchNativeBalancesForWalletType(
        WalletType.REOWN_EVM,
        evmAddress,
      );
      allBalances.push(...evmResult.balances);
      allErrors.push(...evmResult.errors);
    } catch (error) {
      console.error("Error fetching EVM balances:", error);
      // Add errors for all EVM chains
      const evmChains = chainList.filter(
        (chain) => chain.walletType === WalletType.REOWN_EVM,
      );
      evmChains.forEach((chain) => {
        allErrors.push({
          chainId: chain.id,
          error: `EVM wallet error: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
      });
    }
  }

  // Fetch Solana balances if Solana address is provided
  if (solanaAddress) {
    try {
      const solanaResult = await fetchNativeBalancesForWalletType(
        WalletType.REOWN_SOL,
        solanaAddress,
      );
      allBalances.push(...solanaResult.balances);
      allErrors.push(...solanaResult.errors);
    } catch (error) {
      console.error("Error fetching Solana balances:", error);
      // Add error for Solana chain
      const solanaChain = chains.solana;
      allErrors.push({
        chainId: solanaChain.id,
        error: `Solana wallet error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }

  // Fetch Sui balances if Sui address is provided
  if (suiAddress) {
    try {
      const suiResult = await fetchNativeBalancesForWalletType(
        WalletType.SUIET_SUI,
        suiAddress,
      );
      allBalances.push(...suiResult.balances);
      allErrors.push(...suiResult.errors);
    } catch (error) {
      console.error("Error fetching Sui balances:", error);
      // Add error for Sui chain
      const suiChain = chains.sui;
      allErrors.push({
        chainId: suiChain.id,
        error: `Sui wallet error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }

  return {
    balances: allBalances,
    errors: allErrors,
  };
}

/**
 * Utility function to get supported chains for a wallet type
 */
export function getSupportedChainsForWalletType(
  walletType: WalletType,
): Chain[] {
  return chainList.filter((chain) => chain.walletType === walletType);
}

/**
 * Utility function to format balance with proper decimal places
 */
export function formatNativeBalance(
  balance: string,
  decimals: number,
  maxDecimals = 6,
): string {
  try {
    const formatted = ethers.formatUnits(balance, decimals);
    const num = parseFloat(formatted);

    if (num === 0) return "0";
    if (num < 0.000001) return "< 0.000001";

    return num.toFixed(Math.min(maxDecimals, decimals)).replace(/\.?0+$/, "");
  } catch {
    return "0";
  }
}

/**
 * Hook-based version for React components
 * Note: This should be used within React components due to the hooks
 */
export function useNativeBalances() {
  const { evmProvider, solanaProvider, getEvmSigner, getSolanaSigner } =
    useWalletProviderAndSigner();
  const { address: suiAddress, connected: suiConnected } = useWallet();

  const fetchBalances = async (): Promise<NativeBalanceResult> => {
    const walletAddresses: {
      evmAddress?: string;
      solanaAddress?: string;
      suiAddress?: string;
    } = {};

    // Get EVM address if available
    if (evmProvider) {
      try {
        const signer = await getEvmSigner();
        walletAddresses.evmAddress = await signer.getAddress();
      } catch (error) {
        console.error("Error getting EVM address:", error);
      }
    }

    // Get Solana address if available
    if (solanaProvider) {
      try {
        const solanaSigner = await getSolanaSigner();
        walletAddresses.solanaAddress = solanaSigner.publicKey;
      } catch (error) {
        console.error("Error getting Solana address:", error);
      }
    }

    // Get Sui address if available
    if (suiConnected && suiAddress) {
      walletAddresses.suiAddress = suiAddress;
    }

    return fetchAllNativeBalances(walletAddresses);
  };

  const fetchBalancesForChain = async (
    chain: Chain,
    address: string,
  ): Promise<NativeBalance> => {
    return fetchNativeBalanceForChain(chain, address);
  };

  return {
    fetchBalances,
    fetchBalancesForChain,
    formatBalance: formatNativeBalance,
    getSupportedChains: getSupportedChainsForWalletType,
  };
}
