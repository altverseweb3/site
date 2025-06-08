// Aave Transaction Functions - For executing transactions
import { ethers } from "ethers";
import { AaveConfig, SupportedChainId } from "./aaveConfig";
import { POOL_ABI, ERC20_ABI } from "./aaveAbis";

export interface TransactionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface SupplyParams {
  tokenAddress: string;
  amount: string;
  tokenDecimals: number;
  tokenSymbol: string;
  userAddress: string;
  chainId: SupportedChainId;
  signer: ethers.Signer;
}

export interface BorrowParams {
  tokenAddress: string;
  amount: string;
  tokenDecimals: number;
  tokenSymbol: string;
  userAddress: string;
  chainId: SupportedChainId;
  interestRateMode: 1 | 2; // 1 = stable, 2 = variable
  signer: ethers.Signer;
}

export interface WithdrawParams {
  tokenAddress: string;
  amount: string; // Use "max" for full withdrawal
  tokenDecimals: number;
  tokenSymbol: string;
  userAddress: string;
  chainId: SupportedChainId;
  signer: ethers.Signer;
}

export interface RepayParams {
  tokenAddress: string;
  amount: string; // Use "max" for full repayment
  tokenDecimals: number;
  tokenSymbol: string;
  userAddress: string;
  chainId: SupportedChainId;
  interestRateMode: 1 | 2;
  signer: ethers.Signer;
}

export interface CollateralParams {
  tokenAddress: string;
  useAsCollateral: boolean;
  tokenSymbol: string;
  userAddress: string;
  chainId: SupportedChainId;
  signer: ethers.Signer;
}

export interface SwapRateModeParams {
  tokenAddress: string;
  currentRateMode: 1 | 2;
  userAddress: string;
  chainId: SupportedChainId;
  signer: ethers.Signer;
}

export interface SwapAssetParams {
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  fromTokenDecimals: number;
  toTokenDecimals: number;
  fromTokenSymbol: string;
  toTokenSymbol: string;
  userAddress: string;
  chainId: SupportedChainId;
  signer: ethers.Signer;
  slippageTolerance?: number; // Default 1%
}

export class AaveTransactions {
  private static async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: string,
    decimals: number,
    signer: ethers.Signer,
  ): Promise<void> {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const amountBN = ethers.parseUnits(amount, decimals);

    // Check current allowance
    const currentAllowance = await tokenContract.allowance(
      await signer.getAddress(),
      spenderAddress,
    );

    if (currentAllowance < amountBN) {
      console.log(`Approving ${amount} tokens for Aave...`);
      const approveTx = await tokenContract.approve(spenderAddress, amountBN);
      await approveTx.wait();
      console.log("Token approval confirmed");
    }
  }

  /**
   * Supply assets to Aave - Using working implementation pattern
   */
  static async supplyAsset(params: SupplyParams): Promise<TransactionResult> {
    try {
      const {
        tokenAddress,
        amount,
        tokenDecimals,
        tokenSymbol,
        userAddress,
        chainId,
        signer,
      } = params;

      console.log(
        `🚀 Starting Aave supply: ${amount} ${tokenSymbol} on chain ${chainId}`,
      );

      if (!AaveConfig.isChainSupported(chainId)) {
        const error = `Chain ${chainId} not supported by Aave. Supported chains: 1 (Ethereum), 10 (Optimism), 56 (BSC), 137 (Polygon), 42161 (Arbitrum), 43114 (Avalanche), 8453 (Base), 11155111 (Sepolia)`;
        console.error("❌", error);
        return { success: false, error };
      }

      const poolAddress = AaveConfig.getPoolAddress(chainId);
      if (!poolAddress) {
        const error = `Pool address not found for chain ${chainId}`;
        console.error("❌", error);
        return { success: false, error };
      }

      console.log(`📍 Using pool address: ${poolAddress}`);

      // Create contracts
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        signer,
      );
      const poolContract = new ethers.Contract(poolAddress, POOL_ABI, signer);
      const amountBN = ethers.parseUnits(amount, tokenDecimals);

      console.log(
        `💰 Amount to supply: ${amountBN.toString()} (${amount} ${tokenSymbol})`,
      );

      // Step 1: Check token balance
      const userBalance = await tokenContract.balanceOf(userAddress);
      console.log(
        `💳 User balance: ${ethers.formatUnits(userBalance, tokenDecimals)} ${tokenSymbol}`,
      );

      if (userBalance < amountBN) {
        const error = `Insufficient balance. You have ${ethers.formatUnits(userBalance, tokenDecimals)} ${tokenSymbol}`;
        console.error("❌", error);
        return { success: false, error };
      }

      // Step 2: Approve token spending
      console.log(`🔐 Checking allowance for pool: ${poolAddress}`);
      const currentAllowance = await tokenContract.allowance(
        userAddress,
        poolAddress,
      );
      console.log(
        `📋 Current allowance: ${ethers.formatUnits(currentAllowance, tokenDecimals)} ${tokenSymbol}`,
      );

      if (currentAllowance < amountBN) {
        console.log(`✅ Approving ${amount} ${tokenSymbol} for Aave pool...`);
        const approveTx = await tokenContract.approve(poolAddress, amountBN);
        console.log(`📤 Approval transaction sent: ${approveTx.hash}`);

        const approveReceipt = await approveTx.wait();
        console.log(
          `✅ Approval confirmed in block: ${approveReceipt.blockNumber}`,
        );
      } else {
        console.log(`✅ Sufficient allowance already exists`);
      }

      // Step 3: Supply to Aave
      console.log(`🏦 Calling supply function with params:`, {
        tokenAddress,
        amount: amountBN.toString(),
        userAddress,
        referralCode: 0,
      });

      const supplyTx = await poolContract.supply(
        tokenAddress,
        amountBN,
        userAddress,
        0, // referral code
      );

      console.log(`📤 Supply transaction sent: ${supplyTx.hash}`);
      const receipt = await supplyTx.wait();
      console.log(`✅ Supply confirmed in block: ${receipt.blockNumber}`);

      return {
        success: true,
        txHash: receipt.hash,
      };
    } catch (error: unknown) {
      console.error("💥 Supply failed:", error);

      // More detailed error reporting
      let errorMessage = "Supply transaction failed";
      if (error.code === "CALL_EXCEPTION") {
        errorMessage =
          "Transaction would fail. Check your balance and allowances.";
      } else if (error.code === "UNPREDICTABLE_GAS_LIMIT") {
        errorMessage = "Cannot estimate gas. Transaction may fail.";
      } else if (error.code === "ACTION_REJECTED") {
        errorMessage = "Transaction was rejected by user";
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Borrow assets from Aave - Using working implementation pattern
   */
  static async borrowAsset(params: BorrowParams): Promise<TransactionResult> {
    try {
      const {
        tokenAddress,
        amount,
        tokenDecimals,
        tokenSymbol,
        userAddress,
        chainId,
        interestRateMode,
        signer,
      } = params;

      console.log(
        `🚀 Starting Aave borrow: ${amount} ${tokenSymbol} on chain ${chainId}`,
      );

      if (!AaveConfig.isChainSupported(chainId)) {
        const error = `Chain ${chainId} not supported by Aave`;
        console.error("❌", error);
        return { success: false, error };
      }

      const poolAddress = AaveConfig.getPoolAddress(chainId);
      if (!poolAddress) {
        const error = `Pool address not found for chain ${chainId}`;
        console.error("❌", error);
        return { success: false, error };
      }

      console.log(`📍 Using pool address: ${poolAddress}`);

      const poolContract = new ethers.Contract(poolAddress, POOL_ABI, signer);
      const amountBN = ethers.parseUnits(amount, tokenDecimals);

      console.log(
        `💰 Amount to borrow: ${amountBN.toString()} (${amount} ${tokenSymbol})`,
      );
      console.log(
        `📊 Interest rate mode: ${interestRateMode === 1 ? "Stable" : "Variable"}`,
      );

      // Set gas limit to avoid estimation errors
      const overrides = {
        gasLimit: 500000,
      };

      console.log(`🏦 Calling borrow function with params:`, {
        tokenAddress,
        amount: amountBN.toString(),
        interestRateMode,
        referralCode: 0,
        userAddress,
      });

      const borrowTx = await poolContract.borrow(
        tokenAddress,
        amountBN,
        interestRateMode,
        0, // referral code
        userAddress,
        overrides,
      );

      console.log(`📤 Borrow transaction sent: ${borrowTx.hash}`);
      const receipt = await borrowTx.wait();
      console.log(`✅ Borrow confirmed in block: ${receipt.blockNumber}`);

      return {
        success: true,
        txHash: receipt.hash,
      };
    } catch (error: unknown) {
      console.error("💥 Borrow failed:", error);

      let errorMessage = "Borrow transaction failed";
      if (error.code === "CALL_EXCEPTION") {
        errorMessage =
          "Borrow would fail. Check your collateral and available borrowing capacity.";
      } else if (error.code === "UNPREDICTABLE_GAS_LIMIT") {
        errorMessage = "Cannot estimate gas. Borrow may fail.";
      } else if (error.code === "ACTION_REJECTED") {
        errorMessage = "Transaction was rejected by user";
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Withdraw assets from Aave - Using working implementation pattern
   */
  static async withdrawAsset(
    params: WithdrawParams,
  ): Promise<TransactionResult> {
    try {
      const {
        tokenAddress,
        amount,
        tokenDecimals,
        tokenSymbol,
        userAddress,
        chainId,
        signer,
      } = params;

      console.log(
        `🚀 Starting Aave withdraw: ${amount} ${tokenSymbol} on chain ${chainId}`,
      );

      if (!AaveConfig.isChainSupported(chainId)) {
        const error = `Chain ${chainId} not supported by Aave`;
        console.error("❌", error);
        return { success: false, error };
      }

      const poolAddress = AaveConfig.getPoolAddress(chainId);
      if (!poolAddress) {
        const error = `Pool address not found for chain ${chainId}`;
        console.error("❌", error);
        return { success: false, error };
      }

      console.log(`📍 Using pool address: ${poolAddress}`);

      const poolContract = new ethers.Contract(poolAddress, POOL_ABI, signer);

      let amountBN: bigint;
      if (amount === "max") {
        // Withdraw maximum amount (use type(uint256).max)
        amountBN = ethers.MaxUint256;
        console.log(`💰 Withdrawing maximum available amount`);
      } else {
        amountBN = ethers.parseUnits(amount, tokenDecimals);
        console.log(
          `💰 Amount to withdraw: ${amountBN.toString()} (${amount} ${tokenSymbol})`,
        );
      }

      // Set gas limit to avoid estimation errors
      const overrides = {
        gasLimit: 500000,
      };

      console.log(`🏦 Calling withdraw function with params:`, {
        tokenAddress,
        amount: amount === "max" ? "MAX" : amountBN.toString(),
        userAddress,
      });

      const withdrawTx = await poolContract.withdraw(
        tokenAddress,
        amountBN,
        userAddress,
        overrides,
      );

      console.log(`📤 Withdraw transaction sent: ${withdrawTx.hash}`);
      const receipt = await withdrawTx.wait();
      console.log(`✅ Withdraw confirmed in block: ${receipt.blockNumber}`);

      return {
        success: true,
        txHash: receipt.hash,
      };
    } catch (error: unknown) {
      console.error("💥 Withdraw failed:", error);

      let errorMessage = "Withdraw transaction failed";
      if (error.code === "CALL_EXCEPTION") {
        errorMessage = "Withdraw would fail. Check your supplied balance.";
      } else if (error.code === "UNPREDICTABLE_GAS_LIMIT") {
        errorMessage = "Cannot estimate gas. Withdraw may fail.";
      } else if (error.code === "ACTION_REJECTED") {
        errorMessage = "Transaction was rejected by user";
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Repay borrowed assets to Aave - Using working implementation pattern
   */
  static async repayAsset(params: RepayParams): Promise<TransactionResult> {
    try {
      const {
        tokenAddress,
        amount,
        tokenDecimals,
        tokenSymbol,
        userAddress,
        chainId,
        interestRateMode,
        signer,
      } = params;

      console.log(
        `🚀 Starting Aave repay: ${amount} ${tokenSymbol} on chain ${chainId}`,
      );

      if (!AaveConfig.isChainSupported(chainId)) {
        const error = `Chain ${chainId} not supported by Aave. Supported chains: 1 (Ethereum), 10 (Optimism), 56 (BSC), 137 (Polygon), 42161 (Arbitrum), 43114 (Avalanche), 8453 (Base), 11155111 (Sepolia)`;
        console.error("❌", error);
        return { success: false, error };
      }

      const poolAddress = AaveConfig.getPoolAddress(chainId);
      if (!poolAddress) {
        const error = `Pool address not found for chain ${chainId}`;
        console.error("❌", error);
        return { success: false, error };
      }

      console.log(`📍 Using pool address: ${poolAddress}`);

      // Create contracts
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        signer,
      );
      const poolContract = new ethers.Contract(poolAddress, POOL_ABI, signer);

      let amountBN: bigint;
      if (amount === "max") {
        amountBN = ethers.MaxUint256;
        console.log(`💰 Repaying maximum debt amount`);
      } else {
        amountBN = ethers.parseUnits(amount, tokenDecimals);
        console.log(
          `💰 Amount to repay: ${amountBN.toString()} (${amount} ${tokenSymbol})`,
        );
      }

      console.log(
        `📊 Interest rate mode: ${interestRateMode === 1 ? "Stable" : "Variable"}`,
      );

      // Step 1: Check token balance for repayment
      const userBalance = await tokenContract.balanceOf(userAddress);
      console.log(
        `💳 User balance: ${ethers.formatUnits(userBalance, tokenDecimals)} ${tokenSymbol}`,
      );

      if (amount !== "max" && userBalance < amountBN) {
        const error = `Insufficient balance for repayment. You have ${ethers.formatUnits(userBalance, tokenDecimals)} ${tokenSymbol}`;
        console.error("❌", error);
        return { success: false, error };
      }

      // Step 2: Approve token spending for repayment (critical step!)
      console.log(`🔐 Checking allowance for pool: ${poolAddress}`);
      const currentAllowance = await tokenContract.allowance(
        userAddress,
        poolAddress,
      );
      console.log(
        `📋 Current allowance: ${ethers.formatUnits(currentAllowance, tokenDecimals)} ${tokenSymbol}`,
      );

      if (amount === "max" || currentAllowance < amountBN) {
        const approveAmount = amount === "max" ? ethers.MaxUint256 : amountBN;
        console.log(
          `✅ Approving ${amount === "max" ? "maximum" : amount} ${tokenSymbol} for Aave repayment...`,
        );
        const approveTx = await tokenContract.approve(
          poolAddress,
          approveAmount,
        );
        console.log(`📤 Approval transaction sent: ${approveTx.hash}`);

        const approveReceipt = await approveTx.wait();
        console.log(
          `✅ Approval confirmed in block: ${approveReceipt.blockNumber}`,
        );
      } else {
        console.log(`✅ Sufficient allowance already exists`);
      }

      // Step 3: Repay to Aave
      const overrides = {
        gasLimit: 500000,
      };

      console.log(`🏦 Calling repay function with params:`, {
        tokenAddress,
        amount: amount === "max" ? "MAX" : amountBN.toString(),
        interestRateMode,
        userAddress,
      });

      const repayTx = await poolContract.repay(
        tokenAddress,
        amountBN,
        interestRateMode,
        userAddress,
        overrides,
      );

      console.log(`📤 Repay transaction sent: ${repayTx.hash}`);
      const receipt = await repayTx.wait();
      console.log(`✅ Repay confirmed in block: ${receipt.blockNumber}`);

      return {
        success: true,
        txHash: receipt.hash,
      };
    } catch (error: unknown) {
      console.error("💥 Repay failed:", error);

      let errorMessage = "Repay transaction failed";
      if (error.code === "CALL_EXCEPTION") {
        errorMessage =
          "Repay would fail. Check your token balance and debt amount.";
      } else if (error.code === "UNPREDICTABLE_GAS_LIMIT") {
        errorMessage = "Cannot estimate gas. Repay may fail.";
      } else if (error.code === "ACTION_REJECTED") {
        errorMessage = "Transaction was rejected by user";
      } else if (error.message) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Set asset as collateral or remove from collateral
   */
  static async setCollateral(
    params: CollateralParams,
  ): Promise<TransactionResult> {
    try {
      const { tokenAddress, useAsCollateral, chainId, signer } = params;

      if (!AaveConfig.isChainSupported(chainId)) {
        return { success: false, error: `Chain ${chainId} not supported` };
      }

      const poolAddress = AaveConfig.getPoolAddress(chainId);
      if (!poolAddress) {
        return {
          success: false,
          error: `Pool address not found for chain ${chainId}`,
        };
      }

      const poolContract = new ethers.Contract(poolAddress, POOL_ABI, signer);

      console.log(
        `${useAsCollateral ? "Enabling" : "Disabling"} collateral for asset...`,
      );
      const collateralTx = await poolContract.setUserUseReserveAsCollateral(
        tokenAddress,
        useAsCollateral,
      );

      const receipt = await collateralTx.wait();
      console.log("Collateral setting confirmed");

      return {
        success: true,
        txHash: receipt.hash,
      };
    } catch (error: unknown) {
      console.error("Set collateral failed:", error);
      return {
        success: false,
        error: error.message || "Set collateral transaction failed",
      };
    }
  }

  /**
   * Swap borrow rate mode (stable <-> variable)
   */
  static async swapBorrowRateMode(
    params: SwapRateModeParams,
  ): Promise<TransactionResult> {
    try {
      const { tokenAddress, currentRateMode, chainId, signer } = params;

      if (!AaveConfig.isChainSupported(chainId)) {
        return { success: false, error: `Chain ${chainId} not supported` };
      }

      const poolAddress = AaveConfig.getPoolAddress(chainId);
      if (!poolAddress) {
        return {
          success: false,
          error: `Pool address not found for chain ${chainId}`,
        };
      }

      const poolContract = new ethers.Contract(poolAddress, POOL_ABI, signer);

      console.log(
        `Swapping borrow rate mode from ${currentRateMode === 1 ? "stable" : "variable"} to ${currentRateMode === 1 ? "variable" : "stable"}...`,
      );
      const swapTx = await poolContract.swapBorrowRateMode(
        tokenAddress,
        currentRateMode,
      );

      const receipt = await swapTx.wait();
      console.log("Rate mode swap confirmed");

      return {
        success: true,
        txHash: receipt.hash,
      };
    } catch (error: unknown) {
      console.error("Swap rate mode failed:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Swap rate mode transaction failed",
      };
    }
  }

  /**
   * Swap one supplied asset for another in Aave
   * This performs: withdraw fromToken -> supply toToken
   */
  static async swapSuppliedAssets(
    params: SwapAssetParams,
  ): Promise<TransactionResult> {
    try {
      const {
        fromTokenAddress,
        toTokenAddress,
        amount,
        fromTokenDecimals,
        toTokenDecimals,
        fromTokenSymbol,
        toTokenSymbol,
        userAddress,
        chainId,
        signer,
      } = params;

      console.log(
        `🔄 Starting Aave asset swap: ${amount} ${fromTokenSymbol} → ${toTokenSymbol}`,
      );

      if (!AaveConfig.isChainSupported(chainId)) {
        return { success: false, error: `Chain ${chainId} not supported` };
      }

      const poolAddress = AaveConfig.getPoolAddress(chainId);
      if (!poolAddress) {
        return {
          success: false,
          error: `Pool address not found for chain ${chainId}`,
        };
      }

      // Step 1: Withdraw the source asset
      console.log(`📤 Step 1: Withdrawing ${amount} ${fromTokenSymbol}`);
      const withdrawResult = await this.withdrawAsset({
        tokenAddress: fromTokenAddress,
        amount,
        tokenDecimals: fromTokenDecimals,
        tokenSymbol: fromTokenSymbol,
        userAddress,
        chainId,
        signer,
      });

      if (!withdrawResult.success) {
        return {
          success: false,
          error: `Withdraw failed: ${withdrawResult.error}`,
        };
      }

      console.log(`✅ Step 1 complete: Withdrawn ${fromTokenSymbol}`);

      // Step 2: Get the withdrawn amount and convert it to the target token
      // For this implementation, we'll use the same amount assuming 1:1 ratio
      // In a real implementation, you'd use a price oracle or DEX quote
      const amountBN = ethers.parseUnits(amount, fromTokenDecimals);
      const targetAmount = ethers.formatUnits(amountBN, toTokenDecimals);

      console.log(`📥 Step 2: Supplying ${targetAmount} ${toTokenSymbol}`);

      // Step 3: Supply the target asset
      const supplyResult = await this.supplyAsset({
        tokenAddress: toTokenAddress,
        amount: targetAmount,
        tokenDecimals: toTokenDecimals,
        tokenSymbol: toTokenSymbol,
        userAddress,
        chainId,
        signer,
      });

      if (!supplyResult.success) {
        return {
          success: false,
          error: `Supply failed after withdraw: ${supplyResult.error}. You may need to manually supply ${toTokenSymbol}.`,
        };
      }

      console.log(
        `✅ Asset swap completed: ${fromTokenSymbol} → ${toTokenSymbol}`,
      );

      return {
        success: true,
        txHash: supplyResult.txHash, // Return the final transaction hash
      };
    } catch (error: unknown) {
      console.error("Asset swap failed:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Asset swap transaction failed",
      };
    }
  }

  /**
   * Swap one borrowed asset for another in Aave
   * This performs: borrow toToken -> repay fromToken
   */
  static async swapBorrowedAssets(
    params: SwapAssetParams & { interestRateMode: 1 | 2 },
  ): Promise<TransactionResult> {
    try {
      const {
        fromTokenAddress,
        toTokenAddress,
        amount,
        fromTokenDecimals,
        toTokenDecimals,
        fromTokenSymbol,
        toTokenSymbol,
        userAddress,
        chainId,
        signer,
        interestRateMode,
      } = params;

      console.log(
        `🔄 Starting Aave borrow swap: ${amount} ${fromTokenSymbol} debt → ${toTokenSymbol} debt`,
      );

      if (!AaveConfig.isChainSupported(chainId)) {
        return { success: false, error: `Chain ${chainId} not supported` };
      }

      // Step 1: Borrow the target asset
      console.log(`📥 Step 1: Borrowing ${amount} ${toTokenSymbol}`);
      const borrowResult = await this.borrowAsset({
        tokenAddress: toTokenAddress,
        amount,
        tokenDecimals: toTokenDecimals,
        tokenSymbol: toTokenSymbol,
        userAddress,
        chainId,
        interestRateMode,
        signer,
      });

      if (!borrowResult.success) {
        return {
          success: false,
          error: `Borrow failed: ${borrowResult.error}`,
        };
      }

      console.log(`✅ Step 1 complete: Borrowed ${toTokenSymbol}`);

      // Step 2: Use the borrowed tokens to repay the original debt
      console.log(`📤 Step 2: Repaying ${amount} ${fromTokenSymbol} debt`);
      const repayResult = await this.repayAsset({
        tokenAddress: fromTokenAddress,
        amount,
        tokenDecimals: fromTokenDecimals,
        tokenSymbol: fromTokenSymbol,
        userAddress,
        chainId,
        interestRateMode,
        signer,
      });

      if (!repayResult.success) {
        return {
          success: false,
          error: `Repay failed after borrow: ${repayResult.error}. You now have additional ${toTokenSymbol} debt.`,
        };
      }

      console.log(
        `✅ Borrow swap completed: ${fromTokenSymbol} debt → ${toTokenSymbol} debt`,
      );

      return {
        success: true,
        txHash: repayResult.txHash, // Return the final transaction hash
      };
    } catch (error: unknown) {
      console.error("Borrow swap failed:", error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Borrow swap transaction failed",
      };
    }
  }
}
