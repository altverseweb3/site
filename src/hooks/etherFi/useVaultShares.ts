import { useCallback } from "react";
import { useDynamicEvmProvider } from "@/hooks/dynamic/useDynamicProviderAndSigner";
import {
  queryVaultConversionRate,
  queryMultipleConversionRates,
  queryAllVaultsForAsset,
} from "@/utils/etherFi/vaultShares";
import { WalletType } from "@/types/web3";
import { useWalletByType } from "../dynamic/useUserWallets";

// React hook for vault share conversion queries with wallet integration

export function useVaultShares() {
  const wallet = useWalletByType(WalletType.EVM);
  const { getEvmSigner } = useDynamicEvmProvider(wallet);

  const queryVaultConversionRateMemoized = useCallback(
    async (vaultId: number, depositAsset: string, depositAmount: string) => {
      try {
        // Try to use wallet provider if available and connected to Ethereum
        const signer = await getEvmSigner();
        if (!signer) {
          throw new Error("No signer available");
        }
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
        if (!signer) {
          throw new Error("No signer available");
        }
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
        if (!signer) {
          throw new Error("No signer available");
        }
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
