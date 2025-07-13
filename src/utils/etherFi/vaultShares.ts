import { ethers } from "ethers";
import { useCallback } from "react";
import { useWalletProviderAndSigner } from "@/utils/wallet/reownEthersUtils";
import {
  ETHERFI_VAULTS,
  DEPOSIT_ASSETS,
  SHARED_LENS_ADDRESS,
} from "@/config/etherFi";
import { VAULT_SHARES_PREVIEW_ABI } from "@/types/etherFiABIs";

export interface VaultConversionRate {
  vaultId: number;
  vaultName: string;
  depositAsset: string;
  depositAmount: string;
  vaultTokensReceived: string;
  vaultTokenSymbol: string;
  exchangeRate: number;
  timestamp: Date;
}

export interface ConversionRateError {
  vaultId: number;
  vaultName: string;
  depositAsset: string;
  error: string;
}

// Query conversion rate for a specific vault and deposit asset pair

export async function queryVaultConversionRate(
  vaultId: number,
  depositAsset: string,
  depositAmount: string,
  provider: ethers.Provider,
): Promise<VaultConversionRate> {
  const vault = ETHERFI_VAULTS[vaultId];
  if (!vault) {
    throw new Error(`Vault ${vaultId} not found`);
  }

  // Check if the asset is supported by the vault (case insensitive)
  const supportedAssets = vault.supportedAssets.deposit.map((asset) =>
    asset.toLowerCase(),
  );
  if (!supportedAssets.includes(depositAsset.toLowerCase())) {
    throw new Error(
      `asset ${depositAsset} not supported by vault ${vault.name}`,
    );
  }

  const asset = DEPOSIT_ASSETS[depositAsset.toLowerCase()];
  if (!asset) {
    throw new Error(`deposit asset ${depositAsset} not configured`);
  }

  try {
    // Create lens contract instance
    const lensContract = new ethers.Contract(
      SHARED_LENS_ADDRESS,
      VAULT_SHARES_PREVIEW_ABI,
      provider,
    );

    // Parse deposit amount with correct decimals
    const parsedAmount = ethers.parseUnits(depositAmount, asset.decimals);

    // Query conversion rate using previewDeposit
    const vaultTokensReceived = await lensContract.previewDeposit(
      asset.contractAddress,
      parsedAmount,
      vault.addresses.vault,
      vault.addresses.accountant,
    );

    console.log("🔍 Debug vault conversion:", {
      vaultName: vault.name,
      asset: depositAsset,
      parsedAmount: parsedAmount.toString(),
      vaultTokensReceived: vaultTokensReceived.toString(),
      assetDecimals: asset.decimals,
      assetContractAddress: asset.contractAddress,
      vaultAddress: vault.addresses.vault,
      accountantAddress: vault.addresses.accountant,
    });

    // Query the vault token decimals to format correctly
    const vaultContract = new ethers.Contract(
      vault.addresses.vault,
      [
        {
          name: "decimals",
          outputs: [{ name: "", type: "uint8" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      provider,
    );

    const vaultTokenDecimals = await vaultContract.decimals();
    console.log("🔍 Vault token decimals:", vaultTokenDecimals.toString());

    // Format the received vault tokens with correct decimals
    const formattedVaultTokens = ethers.formatUnits(
      vaultTokensReceived,
      vaultTokenDecimals,
    );

    // Calculate exchange rate
    const exchangeRate =
      parseFloat(formattedVaultTokens) / parseFloat(depositAmount);

    return {
      vaultId,
      vaultName: vault.name,
      depositAsset,
      depositAmount,
      vaultTokensReceived: formattedVaultTokens,
      vaultTokenSymbol: vault.supportedAssets.receive.symbol,
      exchangeRate,
      timestamp: new Date(),
    };
  } catch (error) {
    throw new Error(
      `Failed to query conversion rate for vault ${vault.name} with ${depositAsset}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

//Query conversion rates for multiple vault-asset pairs

export async function queryMultipleConversionRates(
  queries: Array<{
    vaultId: number;
    depositAsset: string;
    depositAmount: string;
  }>,
  provider: ethers.Provider,
): Promise<{
  successful: VaultConversionRate[];
  failed: ConversionRateError[];
}> {
  const successful: VaultConversionRate[] = [];
  const failed: ConversionRateError[] = [];

  // Process queries concurrently
  const promises = queries.map(async (query) => {
    try {
      const result = await queryVaultConversionRate(
        query.vaultId,
        query.depositAsset,
        query.depositAmount,
        provider,
      );
      successful.push(result);
    } catch (error) {
      const vault = ETHERFI_VAULTS[query.vaultId];
      failed.push({
        vaultId: query.vaultId,
        vaultName: vault?.name || `Unknown Vault ${query.vaultId}`,
        depositAsset: query.depositAsset,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  await Promise.allSettled(promises);

  return { successful, failed };
}

// Get all possible conversion rates for a specific deposit asset across all vaults
export async function queryAllVaultsForAsset(
  depositAsset: string,
  depositAmount: string,
  provider: ethers.Provider,
): Promise<{
  successful: VaultConversionRate[];
  failed: ConversionRateError[];
}> {
  // Find all vaults that support the given deposit asset
  const supportedVaults = Object.entries(ETHERFI_VAULTS)
    .filter(([, vault]) => vault.supportedAssets.deposit.includes(depositAsset))
    .map(([vaultId]) => parseInt(vaultId));

  if (supportedVaults.length === 0) {
    return {
      successful: [],
      failed: [
        {
          vaultId: 0,
          vaultName: "no vaults found",
          depositAsset,
          error: `no vaults support deposit asset ${depositAsset}`,
        },
      ],
    };
  }

  // Create queries for all supported vaults
  const queries = supportedVaults.map((vaultId) => ({
    vaultId,
    depositAsset,
    depositAmount,
  }));

  return queryMultipleConversionRates(queries, provider);
}

// React hook for vault share conversion queries with wallet integration

export function useVaultShares() {
  const { getEvmSigner } = useWalletProviderAndSigner();

  const queryVaultConversionRateMemoized = useCallback(
    async (vaultId: number, depositAsset: string, depositAmount: string) => {
      const signer = await getEvmSigner();
      const provider = signer.provider;
      if (!provider) {
        throw new Error("signer must have a provider");
      }
      return queryVaultConversionRate(
        vaultId,
        depositAsset,
        depositAmount,
        provider,
      );
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
      const signer = await getEvmSigner();
      const provider = signer.provider;
      if (!provider) {
        throw new Error("signer must have a provider");
      }
      return queryMultipleConversionRates(queries, provider);
    },
    [getEvmSigner],
  );

  const queryAllVaultsForAssetMemoized = useCallback(
    async (depositAsset: string, depositAmount: string) => {
      const signer = await getEvmSigner();
      const provider = signer.provider;
      if (!provider) {
        throw new Error("signer must have a provider");
      }
      return queryAllVaultsForAsset(depositAsset, depositAmount, provider);
    },
    [getEvmSigner],
  );

  return {
    queryVaultConversionRate: queryVaultConversionRateMemoized,
    queryMultipleConversionRates: queryMultipleConversionRatesMemoized,
    queryAllVaultsForAsset: queryAllVaultsForAssetMemoized,
  };
}
