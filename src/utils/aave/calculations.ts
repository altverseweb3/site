import { AaveReserveData } from "@/utils/aave/fetch";

export interface ReserveMetrics {
  reserveSize: string;
  availableLiquidity: string;
  totalBorrowed: string;
  borrowedPercentage: number;
  availablePercentage: number;
  supplyCapUtilization: number;
  borrowCapUtilization: number;
  supplyCapFormatted: string;
  borrowCapFormatted: string;
}

export interface ExtendedAssetDetails {
  ltv?: string;
  liquidationThreshold?: string;
  liquidationPenalty?: string;
  stableDebtTokenAddress?: string;
  variableDebtTokenAddress?: string;
  oraclePrice?: number;
  currentPrice?: number;
  priceChange24h?: number;
  supplyCap?: string;
}

export const getReserveMetrics = (
  currentAsset: AaveReserveData,
  extendedDetails: ExtendedAssetDetails | null,
): ReserveMetrics => {
  const reserveSize = currentAsset.formattedSupply || "0";
  const availableLiquidity = currentAsset.formattedAvailableLiquidity || "0";
  const totalBorrowed = currentAsset.formattedTotalBorrowed || "0";

  const totalSupplyNum = parseFloat(reserveSize);
  const totalBorrowedNum = parseFloat(totalBorrowed);
  const availableLiquidityNum = parseFloat(availableLiquidity);

  console.log(`${currentAsset.symbol} using formatted values:`, {
    reserveSize,
    availableLiquidity,
    totalBorrowed,
    mathCheck: (
      totalSupplyNum -
      (totalBorrowedNum + availableLiquidityNum)
    ).toFixed(6),
  });

  let borrowedPercentage = 0;
  let availablePercentage = 0;

  if (totalSupplyNum > 0) {
    borrowedPercentage = (totalBorrowedNum / totalSupplyNum) * 100;
    availablePercentage = (availableLiquidityNum / totalSupplyNum) * 100;
  }

  let supplyCapUtilization = 0;
  let borrowCapUtilization = 0;
  let supplyCapFormatted = "Unlimited";
  let borrowCapFormatted = "No cap";

  if (
    extendedDetails?.supplyCap &&
    extendedDetails.supplyCap !== "Unlimited" &&
    extendedDetails.supplyCap !== "0"
  ) {
    try {
      const supplyCapInTokens = parseFloat(extendedDetails.supplyCap);

      if (supplyCapInTokens > 0) {
        supplyCapUtilization = (totalSupplyNum / supplyCapInTokens) * 100;
        if (supplyCapInTokens >= 1000000) {
          supplyCapFormatted = (supplyCapInTokens / 1000000).toFixed(1) + "M";
        } else if (supplyCapInTokens >= 1000) {
          supplyCapFormatted = (supplyCapInTokens / 1000).toFixed(1) + "K";
        } else {
          supplyCapFormatted = supplyCapInTokens.toFixed(0);
        }
      }
    } catch (error) {
      console.warn("Error calculating supply cap:", error);
    }
  }

  if (currentAsset.borrowCap && currentAsset.borrowCap !== "0") {
    try {
      const borrowCapInTokens = parseFloat(currentAsset.borrowCap);

      if (borrowCapInTokens > 0) {
        borrowCapUtilization = (totalBorrowedNum / borrowCapInTokens) * 100;
        if (borrowCapInTokens >= 1000000) {
          borrowCapFormatted = (borrowCapInTokens / 1000000).toFixed(1) + "M";
        } else if (borrowCapInTokens >= 1000) {
          borrowCapFormatted = (borrowCapInTokens / 1000).toFixed(1) + "K";
        } else {
          borrowCapFormatted = borrowCapInTokens.toFixed(0);
        }
      }
    } catch (error) {
      console.warn("Error calculating borrow cap:", error);
    }
  }

  return {
    reserveSize,
    availableLiquidity,
    totalBorrowed,
    borrowedPercentage: Number(borrowedPercentage.toFixed(2)),
    availablePercentage: Number(availablePercentage.toFixed(2)),
    supplyCapUtilization: Number(supplyCapUtilization.toFixed(2)),
    borrowCapUtilization: Number(borrowCapUtilization.toFixed(2)),
    supplyCapFormatted,
    borrowCapFormatted,
  };
};

export const calculateUtilizationRate = (
  currentAsset: AaveReserveData,
): string => {
  if (!currentAsset.totalSupply || !currentAsset.totalBorrowed) return "0.00";

  try {
    const totalSupplyBigInt = BigInt(currentAsset.totalSupply);
    const totalBorrowedBigInt = BigInt(currentAsset.totalBorrowed);

    if (totalSupplyBigInt === BigInt(0)) return "0.00";

    const utilizationBasisPoints =
      (totalBorrowedBigInt * BigInt(10000)) / totalSupplyBigInt;
    const utilizationPercentage = Number(utilizationBasisPoints) / 100;

    return utilizationPercentage.toFixed(2);
  } catch (error) {
    console.warn("Error calculating utilization rate:", error);
    const totalSupply = parseFloat(currentAsset.formattedSupply || "0");
    const totalBorrowed = parseFloat(
      currentAsset.formattedTotalBorrowed || "0",
    );
    if (totalSupply === 0) return "0.00";
    return ((totalBorrowed / totalSupply) * 100).toFixed(2);
  }
};
