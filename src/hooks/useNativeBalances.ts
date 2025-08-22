import { useReownWalletProviderAndSigner } from "@/hooks/useReownWalletProviderAndSigner";
import { useWallet } from "@suiet/wallet-kit";
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
  const { evmProvider, solanaProvider, getEvmSigner, getSolanaSigner } =
    useReownWalletProviderAndSigner();
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
