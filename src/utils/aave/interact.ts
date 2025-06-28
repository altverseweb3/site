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

export interface SupplyParams {
  tokenAddress: string;
  amount: string;
  tokenDecimals: number;
  tokenSymbol: string;
  userAddress: string;
  chainId: SupportedChainId;
  signer: ethers.Signer;
}

export interface BorrowResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface BorrowParams {
  tokenAddress: string;
  amount: string;
  rateMode: number; // 1 = stable, 2 = variable
  tokenDecimals: number;
  tokenSymbol: string;
  userAddress: string;
  chainId: SupportedChainId;
  signer: ethers.Signer;
}

export class AaveTransactions {
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

  static async borrowAsset(params: BorrowParams): Promise<BorrowResult> {
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
        `🏦 Starting borrow transaction for ${amount} ${tokenSymbol} at ${rateMode === 1 ? "stable" : "variable"} rate`,
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

      // Execute borrow transaction
      // Aave borrow function: borrow(asset, amount, interestRateMode, referralCode, onBehalfOf)
      console.log(`📤 Executing borrow transaction...`);
      const borrowTx = await poolContract.borrow(
        tokenAddress, // asset to borrow
        amountWei, // amount to borrow
        rateMode, // interest rate mode (1 = stable, 2 = variable)
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
}
