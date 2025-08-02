// Aave interaction hooks for transactions
import { ethers } from "ethers";
import { useReownWalletProviderAndSigner } from "@/utils/wallet/reownEthersUtils";
import { POOL_ABI } from "@/types/aaveV3ABIs";
import { SupportedChainId } from "@/config/aave";
import { ERC20_ABI } from "@/types/ERC20ABI";
import {
  isChainSupported,
  getPoolAddress,
  checkBalance,
  getAllowance,
  getUserAccountData,
  canDisableCollateral,
} from "@/utils/aave/fetch";
import {
  WithdrawParams,
  WithdrawResult,
  SupplyParams,
  SupplyResult,
  CollateralParams,
  CollateralResult,
  BorrowParams,
  BorrowResult,
  RepayParams,
  RepayResult,
  RateMode,
} from "@/types/aave";
import { useCallback } from "react";

/**
 * Withdraw asset from Aave protocol
 */
export async function withdrawAsset(
  params: WithdrawParams,
): Promise<WithdrawResult> {
  const {
    tokenAddress,
    amount,
    tokenDecimals,
    tokenSymbol,
    userAddress,
    chainId,
    signer,
  } = params;

  try {
    console.log(
      `🏦 Starting withdrawal transaction for ${amount} ${tokenSymbol}`,
    );

    if (!isChainSupported(chainId)) {
      throw new Error(`Chain ${chainId} not supported`);
    }

    const poolAddress = getPoolAddress(chainId);

    // Convert amount to wei
    const amountWei = ethers.parseUnits(amount, tokenDecimals);
    console.log(`💰 Amount in wei: ${amountWei.toString()}`);

    // Create pool contract
    const poolContract = new ethers.Contract(poolAddress, POOL_ABI, signer);

    // Execute withdrawal transaction
    // Note: Aave withdraw function takes (asset, amount, to)
    // If amount is uint256.max, it withdraws the full balance
    console.log(`📤 Executing withdrawal transaction...`);
    const withdrawTx = await poolContract.withdraw(
      tokenAddress,
      amountWei,
      userAddress, // to address (where to send the withdrawn tokens)
    );

    console.log(`⏳ Withdrawal transaction sent: ${withdrawTx.hash}`);
    await withdrawTx.wait();
    console.log(`✅ Withdrawal transaction confirmed`);

    return {
      success: true,
      txHash: withdrawTx.hash,
    };
  } catch (error) {
    console.error("❌ Withdrawal transaction failed:", error);

    // Handle specific error cases
    let errorMessage = "Unknown error occurred";
    if (error instanceof Error) {
      if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas fees";
      } else if (error.message.includes("user rejected")) {
        errorMessage = "Transaction rejected by user";
      } else if (error.message.includes("health factor")) {
        errorMessage =
          "Withdrawal would put your account at risk of liquidation";
      } else if (error.message.includes("insufficient balance")) {
        errorMessage = "Insufficient supplied balance to withdraw this amount";
      } else if (error.message.includes("withdraw amount exceeds")) {
        errorMessage = "Withdrawal amount exceeds available balance";
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Supply asset to Aave protocol
 */
export async function supplyAsset(params: SupplyParams): Promise<SupplyResult> {
  const {
    tokenAddress,
    amount,
    tokenDecimals,
    tokenSymbol,
    userAddress,
    chainId,
    signer,
  } = params;

  try {
    console.log(`🏦 Starting supply transaction for ${amount} ${tokenSymbol}`);

    if (!isChainSupported(chainId)) {
      throw new Error(`Chain ${chainId} not supported`);
    }

    const poolAddress = getPoolAddress(chainId);

    // Convert amount to wei
    const amountWei = ethers.parseUnits(amount, tokenDecimals);
    console.log(`💰 Amount in wei: ${amountWei.toString()}`);

    // Create contracts
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const poolContract = new ethers.Contract(poolAddress, POOL_ABI, signer);

    // Check current allowance
    const currentAllowance = await tokenContract.allowance(
      userAddress,
      poolAddress,
    );
    console.log(
      `📋 Current allowance: ${ethers.formatUnits(currentAllowance, tokenDecimals)}`,
    );

    // Approve if needed
    if (currentAllowance < amountWei) {
      console.log(`🔓 Approving ${tokenSymbol} for supply...`);
      const approveTx = await tokenContract.approve(poolAddress, amountWei);
      console.log(`⏳ Approval transaction sent: ${approveTx.hash}`);

      await approveTx.wait();
      console.log(`✅ Approval confirmed`);
    }

    // Execute supply transaction
    console.log(`📤 Executing supply transaction...`);
    const supplyTx = await poolContract.supply(
      tokenAddress,
      amountWei,
      userAddress,
      0, // referral code
    );

    console.log(`⏳ Supply transaction sent: ${supplyTx.hash}`);
    await supplyTx.wait();
    console.log(`✅ Supply transaction confirmed`);

    return {
      success: true,
      txHash: supplyTx.hash,
    };
  } catch (error) {
    console.error("❌ Supply transaction failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Set user's reserve as collateral
 */
export async function setUserUseReserveAsCollateral(
  params: CollateralParams,
): Promise<CollateralResult> {
  const { tokenAddress, useAsCollateral, tokenSymbol, chainId, signer } =
    params;

  try {
    console.log(
      `🛡️ ${useAsCollateral ? "Enabling" : "Disabling"} ${tokenSymbol} as collateral`,
    );

    if (!isChainSupported(chainId)) {
      throw new Error(`Chain ${chainId} not supported`);
    }

    const poolAddress = getPoolAddress(chainId);

    // Create pool contract
    const poolContract = new ethers.Contract(poolAddress, POOL_ABI, signer);

    // Execute collateral toggle transaction
    console.log(`📤 Executing collateral toggle transaction...`);
    const collateralTx = await poolContract.setUserUseReserveAsCollateral(
      tokenAddress,
      useAsCollateral,
    );

    console.log(`⏳ Collateral transaction sent: ${collateralTx.hash}`);
    await collateralTx.wait();
    console.log(`✅ Collateral transaction confirmed`);

    return {
      success: true,
      txHash: collateralTx.hash,
    };
  } catch (error) {
    console.error("❌ Collateral transaction failed:", error);

    // Handle specific error cases
    let errorMessage = "Unknown error occurred";
    if (error instanceof Error) {
      if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas fees";
      } else if (error.message.includes("user rejected")) {
        errorMessage = "Transaction rejected by user";
      } else if (error.message.includes("health factor")) {
        errorMessage =
          "Transaction would put your account at risk of liquidation";
      } else if (error.message.includes("not enough collateral")) {
        errorMessage =
          "Cannot disable collateral - would cause insufficient collateral";
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Borrow asset from Aave protocol
 */
export async function borrowAsset(params: BorrowParams): Promise<BorrowResult> {
  const {
    tokenAddress,
    amount,
    rateMode,
    tokenDecimals,
    tokenSymbol,
    userAddress,
    chainId,
    signer,
  } = params;

  try {
    console.log(
      `🏦 Starting borrow transaction for ${amount} ${tokenSymbol} at ${rateMode === RateMode.Stable ? "stable" : "variable"} rate`,
    );

    if (!isChainSupported(chainId)) {
      throw new Error(`Chain ${chainId} not supported`);
    }

    const poolAddress = getPoolAddress(chainId);

    // Convert amount to wei
    const amountWei = ethers.parseUnits(amount, tokenDecimals);
    console.log(`💰 Amount in wei: ${amountWei.toString()}`);

    // Create pool contract
    const poolContract = new ethers.Contract(poolAddress, POOL_ABI, signer);

    // Execute borrow transaction
    // Aave borrow function: borrow(asset, amount, interestRateMode, referralCode, onBehalfOf)
    console.log(`📤 Executing borrow transaction...`);
    const borrowTx = await poolContract.borrow(
      tokenAddress, // asset to borrow
      amountWei, // amount to borrow
      rateMode, // interest rate mode (RateMode.Stable = 1, RateMode.Variable = 2)
      0, // referral code
      userAddress, // on behalf of (borrower address)
    );

    console.log(`⏳ Borrow transaction sent: ${borrowTx.hash}`);
    await borrowTx.wait();
    console.log(`✅ Borrow transaction confirmed`);

    return {
      success: true,
      txHash: borrowTx.hash,
    };
  } catch (error) {
    console.error("❌ Borrow transaction failed:", error);

    // Handle specific error cases
    let errorMessage = "Unknown error occurred";
    if (error instanceof Error) {
      if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas fees";
      } else if (error.message.includes("user rejected")) {
        errorMessage = "Transaction rejected by user";
      } else if (error.message.includes("health factor")) {
        errorMessage =
          "Borrowing would put your account at risk of liquidation";
      } else if (error.message.includes("collateral cannot cover")) {
        errorMessage = "Insufficient collateral to cover this borrow";
      } else if (error.message.includes("borrow cap")) {
        errorMessage = "Asset has reached its borrow cap";
      } else if (error.message.includes("reserve inactive")) {
        errorMessage = "Asset is not available for borrowing";
      } else if (error.message.includes("stable borrowing not enabled")) {
        errorMessage = "Stable rate borrowing is not enabled for this asset";
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Repay borrowed asset to Aave protocol
 */
export async function repayAsset(params: RepayParams): Promise<RepayResult> {
  const {
    tokenAddress,
    amount,
    rateMode,
    tokenDecimals,
    tokenSymbol,
    userAddress,
    chainId,
    signer,
  } = params;

  try {
    console.log(
      `💳 Starting repay transaction for ${amount} ${tokenSymbol} (${rateMode === RateMode.Stable ? "stable" : "variable"} debt)`,
    );

    if (!isChainSupported(chainId)) {
      throw new Error(`Chain ${chainId} not supported`);
    }

    const poolAddress = getPoolAddress(chainId);

    // Convert amount to wei
    const amountWei = ethers.parseUnits(amount, tokenDecimals);
    console.log(`💰 Amount in wei: ${amountWei.toString()}`);

    // Check user's token balance
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const userBalance = await tokenContract.balanceOf(userAddress);

    if (userBalance < amountWei) {
      throw new Error(`Insufficient ${tokenSymbol} balance for repayment`);
    }

    // Check and approve if necessary
    console.log(`🔍 Checking allowance for ${tokenSymbol}...`);
    const currentAllowance = await tokenContract.allowance(
      userAddress,
      poolAddress,
    );

    if (currentAllowance < amountWei) {
      console.log(`📝 Approving ${tokenSymbol} for repayment...`);
      const approveTx = await tokenContract.approve(poolAddress, amountWei);
      console.log(`⏳ Approval transaction sent: ${approveTx.hash}`);
      await approveTx.wait();
      console.log(`✅ Approval confirmed`);
    }

    // Create pool contract
    const poolContract = new ethers.Contract(poolAddress, POOL_ABI, signer);

    // Execute repay transaction
    // Aave repay function: repay(asset, amount, rateMode, onBehalfOf)
    console.log(`📤 Executing repay transaction...`);
    const repayTx = await poolContract.repay(
      tokenAddress, // asset to repay
      amountWei, // amount to repay
      rateMode, // interest rate mode (RateMode.Stable = 1, RateMode.Variable = 2)
      userAddress, // on behalf of (borrower address)
    );

    console.log(`⏳ Repay transaction sent: ${repayTx.hash}`);
    await repayTx.wait();
    console.log(`✅ Repay transaction confirmed`);

    return {
      success: true,
      txHash: repayTx.hash,
    };
  } catch (error) {
    console.error("❌ Repay transaction failed:", error);

    // Handle specific error cases
    let errorMessage = "Unknown error occurred";
    if (error instanceof Error) {
      if (error.message.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for gas fees";
      } else if (error.message.includes("user rejected")) {
        errorMessage = "Transaction rejected by user";
      } else if (
        error.message.includes("Insufficient") &&
        error.message.includes("balance")
      ) {
        errorMessage = `Insufficient ${tokenSymbol} balance for repayment`;
      } else if (error.message.includes("no debt")) {
        errorMessage = "No debt to repay for this asset";
      } else if (error.message.includes("amount exceeds debt")) {
        errorMessage = "Repay amount exceeds current debt";
      } else if (error.message.includes("reserve inactive")) {
        errorMessage = "Asset repayment is currently unavailable";
      } else {
        errorMessage = error.message;
      }
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Hook for Aave interaction functions
 */
export function useAaveInteract() {
  const { getEvmSigner } = useReownWalletProviderAndSigner();

  const withdraw = useCallback(
    async (params: Omit<WithdrawParams, "signer">) => {
      const signer = await getEvmSigner();
      return withdrawAsset({ ...params, signer });
    },
    [getEvmSigner],
  );

  const supply = useCallback(
    async (params: Omit<SupplyParams, "signer">) => {
      const signer = await getEvmSigner();
      return supplyAsset({ ...params, signer });
    },
    [getEvmSigner],
  );

  const setCollateral = useCallback(
    async (params: Omit<CollateralParams, "signer">) => {
      const signer = await getEvmSigner();
      return setUserUseReserveAsCollateral({ ...params, signer });
    },
    [getEvmSigner],
  );

  const borrow = useCallback(
    async (params: Omit<BorrowParams, "signer">) => {
      const signer = await getEvmSigner();
      return borrowAsset({ ...params, signer });
    },
    [getEvmSigner],
  );

  const repay = useCallback(
    async (params: Omit<RepayParams, "signer">) => {
      const signer = await getEvmSigner();
      return repayAsset({ ...params, signer });
    },
    [getEvmSigner],
  );

  const getAccountData = useCallback(
    async (userAddress: string, chainId: SupportedChainId) => {
      const signer = await getEvmSigner();
      const provider = signer.provider;
      if (!provider) {
        throw new Error("Signer must have a provider");
      }
      return getUserAccountData(userAddress, chainId, provider);
    },
    [getEvmSigner],
  );

  const checkUserBalance = useCallback(
    async (
      tokenAddress: string,
      userAddress: string,
      amount: string,
      tokenDecimals: number,
    ) => {
      const signer = await getEvmSigner();
      const provider = signer.provider;
      if (!provider) {
        throw new Error("Signer must have a provider");
      }
      return checkBalance(
        tokenAddress,
        userAddress,
        amount,
        tokenDecimals,
        provider,
      );
    },
    [getEvmSigner],
  );

  const getUserAllowance = useCallback(
    async (
      tokenAddress: string,
      userAddress: string,
      chainId: SupportedChainId,
      tokenDecimals: number,
    ) => {
      const signer = await getEvmSigner();
      return getAllowance(
        tokenAddress,
        userAddress,
        chainId,
        tokenDecimals,
        signer,
      );
    },
    [getEvmSigner],
  );

  const checkCollateralSafety = useCallback(
    async (
      tokenAddress: string,
      userAddress: string,
      chainId: SupportedChainId,
    ) => {
      const signer = await getEvmSigner();
      const provider = signer.provider;
      if (!provider) {
        throw new Error("Signer must have a provider");
      }
      return canDisableCollateral(tokenAddress, userAddress, chainId, provider);
    },
    [getEvmSigner],
  );

  return {
    withdraw,
    supply,
    setCollateral,
    borrow,
    repay,
    getAccountData,
    checkUserBalance,
    getUserAllowance,
    checkCollateralSafety,
  };
}
