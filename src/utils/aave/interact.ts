// Aave Data Provider - For fetching information from contracts
import { ethers } from "ethers";
import { AaveSDK } from "./aaveSDK";
import { ERC20_ABI, POOL_ABI } from "../../types/aaveV3Abis";
import { SupportedChainId } from "@/config/aave";

export interface UserAccountData {
  totalCollateralBase: string;
  totalDebtBase: string;
  availableBorrowsBase: string;
  currentLiquidationThreshold: number;
  ltv: number;
  healthFactor: string;
}

export interface UserReserveData {
  currentATokenBalance: string;
  currentStableDebt: string;
  currentVariableDebt: string;
  principalStableDebt: string;
  scaledVariableDebt: string;
  stableBorrowRate: string;
  liquidityRate: string;
  stableRateLastUpdated: number;
  usageAsCollateralEnabled: boolean;
}

export interface ReserveData {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  supplyAPY: number;
  variableBorrowAPY: number;
  stableBorrowAPY: number;
  totalSupplied: string;
  totalSuppliedUSD: string;
  availableLiquidity: string;
  utilizationRate: number;
  canBeCollateral: boolean;
  maxLTV: number;
  liquidationThreshold: number;
  liquidationPenalty: number;
  isActive: boolean;
  isFrozen: boolean;
  borrowingEnabled: boolean;
  stableBorrowRateEnabled: boolean;
  oraclePrice: number;
}

export interface SupplyResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface CollateralResult {
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

export interface CollateralParams {
  tokenAddress: string;
  useAsCollateral: boolean;
  tokenSymbol: string;
  userAddress: string;
  chainId: SupportedChainId;
  signer: ethers.Signer;
}

export interface WithdrawResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface WithdrawParams {
  tokenAddress: string;
  amount: string;
  tokenDecimals: number;
  tokenSymbol: string;
  userAddress: string;
  chainId: SupportedChainId;
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

export interface WithdrawResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface WithdrawParams {
  tokenAddress: string;
  amount: string;
  tokenDecimals: number;
  tokenSymbol: string;
  userAddress: string;
  chainId: SupportedChainId;
  signer: ethers.Signer;
}

export class AaveTransactions {
  static async withdrawAsset(params: WithdrawParams): Promise<WithdrawResult> {
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

      if (!AaveSDK.isChainSupported(chainId)) {
        throw new Error(`Chain ${chainId} not supported`);
      }

      const poolAddress = AaveSDK.getPoolAddress(chainId);

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
          errorMessage =
            "Insufficient supplied balance to withdraw this amount";
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

  static async withdrawAsset(params: WithdrawParams): Promise<WithdrawResult> {
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

      if (!AaveSDK.isChainSupported(chainId)) {
        throw new Error(`Chain ${chainId} not supported`);
      }

      const poolAddress = AaveSDK.getPoolAddress(chainId);

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
          errorMessage =
            "Insufficient supplied balance to withdraw this amount";
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

  static async setUserUseReserveAsCollateral(
    params: CollateralParams,
  ): Promise<CollateralResult> {
    const { tokenAddress, useAsCollateral, tokenSymbol, chainId, signer } =
      params;

    try {
      console.log(
        `🛡️ ${useAsCollateral ? "Enabling" : "Disabling"} ${tokenSymbol} as collateral`,
      );

      if (!AaveSDK.isChainSupported(chainId)) {
        throw new Error(`Chain ${chainId} not supported`);
      }

      const poolAddress = AaveSDK.getPoolAddress(chainId);

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
   * Supply asset to Aave protocol
   */
  static async supplyAsset(params: SupplyParams): Promise<SupplyResult> {
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
        `🏦 Starting supply transaction for ${amount} ${tokenSymbol}`,
      );

      if (!AaveSDK.isChainSupported(chainId)) {
        throw new Error(`Chain ${chainId} not supported`);
      }

      const poolAddress = AaveSDK.getPoolAddress(chainId);

      // Convert amount to wei
      const amountWei = ethers.parseUnits(amount, tokenDecimals);
      console.log(`💰 Amount in wei: ${amountWei.toString()}`);

      // Create contracts
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        signer,
      );
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
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  static async setUserUseReserveAsCollateral(
    params: CollateralParams,
  ): Promise<CollateralResult> {
    const { tokenAddress, useAsCollateral, tokenSymbol, chainId, signer } =
      params;

    try {
      console.log(
        `🛡️ ${useAsCollateral ? "Enabling" : "Disabling"} ${tokenSymbol} as collateral`,
      );

      if (!AaveSDK.isChainSupported(chainId)) {
        throw new Error(`Chain ${chainId} not supported`);
      }

      const poolAddress = AaveSDK.getPoolAddress(chainId);

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
   * Check if user has sufficient balance
   */
  static async checkBalance(
    tokenAddress: string,
    userAddress: string,
    amount: string,
    tokenDecimals: number,
  ): Promise<boolean> {
    try {
      const provider = new ethers.BrowserProvider(
        window.ethereum as unknown as ethers.Eip1193Provider,
      );
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        provider,
      );

      const balance = await tokenContract.balanceOf(userAddress);
      const amountWei = ethers.parseUnits(amount, tokenDecimals);

      return balance >= amountWei;
    } catch (error) {
      console.error("Error checking balance:", error);
      return false;
    }
  }

  /**
   * Get current allowance for Aave pool
   */
  static async getAllowance(
    tokenAddress: string,
    userAddress: string,
    chainId: SupportedChainId,
    tokenDecimals: number,
  ): Promise<string> {
    try {
      const poolAddress = AaveSDK.getPoolAddress(chainId);

      const provider = new ethers.BrowserProvider(
        window.ethereum as unknown as ethers.Eip1193Provider,
      );
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        provider,
      );

      const allowance = await tokenContract.allowance(userAddress, poolAddress);
      return ethers.formatUnits(allowance, tokenDecimals);
    } catch (error) {
      console.error("Error getting allowance:", error);
      return "0";
    }
  }

  /**
   * Get user account data (health factor, total collateral, etc.)
   */
  static async getUserAccountData(
    userAddress: string,
    chainId: SupportedChainId,
  ): Promise<UserAccountData | null> {
    try {
      if (!AaveSDK.isChainSupported(chainId)) {
        throw new Error(`Chain ${chainId} not supported`);
      }

      const poolAddress = AaveSDK.getPoolAddress(chainId);
      const provider = new ethers.BrowserProvider(
        window.ethereum as unknown as ethers.Eip1193Provider,
      );
      const poolContract = new ethers.Contract(poolAddress, POOL_ABI, provider);

      const accountData = await poolContract.getUserAccountData(userAddress);

      return {
        totalCollateralBase: accountData.totalCollateralBase.toString(),
        totalDebtBase: accountData.totalDebtBase.toString(),
        availableBorrowsBase: accountData.availableBorrowsBase.toString(),
        currentLiquidationThreshold:
          Number(accountData.currentLiquidationThreshold) / 10000, // Convert from basis points
        ltv: Number(accountData.ltv) / 10000, // Convert from basis points
        healthFactor: ethers.formatUnits(accountData.healthFactor, 18),
      };
    } catch (error) {
      console.error("Error getting user account data:", error);
      return null;
    }
  }

  /**
   * Check if collateral can be safely disabled
   */
  static async canDisableCollateral(
    tokenAddress: string,
    userAddress: string,
    chainId: SupportedChainId,
  ): Promise<{ canDisable: boolean; reason?: string }> {
    try {
      // Get current account data
      const accountData = await this.getUserAccountData(userAddress, chainId);
      if (!accountData) {
        return { canDisable: false, reason: "Unable to fetch account data" };
      }

      const currentHealthFactor = parseFloat(accountData.healthFactor);

      // If no debt, can always disable collateral
      if (parseFloat(accountData.totalDebtBase) === 0) {
        return { canDisable: true };
      }

      // If health factor is very low, probably can't disable
      if (currentHealthFactor < 1.2) {
        return {
          canDisable: false,
          reason: "Health factor too low - disabling would risk liquidation",
        };
      }

      // For more precise checking, you could simulate the transaction
      // or calculate the exact impact of removing this collateral
      return { canDisable: true };
    } catch (error) {
      console.error("Error checking collateral disable safety:", error);
      return {
        canDisable: false,
        reason: "Unable to verify safety of disabling collateral",
      };
    }
  }
}
