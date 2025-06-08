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

    const currentAllowance = await tokenContract.allowance(
      await signer.getAddress(),
      spenderAddress,
    );

    if (currentAllowance < amountBN) {
      const approveTx = await tokenContract.approve(spenderAddress, amountBN);
      await approveTx.wait();
    }
  }

  static async supplyAsset(params: SupplyParams): Promise<TransactionResult> {
    try {
      const {
        tokenAddress,
        amount,
        tokenDecimals,
        userAddress,
        chainId,
        signer,
      } = params;

      if (!AaveConfig.isChainSupported(chainId)) {
        return {
          success: false,
          error: `Chain ${chainId} not supported by Aave`,
        };
      }

      const poolAddress = AaveConfig.getPoolAddress(chainId);
      if (!poolAddress) {
        return {
          success: false,
          error: `Pool address not found for chain ${chainId}`,
        };
      }

      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        signer,
      );
      const poolContract = new ethers.Contract(poolAddress, POOL_ABI, signer);
      const amountBN = ethers.parseUnits(amount, tokenDecimals);

      const userBalance = await tokenContract.balanceOf(userAddress);
      if (userBalance < amountBN) {
        return { success: false, error: `Insufficient balance` };
      }

      const currentAllowance = await tokenContract.allowance(
        userAddress,
        poolAddress,
      );
      if (currentAllowance < amountBN) {
        const approveTx = await tokenContract.approve(poolAddress, amountBN);
        await approveTx.wait();
      }

      const supplyTx = await poolContract.supply(
        tokenAddress,
        amountBN,
        userAddress,
        0,
      );

      const receipt = await supplyTx.wait();

      return {
        success: true,
        txHash: receipt.hash,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Supply transaction failed",
      };
    }
  }

  static async borrowAsset(params: BorrowParams): Promise<TransactionResult> {
    try {
      const {
        tokenAddress,
        amount,
        tokenDecimals,
        userAddress,
        chainId,
        interestRateMode,
        signer,
      } = params;

      if (!AaveConfig.isChainSupported(chainId)) {
        return {
          success: false,
          error: `Chain ${chainId} not supported by Aave`,
        };
      }

      const poolAddress = AaveConfig.getPoolAddress(chainId);
      if (!poolAddress) {
        return {
          success: false,
          error: `Pool address not found for chain ${chainId}`,
        };
      }

      const poolContract = new ethers.Contract(poolAddress, POOL_ABI, signer);
      const amountBN = ethers.parseUnits(amount, tokenDecimals);

      const overrides = {
        gasLimit: 500000,
      };

      const borrowTx = await poolContract.borrow(
        tokenAddress,
        amountBN,
        interestRateMode,
        0,
        userAddress,
        overrides,
      );

      const receipt = await borrowTx.wait();

      return {
        success: true,
        txHash: receipt.hash,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Borrow transaction failed",
      };
    }
  }

  static async withdrawAsset(
    params: WithdrawParams,
  ): Promise<TransactionResult> {
    try {
      const {
        tokenAddress,
        amount,
        tokenDecimals,
        userAddress,
        chainId,
        signer,
      } = params;

      if (!AaveConfig.isChainSupported(chainId)) {
        return {
          success: false,
          error: `Chain ${chainId} not supported by Aave`,
        };
      }

      const poolAddress = AaveConfig.getPoolAddress(chainId);
      if (!poolAddress) {
        return {
          success: false,
          error: `Pool address not found for chain ${chainId}`,
        };
      }

      const poolContract = new ethers.Contract(poolAddress, POOL_ABI, signer);

      let amountBN: bigint;
      if (amount === "max") {
        amountBN = ethers.MaxUint256;
      } else {
        amountBN = ethers.parseUnits(amount, tokenDecimals);
      }

      const overrides = {
        gasLimit: 500000,
      };

      const withdrawTx = await poolContract.withdraw(
        tokenAddress,
        amountBN,
        userAddress,
        overrides,
      );

      const receipt = await withdrawTx.wait();

      return {
        success: true,
        txHash: receipt.hash,
      };
    } catch {
      return {
        success: false,
      };
    }
  }

  static async repayAsset(params: RepayParams): Promise<TransactionResult> {
    try {
      const {
        tokenAddress,
        amount,
        tokenDecimals,
        userAddress,
        chainId,
        interestRateMode,
        signer,
      } = params;

      if (!AaveConfig.isChainSupported(chainId)) {
        return {
          success: false,
          error: `Chain ${chainId} not supported by Aave`,
        };
      }

      const poolAddress = AaveConfig.getPoolAddress(chainId);
      if (!poolAddress) {
        return {
          success: false,
          error: `Pool address not found for chain ${chainId}`,
        };
      }

      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        signer,
      );
      const poolContract = new ethers.Contract(poolAddress, POOL_ABI, signer);

      let amountBN: bigint;
      if (amount === "max") {
        amountBN = ethers.MaxUint256;
      } else {
        amountBN = ethers.parseUnits(amount, tokenDecimals);
      }

      const userBalance = await tokenContract.balanceOf(userAddress);
      if (amount !== "max" && userBalance < amountBN) {
        return { success: false, error: `Insufficient balance for repayment` };
      }

      const currentAllowance = await tokenContract.allowance(
        userAddress,
        poolAddress,
      );
      if (amount === "max" || currentAllowance < amountBN) {
        const approveAmount = amount === "max" ? ethers.MaxUint256 : amountBN;
        const approveTx = await tokenContract.approve(
          poolAddress,
          approveAmount,
        );
        await approveTx.wait();
      }

      const overrides = {
        gasLimit: 500000,
      };

      const repayTx = await poolContract.repay(
        tokenAddress,
        amountBN,
        interestRateMode,
        userAddress,
        overrides,
      );

      const receipt = await repayTx.wait();

      return {
        success: true,
        txHash: receipt.hash,
      };
    } catch {
      return {
        success: false,
      };
    }
  }

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

      const collateralTx = await poolContract.setUserUseReserveAsCollateral(
        tokenAddress,
        useAsCollateral,
      );

      const receipt = await collateralTx.wait();

      return {
        success: true,
        txHash: receipt.hash,
      };
    } catch {
      return {
        success: false,
      };
    }
  }

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

      const swapTx = await poolContract.swapBorrowRateMode(
        tokenAddress,
        currentRateMode,
      );

      const receipt = await swapTx.wait();

      return {
        success: true,
        txHash: receipt.hash,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Swap rate mode transaction failed",
      };
    }
  }

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

      const amountBN = ethers.parseUnits(amount, fromTokenDecimals);
      const targetAmount = ethers.formatUnits(amountBN, toTokenDecimals);

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

      return {
        success: true,
        txHash: supplyResult.txHash,
      };
    } catch (error: unknown) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Asset swap transaction failed",
      };
    }
  }

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

      if (!AaveConfig.isChainSupported(chainId)) {
        return { success: false, error: `Chain ${chainId} not supported` };
      }

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

      return {
        success: true,
        txHash: repayResult.txHash,
      };
    } catch (error: unknown) {
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
