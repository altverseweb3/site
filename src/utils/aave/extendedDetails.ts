import { ethers } from "ethers";
import { useCallback } from "react";
import { POOL_DATA_PROVIDER_ABI } from "@/types/aaveV3ABIs";
import { getChainByChainId } from "@/config/chains";
import { altverseAPI } from "@/api/altverse";
import { useWalletProviderAndSigner } from "@/utils/wallet/reownEthersUtils";
import { AaveReserveData } from "@/utils/aave/fetch";
import { ExtendedAssetDetails } from "@/utils/aave/calculations";
import { getAaveMarket } from "@/config/aave";

export const fetchExtendedAssetDetails = async (
  currentAsset: AaveReserveData,
  chainId: number,
  provider?: ethers.Provider,
): Promise<ExtendedAssetDetails> => {
  let oraclePrice = 1;

  try {
    const chainInfo = getChainByChainId(currentAsset.chainId || chainId);
    console.log(`🔍 Fetching price for ${currentAsset.symbol}:`, {
      assetChainId: currentAsset.chainId,
      modalChainId: chainId,
      chainInfo: chainInfo?.name,
      network: chainInfo?.alchemyNetworkName,
      tokenAddress: currentAsset.asset,
    });

    if (chainInfo?.alchemyNetworkName) {
      const priceResponse = await altverseAPI.getTokenPrices({
        addresses: [
          {
            network: chainInfo.alchemyNetworkName,
            address: currentAsset.asset,
          },
        ],
      });

      console.log(`📊 Price API response for ${currentAsset.symbol}:`, {
        success: !priceResponse.error,
        error: priceResponse.error,
        dataExists: !!priceResponse.data,
        dataLength: priceResponse.data?.data?.length,
        firstResult: priceResponse.data?.data?.[0],
        fullResponse: priceResponse,
      });

      if (
        !priceResponse.error &&
        priceResponse.data?.data?.[0]?.prices?.[0]?.value
      ) {
        oraclePrice = parseFloat(priceResponse.data.data[0].prices[0].value);
        console.log(
          `✅ Successfully fetched oracle price for ${currentAsset.symbol}: $${oraclePrice}`,
        );
      } else {
        console.warn(
          `❌ No price data for ${currentAsset.symbol}. Error:`,
          priceResponse.error,
        );
      }
    } else {
      console.warn(
        `❌ No network info for chainId ${currentAsset.chainId || chainId}`,
      );
    }
  } catch (priceError) {
    console.error(
      `❌ Price fetch error for ${currentAsset.symbol}:`,
      priceError,
    );
  }

  if (provider) {
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    const market = getAaveMarket(chainId);

    if (!market?.AAVE_PROTOCOL_DATA_PROVIDER) {
      throw new Error(`Aave market not found for chain ${chainId}`);
    }

    const poolDataProvider = new ethers.Contract(
      market.AAVE_PROTOCOL_DATA_PROVIDER,
      POOL_DATA_PROVIDER_ABI,
      provider,
    );

    const [configData, tokenAddresses, reserveCaps] = await Promise.all([
      poolDataProvider.getReserveConfigurationData(currentAsset.asset),
      poolDataProvider.getReserveTokensAddresses(currentAsset.asset),
      poolDataProvider.getReserveCaps(currentAsset.asset),
    ]);

    const ltvBps = Number(configData.ltv);
    const liquidationThresholdBps = Number(configData.liquidationThreshold);
    const liquidationBonusBps = Number(configData.liquidationBonus);

    return {
      ltv: (ltvBps / 100).toFixed(2) + "%",
      liquidationThreshold: (liquidationThresholdBps / 100).toFixed(2) + "%",
      liquidationPenalty:
        ((liquidationBonusBps - 10000) / 100).toFixed(2) + "%",
      stableDebtTokenAddress: tokenAddresses.stableDebtTokenAddress,
      variableDebtTokenAddress: tokenAddresses.variableDebtTokenAddress,
      supplyCap:
        reserveCaps.supplyCap.toString() === "0"
          ? "Unlimited"
          : reserveCaps.supplyCap.toString(),
      oraclePrice: oraclePrice,
      currentPrice: oraclePrice,
    };
  }

  return {
    ltv: "80.00%",
    liquidationThreshold: "85.00%",
    liquidationPenalty: "5.00%",
    oraclePrice: oraclePrice,
    currentPrice: oraclePrice,
  };
};

export function useAaveFetch() {
  const { getEvmSigner } = useWalletProviderAndSigner();

  const fetchExtendedAssetDetailsMemoized = useCallback(
    async (currentAsset: AaveReserveData, chainId: number) => {
      const signer = await getEvmSigner();
      const provider = signer.provider;
      if (!provider) {
        throw new Error("Signer must have a provider");
      }
      return fetchExtendedAssetDetails(currentAsset, chainId, provider);
    },
    [getEvmSigner],
  );

  return {
    fetchExtendedAssetDetails: fetchExtendedAssetDetailsMemoized,
  };
}
