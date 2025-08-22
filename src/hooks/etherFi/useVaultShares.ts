import { useCallback } from "react";
import { useReownWalletProviderAndSigner } from "@/hooks/useReownWalletProviderAndSigner";
import {
  queryVaultConversionRate,
  queryMultipleConversionRates,
  queryAllVaultsForAsset,
} from "@/utils/etherFi/vaultShares";

// React hook for vault share conversion queries with wallet integration

export function useVaultShares() {
  const { getEvmSigner } = useReownWalletProviderAndSigner();

  const queryVaultConversionRateMemoized = useCallback(
    async (vaultId: number, depositAsset: string, depositAmount: string) => {
      try {
        // Try to use wallet provider if available and connected to Ethereum
        const signer = await getEvmSigner();
        const provider = signer.provider;
        if (provider) {
          const network = await provider.getNetwork();
          // If connected to Ethereum mainnet, use wallet provider
          if (network.chainId === BigInt(1)) {
            return queryVaultConversionRate(
              vaultId,
              depositAsset,
              depositAmount,
              provider,
            );
          }
        }
      } catch {
        // If wallet provider fails, fall through to read-only provider
      }

      // Use read-only Ethereum provider for cross-chain scenarios
      return queryVaultConversionRate(vaultId, depositAsset, depositAmount);
    },
    [getEvmSigner],
  );

  const queryMultipleConversionRatesMemoized = useCallback(
    async (
      queries: Array<{
        vaultId: number;
        depositAsset: string;
        depositAmount: string;
      }>,
    ) => {
      try {
        // Try to use wallet provider if available and connected to Ethereum
        const signer = await getEvmSigner();
        const provider = signer.provider;
        if (provider) {
          const network = await provider.getNetwork();
          // If connected to Ethereum mainnet, use wallet provider
          if (network.chainId === BigInt(1)) {
            return queryMultipleConversionRates(queries, provider);
          }
        }
      } catch {
        // If wallet provider fails, fall through to read-only provider
      }

      // Use read-only Ethereum provider for cross-chain scenarios
      return queryMultipleConversionRates(queries);
    },
    [getEvmSigner],
  );

  const queryAllVaultsForAssetMemoized = useCallback(
    async (depositAsset: string, depositAmount: string) => {
      try {
        // Try to use wallet provider if available and connected to Ethereum
        const signer = await getEvmSigner();
        const provider = signer.provider;
        if (provider) {
          const network = await provider.getNetwork();
          // If connected to Ethereum mainnet, use wallet provider
          if (network.chainId === BigInt(1)) {
            return queryAllVaultsForAsset(
              depositAsset,
              depositAmount,
              provider,
            );
          }
        }
      } catch {
        // If wallet provider fails, fall through to read-only provider
      }

      // Use read-only Ethereum provider for cross-chain scenarios
      return queryAllVaultsForAsset(depositAsset, depositAmount);
    },
    [getEvmSigner],
  );

  return {
    queryVaultConversionRate: queryVaultConversionRateMemoized,
    queryMultipleConversionRates: queryMultipleConversionRatesMemoized,
    queryAllVaultsForAsset: queryAllVaultsForAssetMemoized,
  };
}
