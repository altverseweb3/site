import {
  fetchAllNativeBalances,
  fetchNativeBalanceForChain,
  formatNativeBalance,
  getSupportedChainsForWalletType,
  NativeBalanceResult,
  NativeBalance,
} from "@/utils/tokens/nativeAssetBalancesLocal";
import { Chain } from "@/types/web3";

/**
 * Hook-based version for React components
 * Note: This should be used within React components due to the hooks
 */
export function useNativeBalances() {
  const fetchBalances = async (walletAddresses: {
    evmAddress?: string;
    solanaAddress?: string;
    suiAddress?: string;
  }): Promise<NativeBalanceResult> => {
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
