// Transaction validation utilities for Aave lending operations

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

// Calculate health factor after a transaction
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

  if (newDebtUSD === 0) return 999; // No debt = infinite health factor

  const adjustedCollateral = newCollateralUSD * asset.liquidationThreshold;
  return adjustedCollateral / newDebtUSD;
};

// Validate supply transaction
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

  // Supply transactions generally improve or maintain health factor
  return {
    isValid: true,
    riskLevel: "safe",
  };
};

// Validate withdraw transaction
export const validateWithdrawTransaction = (
  position: PositionData,
  asset: AssetData,
  withdrawAmountUSD: number,
): TransactionValidationResult => {
  // If no debt, withdrawal is always safe
  if (position.totalDebtUSD === 0) {
    return { isValid: true, riskLevel: "safe" };
  }

  // If asset is not used as collateral, withdrawal doesn't affect health factor
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

// Validate borrow transaction
export const validateBorrowTransaction = (
  position: PositionData,
  asset: AssetData,
  borrowAmountUSD: number,
  availableToBorrowUSD: number,
): TransactionValidationResult => {
  // Check if borrow amount exceeds available
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

// Validate repay transaction
export const validateRepayTransaction = (): TransactionValidationResult => {
  // Repay transactions always improve or maintain health factor
  return {
    isValid: true,
    riskLevel: "safe",
  };
};

// Calculate maximum safe borrow amount
export const calculateMaxSafeBorrowUSD = (
  position: PositionData,
  asset: AssetData,
  targetHealthFactor: number = 1.5,
): number => {
  if (position.totalCollateralUSD === 0) return 0;

  // Max total debt = (total collateral * LT) / target HF
  const maxTotalDebt =
    (position.totalCollateralUSD * asset.liquidationThreshold) /
    targetHealthFactor;
  const maxBorrowAmount = Math.max(0, maxTotalDebt - position.totalDebtUSD);

  return maxBorrowAmount;
};

// Calculate maximum safe withdraw amount
export const calculateMaxSafeWithdrawUSD = (
  position: PositionData,
  asset: AssetData,
  assetSuppliedUSD: number,
  targetHealthFactor: number = 1.2,
): number => {
  // If no debt, can withdraw everything
  if (position.totalDebtUSD === 0) return assetSuppliedUSD;

  // If asset is not collateral, can withdraw everything
  if (!asset.isCollateral) return assetSuppliedUSD;

  // Required collateral = (total debt * target HF) / LT
  const requiredCollateral =
    (position.totalDebtUSD * targetHealthFactor) / asset.liquidationThreshold;
  const maxWithdrawFromCollateral = Math.max(
    0,
    position.totalCollateralUSD - requiredCollateral,
  );

  // Can't withdraw more than supplied
  return Math.min(assetSuppliedUSD, maxWithdrawFromCollateral);
};

// Validate collateral enable/disable
export const validateCollateralTransaction = (
  position: PositionData,
  asset: AssetData,
  assetSuppliedUSD: number,
  isEnabling: boolean,
): TransactionValidationResult => {
  // If enabling collateral, it's always safe (improves health factor)
  if (isEnabling) {
    return { isValid: true, riskLevel: "safe" };
  }

  // If no debt, disabling is safe
  if (position.totalDebtUSD === 0) {
    return { isValid: true, riskLevel: "safe" };
  }

  // Calculate health factor if we remove this asset from collateral
  const newHealthFactor = calculateHealthFactorAfterTransaction(
    position,
    { ...asset, isCollateral: true }, // Treat as collateral for calculation
    assetSuppliedUSD,
    "withdraw", // Simulate removing from collateral
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
