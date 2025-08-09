export interface TransactionValidationResult {
  isValid: boolean;
  riskLevel: "safe" | "moderate" | "high" | "liquidation";
  warningMessage?: string;
  maxSafeAmount?: number;
}

export interface PositionData {
  totalCollateralUSD: number;
  totalDebtUSD: number;
  healthFactor: number;
}

export interface AssetData {
  price: number;
  liquidationThreshold: number;
  isCollateral?: boolean;
}

export const calculateHealthFactorAfterTransaction = (
  position: PositionData,
  asset: AssetData,
  transactionAmountUSD: number,
  transactionType: "supply" | "withdraw" | "borrow" | "repay",
): number => {
  let newCollateralUSD = position.totalCollateralUSD;
  let newDebtUSD = position.totalDebtUSD;

  switch (transactionType) {
    case "supply":
      if (asset.isCollateral) {
        newCollateralUSD += transactionAmountUSD;
      }
      break;
    case "withdraw":
      if (asset.isCollateral) {
        newCollateralUSD = Math.max(0, newCollateralUSD - transactionAmountUSD);
      }
      break;
    case "borrow":
      newDebtUSD += transactionAmountUSD;
      break;
    case "repay":
      newDebtUSD = Math.max(0, newDebtUSD - transactionAmountUSD);
      break;
  }

  if (newDebtUSD === 0) return 999;

  const adjustedCollateral = newCollateralUSD * asset.liquidationThreshold;
  return adjustedCollateral / newDebtUSD;
};

export const validateSupplyTransaction = () // position: PositionData,
// asset: AssetData,
// supplyAmountUSD: number,
: TransactionValidationResult => {
  // const newHealthFactor = calculateHealthFactorAfterTransaction(
  //   position,
  //   asset,
  //   supplyAmountUSD,
  //   "supply",
  // );

  return {
    isValid: true,
    riskLevel: "safe",
  };
};

export const validateWithdrawTransaction = (
  position: PositionData,
  asset: AssetData,
  withdrawAmountUSD: number,
): TransactionValidationResult => {
  if (position.totalDebtUSD === 0) {
    return { isValid: true, riskLevel: "safe" };
  }

  if (!asset.isCollateral) {
    return { isValid: true, riskLevel: "safe" };
  }

  const newHealthFactor = calculateHealthFactorAfterTransaction(
    position,
    asset,
    withdrawAmountUSD,
    "withdraw",
  );

  if (newHealthFactor < 1.0) {
    return {
      isValid: false,
      riskLevel: "liquidation",
      warningMessage:
        "this withdrawal would result in liquidation (Health Factor < 1.0)",
    };
  }

  if (newHealthFactor < 1.1) {
    return {
      isValid: false,
      riskLevel: "liquidation",
      warningMessage:
        "this withdrawal would put you at extreme risk of liquidation (Health Factor < 1.1)",
    };
  }

  if (newHealthFactor < 1.2) {
    return {
      isValid: true,
      riskLevel: "high",
      warningMessage:
        "this withdrawal would put you at high risk of liquidation (Health Factor < 1.2)",
    };
  }

  if (newHealthFactor < 1.5) {
    return {
      isValid: true,
      riskLevel: "moderate",
      warningMessage:
        "this withdrawal would moderately increase your liquidation risk",
    };
  }

  return { isValid: true, riskLevel: "safe" };
};

export const validateBorrowTransaction = (
  position: PositionData,
  asset: AssetData,
  borrowAmountUSD: number,
  availableToBorrowUSD: number,
): TransactionValidationResult => {
  if (borrowAmountUSD > availableToBorrowUSD) {
    return {
      isValid: false,
      riskLevel: "liquidation",
      warningMessage: "borrow amount exceeds available borrowing capacity",
    };
  }

  const newHealthFactor = calculateHealthFactorAfterTransaction(
    position,
    asset,
    borrowAmountUSD,
    "borrow",
  );

  if (newHealthFactor < 1.0) {
    return {
      isValid: false,
      riskLevel: "liquidation",
      warningMessage:
        "this borrow would result in immediate liquidation (Health Factor < 1.0)",
    };
  }

  if (newHealthFactor < 1.1) {
    return {
      isValid: false,
      riskLevel: "liquidation",
      warningMessage:
        "this borrow would put you at extreme risk of liquidation (Health Factor < 1.1)",
    };
  }

  if (newHealthFactor < 1.2) {
    return {
      isValid: false,
      riskLevel: "high",
      warningMessage:
        "this borrow would put you at high risk of liquidation (Health Factor < 1.2)",
    };
  }

  if (newHealthFactor < 1.5) {
    return {
      isValid: true,
      riskLevel: "moderate",
      warningMessage:
        "this borrow would moderately increase your liquidation risk",
    };
  }

  return { isValid: true, riskLevel: "safe" };
};

export const validateRepayTransaction = (): TransactionValidationResult => {
  return {
    isValid: true,
    riskLevel: "safe",
  };
};

export const calculateMaxSafeBorrowUSD = (
  position: PositionData,
  asset: AssetData,
  targetHealthFactor: number = 1.5,
): number => {
  if (position.totalCollateralUSD === 0) return 0;

  const maxTotalDebt =
    (position.totalCollateralUSD * asset.liquidationThreshold) /
    targetHealthFactor;
  const maxBorrowAmount = Math.max(0, maxTotalDebt - position.totalDebtUSD);

  return maxBorrowAmount;
};

export const calculateMaxSafeWithdrawUSD = (
  position: PositionData,
  asset: AssetData,
  assetSuppliedUSD: number,
  targetHealthFactor: number = 1.2,
): number => {
  if (position.totalDebtUSD === 0) return assetSuppliedUSD;

  if (!asset.isCollateral) return assetSuppliedUSD;

  const requiredCollateral =
    (position.totalDebtUSD * targetHealthFactor) / asset.liquidationThreshold;
  const maxWithdrawFromCollateral = Math.max(
    0,
    position.totalCollateralUSD - requiredCollateral,
  );

  return Math.min(assetSuppliedUSD, maxWithdrawFromCollateral);
};

export const validateCollateralTransaction = (
  position: PositionData,
  asset: AssetData,
  assetSuppliedUSD: number,
  isEnabling: boolean,
): TransactionValidationResult => {
  if (isEnabling) {
    return { isValid: true, riskLevel: "safe" };
  }

  if (position.totalDebtUSD === 0) {
    return { isValid: true, riskLevel: "safe" };
  }

  const newHealthFactor = calculateHealthFactorAfterTransaction(
    position,
    { ...asset, isCollateral: true },
    assetSuppliedUSD,
    "withdraw",
  );

  if (newHealthFactor < 1.0) {
    return {
      isValid: false,
      riskLevel: "liquidation",
      warningMessage:
        "disabling this collateral would result in liquidation (Health Factor < 1.0)",
    };
  }

  if (newHealthFactor < 1.1) {
    return {
      isValid: false,
      riskLevel: "liquidation",
      warningMessage:
        "disabling this collateral would put you at extreme risk of liquidation (Health Factor < 1.1)",
    };
  }

  if (newHealthFactor < 1.2) {
    return {
      isValid: false,
      riskLevel: "high",
      warningMessage:
        "disabling this collateral would put you at high risk of liquidation (Health Factor < 1.2)",
    };
  }

  return { isValid: true, riskLevel: "safe" };
};
