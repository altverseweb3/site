import { useCallback } from "react";
import { useDynamicEvmProvider } from "@/hooks/dynamic/useDynamicProviderAndSigner";
import { useWalletByType } from "@/hooks/dynamic/useUserWallets";
import { WalletType } from "@/types/web3";
import {
  fetchVaultTVL,
  checkIfTellerPaused,
  getTokenAllowance,
  getTokenBalance,
  getUserVaultBalance,
} from "@/utils/etherFi/fetch";

/**
 * React hook for etherFi fetch functions with wallet integration
 */
export function useEtherFiFetch() {
  const wallet = useWalletByType(WalletType.EVM);
  const { getEvmSigner } = useDynamicEvmProvider(wallet);

  const fetchVaultTVLMemoized = useCallback(
    async (vaultId: number) => {
      const signer = await getEvmSigner();
      if (!signer) {
        throw new Error("No signer available");
      }
      const provider = signer.provider;
      if (!provider) {
        throw new Error("Signer must have a provider");
      }
      return fetchVaultTVL(vaultId, provider);
    },
    [getEvmSigner],
  );

  const checkIfTellerPausedMemoized = useCallback(
    async (vaultId: number) => {
      const signer = await getEvmSigner();
      if (!signer) {
        throw new Error("No signer available");
      }
      const provider = signer.provider;
      if (!provider) {
        throw new Error("Signer must have a provider");
      }
      return checkIfTellerPaused(vaultId, provider);
    },
    [getEvmSigner],
  );

  const getTokenAllowanceMemoized = useCallback(
    async (tokenSymbol: string, vaultId: number) => {
      const signer = await getEvmSigner();
      if (!signer) {
        throw new Error("No signer available");
      }
      return getTokenAllowance(tokenSymbol, vaultId, signer);
    },
    [getEvmSigner],
  );

  const getTokenBalanceMemoized = useCallback(
    async (tokenSymbol: string) => {
      const signer = await getEvmSigner();
      if (!signer) {
        throw new Error("No signer available");
      }
      return getTokenBalance(tokenSymbol, signer);
    },
    [getEvmSigner],
  );

  const getUserVaultBalanceMemoized = useCallback(
    async (vaultId: number) => {
      const signer = await getEvmSigner();
      if (!signer) {
        throw new Error("No signer available");
      }
      const userAddress = await signer.getAddress();
      const provider = signer.provider;
      if (!provider) {
        throw new Error("Signer must have a provider");
      }
      return getUserVaultBalance(vaultId, userAddress, provider);
    },
    [getEvmSigner],
  );

  return {
    fetchVaultTVL: fetchVaultTVLMemoized,
    checkIfTellerPaused: checkIfTellerPausedMemoized,
    getTokenAllowance: getTokenAllowanceMemoized,
    getTokenBalance: getTokenBalanceMemoized,
    getUserVaultBalance: getUserVaultBalanceMemoized,
  };
}
