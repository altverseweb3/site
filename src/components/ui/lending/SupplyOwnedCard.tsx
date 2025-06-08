import React, { useState, useEffect } from "react";
import { PrimaryButton, GrayButton } from "./SupplyButtonComponents";
import { WithdrawModal } from "./WithdrawModal";
import { CollateralToggleModal } from "./CollateralToggleModal";
import { AaveAssetSwapModal } from "./AaveAssetSwapModal";
import { TokenImage } from "@/components/ui/TokenImage";
import { useWalletConnection } from "@/utils/walletMethods";
import { getTokenByAddress } from "@/utils/tokenMethods";
import { Token, Chain } from "@/types/web3";
import { getChainByChainId } from "@/config/chains";
import { AaveTransactions, SupportedChainId } from "@/utils/aave";
import { ethers } from "ethers";
import { toast } from "sonner";
import {
  formatHealthFactor,
  getHealthFactorColor,
} from "@/utils/healthFactorUtils";
import { formatTokenBalance, formatCurrency } from "@/utils/formatUtils";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";

interface SupplyOwnedCardProps {
  title?: string;
  subtitle?: string;
  suppliedBalance?: string;
  dollarAmount?: string;
  supplyAPY?: string;
  canBeCollateral?: boolean;
  isUsedAsCollateral?: boolean;
  onWithdraw?: () => void;
  onToggleCollateral?: (enable: boolean) => void;
  tokenPrice?: number;
  liquidationThreshold?: number;
  totalCollateralUSD?: number;
  totalDebtUSD?: number;
  healthFactor?: string;
  tokenAddress?: string;
  decimals?: number;
  availableSuppliedAssets?: Array<{
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    balance?: string;
    liquidationThreshold?: number;
    isUsedAsCollateral?: boolean;
  }>;
}

const SupplyOwnedCard: React.FC<SupplyOwnedCardProps> = ({
  title = "usd coin",
  subtitle = "USDC",
  suppliedBalance = "0.00",
  dollarAmount = "0.72",
  supplyAPY = "1.97",
  canBeCollateral = true,
  isUsedAsCollateral = true,
  onWithdraw = () => {},
  onToggleCollateral = () => {},
  tokenPrice = 1,
  liquidationThreshold = 0.85,
  totalCollateralUSD = 0,
  totalDebtUSD = 0,
  healthFactor = "1.24",
  tokenAddress = "",
  decimals = 18,
  availableSuppliedAssets = [],
}) => {
  const { evmNetwork, evmAccount, isEvmConnected } = useWalletConnection();

  const currentChainId = evmNetwork?.chainId
    ? typeof evmNetwork.chainId === "string"
      ? parseInt(evmNetwork.chainId, 10)
      : evmNetwork.chainId
    : 1;

  const [fetchedToken, setFetchedToken] = useState<Token | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);

  useEffect(() => {
    const fetchTokenData = async () => {
      if (!tokenAddress || !currentChainId) return;

      setIsLoadingToken(true);
      try {
        const token = await getTokenByAddress(tokenAddress, currentChainId);

        if (token) {
          setFetchedToken(token);
        } else {
          setFetchedToken({
            id: `fallback-${currentChainId}-${tokenAddress}`,
            name: title,
            ticker: subtitle,
            icon: subtitle.toLowerCase() + ".png",
            address: tokenAddress,
            decimals: decimals,
            chainId: currentChainId,
            native:
              subtitle === "ETH" ||
              subtitle === "MATIC" ||
              subtitle === "AVAX" ||
              subtitle === "BNB",
          });
        }
      } catch {
        setFetchedToken({
          id: `error-${currentChainId}-${tokenAddress}`,
          name: title,
          ticker: subtitle,
          icon: subtitle.toLowerCase() + ".png",
          address: tokenAddress,
          decimals: decimals,
          chainId: currentChainId,
          native:
            subtitle === "ETH" ||
            subtitle === "MATIC" ||
            subtitle === "AVAX" ||
            subtitle === "BNB",
        });
      } finally {
        setIsLoadingToken(false);
      }
    };

    fetchTokenData();
  }, [tokenAddress, currentChainId, title, subtitle, decimals]);

  const handleModalWithdraw = async (amount: string): Promise<boolean> => {
    if (!isEvmConnected || !evmAccount?.address || !evmNetwork?.chainId) {
      toast.error("Wallet not connected", {
        description: "Please connect your wallet to continue",
      });
      return false;
    }

    if (!tokenAddress || tokenAddress === "") {
      toast.error("Token information missing", {
        description: `Unable to find token contract address for ${subtitle}`,
      });
      return false;
    }

    try {
      // Get current chain ID
      const currentChainId =
        typeof evmNetwork.chainId === "string"
          ? parseInt(evmNetwork.chainId, 10)
          : evmNetwork.chainId;

      // Get signer
      if (!window.ethereum) {
        throw new Error("MetaMask not found");
      }

      const provider = new ethers.BrowserProvider(
        window.ethereum as ethers.Eip1193Provider,
      );
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      // Show loading toast
      const toastId = toast.loading(`Withdrawing ${amount} ${subtitle}`, {
        description: "Processing withdrawal from Aave",
      });

      // Call the real Aave withdraw function
      const result = await AaveTransactions.withdrawAsset({
        tokenAddress,
        amount,
        tokenDecimals: decimals,
        tokenSymbol: subtitle,
        userAddress,
        chainId: currentChainId as SupportedChainId,
        signer,
      });

      if (result.success) {
        toast.success(`Successfully withdrew ${amount} ${subtitle}`, {
          id: toastId,
          description: `Transaction: ${result.txHash?.slice(0, 10)}...`,
        });

        // Call the original callback
        onWithdraw();
        return true;
      } else {
        toast.error("Withdraw failed", {
          id: toastId,
          description: result.error || "Transaction failed",
        });
        return false;
      }
    } catch (error: unknown) {
      toast.error("Withdraw failed", {
        description: (error as Error).message || "An unexpected error occurred",
      });
      return false;
    }
  };

  const handleModalToggleCollateral = async (
    enable: boolean,
  ): Promise<boolean> => {
    if (!isEvmConnected || !evmAccount?.address || !evmNetwork?.chainId) {
      toast.error("Wallet not connected", {
        description: "Please connect your wallet to continue",
      });
      return false;
    }

    if (!tokenAddress || tokenAddress === "") {
      toast.error("Token information missing", {
        description: `Unable to find token contract address for ${subtitle}`,
      });
      return false;
    }

    try {
      // Get current chain ID
      const currentChainId =
        typeof evmNetwork.chainId === "string"
          ? parseInt(evmNetwork.chainId, 10)
          : evmNetwork.chainId;

      // Get signer
      if (!window.ethereum) {
        throw new Error("MetaMask not found");
      }

      const provider = new ethers.BrowserProvider(
        window.ethereum as ethers.Eip1193Provider,
      );
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      // Show loading toast
      const toastId = toast.loading(
        `${enable ? "Enabling" : "Disabling"} ${subtitle} as collateral`,
        {
          description: "Processing collateral change",
        },
      );

      // Call the real Aave setCollateral function
      const result = await AaveTransactions.setCollateral({
        tokenAddress,
        useAsCollateral: enable,
        userAddress,
        chainId: currentChainId as SupportedChainId,
        tokenSymbol: subtitle,
        signer,
      });

      if (result.success) {
        toast.success(
          `Successfully ${enable ? "enabled" : "disabled"} ${subtitle} as collateral`,
          {
            id: toastId,
            description: `Transaction: ${result.txHash?.slice(0, 10)}...`,
          },
        );

        // Call the original callback
        onToggleCollateral(enable);
        return true;
      } else {
        toast.error("Collateral toggle failed", {
          id: toastId,
          description: result.error || "Transaction failed",
        });
        return false;
      }
    } catch (error: unknown) {
      toast.error("Collateral toggle failed", {
        description: (error as Error).message || "An unexpected error occurred",
      });
      return false;
    }
  };

  const handleAssetSwap = async (
    fromAsset: { address: string; symbol: string; decimals?: number },
    toAsset: { address: string; symbol: string; decimals?: number },
    amount: string,
  ): Promise<boolean> => {
    if (!isEvmConnected || !evmAccount?.address || !evmNetwork?.chainId) {
      toast.error("Wallet not connected", {
        description: "Please connect your wallet to continue",
      });
      return false;
    }

    try {
      // Get current chain ID
      const currentChainId =
        typeof evmNetwork.chainId === "string"
          ? parseInt(evmNetwork.chainId, 10)
          : evmNetwork.chainId;

      // Get signer
      if (!window.ethereum) {
        throw new Error("MetaMask not found");
      }

      const provider = new ethers.BrowserProvider(
        window.ethereum as ethers.Eip1193Provider,
      );
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      // Show loading toast
      const toastId = toast.loading(
        `Swapping ${amount} ${fromAsset.symbol} to ${toAsset.symbol}`,
        {
          description: "Processing asset swap in Aave",
        },
      );

      // Call the Aave asset swap function
      const result = await AaveTransactions.swapSuppliedAssets({
        fromTokenAddress: fromAsset.address,
        toTokenAddress: toAsset.address,
        amount,
        fromTokenDecimals: fromAsset.decimals || 18,
        toTokenDecimals: toAsset.decimals || 18,
        fromTokenSymbol: fromAsset.symbol,
        toTokenSymbol: toAsset.symbol,
        userAddress,
        chainId: currentChainId as SupportedChainId,
        signer,
      });

      if (result.success) {
        toast.success(
          `Successfully swapped ${fromAsset.symbol} to ${toAsset.symbol}`,
          {
            id: toastId,
            description: `Transaction: ${result.txHash?.slice(0, 10)}...`,
          },
        );

        // Call the original callback to refresh data
        onWithdraw();
        return true;
      } else {
        toast.error("Asset swap failed", {
          id: toastId,
          description: result.error || "Transaction failed",
        });
        return false;
      }
    } catch (error: unknown) {
      toast.error("Asset swap failed", {
        description: (error as Error).message || "An unexpected error occurred",
      });
      return false;
    }
  };

  const createTokenObject = (): Token => {
    return {
      id: fetchedToken?.id || `${currentChainId}-${tokenAddress}`,
      name: fetchedToken?.name || title,
      ticker: fetchedToken?.ticker || subtitle,
      address: tokenAddress,
      decimals: fetchedToken?.decimals || decimals,
      icon: (fetchedToken?.ticker || subtitle).toLowerCase() + ".png",
      native:
        (fetchedToken?.ticker || subtitle) === "ETH" ||
        (fetchedToken?.ticker || subtitle) === "MATIC" ||
        (fetchedToken?.ticker || subtitle) === "AVAX" ||
        (fetchedToken?.ticker || subtitle) === "BNB",
      chainId: currentChainId,
    };
  };

  const createChainObject = (): Chain => {
    const chain = getChainByChainId(currentChainId);
    return chain;
  };

  const token: Token = createTokenObject();
  const chain: Chain = createChainObject();

  return (
    <>
      <Card className="text-white border border-[#232326] h-[218px] p-0 rounded-[3px] shadow-none">
        <CardHeader className="flex flex-row items-start p-3 pt-3 pb-1 space-y-0">
          <div className="mr-3 flex-shrink-0 w-[34px] h-[34px] flex items-center justify-center">
            {isLoadingToken ? (
              <div className="bg-gray-700 rounded-full p-2 w-[34px] h-[34px] flex items-center justify-center animate-pulse">
                <span className="font-bold text-white text-sm">...</span>
              </div>
            ) : fetchedToken ? (
              <TokenImage token={token} chain={chain} size="lg" />
            ) : (
              <div className="bg-blue-500 rounded-full p-2 w-[34px] h-[34px] flex items-center justify-center">
                <span className="font-bold text-white text-sm">
                  {subtitle.slice(0, 1)}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <CardTitle className="text-sm font-medium leading-none">
              {fetchedToken ? fetchedToken.name : title}
            </CardTitle>
            <CardDescription className="text-gray-400 text-xs mt-1">
              {fetchedToken ? fetchedToken.ticker : subtitle}
            </CardDescription>
          </div>

          {/* Collateral Toggle */}
          {canBeCollateral && (
            <CollateralToggleModal
              tokenSymbol={subtitle}
              tokenName={title}
              suppliedBalance={suppliedBalance}
              healthFactor={healthFactor}
              tokenPrice={tokenPrice}
              liquidationThreshold={liquidationThreshold}
              totalCollateralUSD={totalCollateralUSD}
              totalDebtUSD={totalDebtUSD}
              currentlyEnabled={isUsedAsCollateral}
              canBeUsedAsCollateral={canBeCollateral}
              onToggleCollateral={handleModalToggleCollateral}
            >
              <button
                className={`w-8 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-opacity-50 ${
                  isUsedAsCollateral
                    ? "bg-orange-500 hover:bg-orange-600"
                    : "bg-gray-600 hover:bg-gray-500"
                }`}
                aria-label={`${isUsedAsCollateral ? "Disable" : "Enable"} collateral for ${subtitle}`}
              >
                <div
                  className={`w-3 h-3 bg-white rounded-full transition-transform duration-200 ${
                    isUsedAsCollateral ? "translate-x-4" : "translate-x-1"
                  }`}
                />
              </button>
            </CollateralToggleModal>
          )}
        </CardHeader>

        <CardContent className="p-3 pt-2 space-y-2">
          <div className="flex justify-between items-start">
            <div className="text-gray-400 text-sm mt-0">supplied balance</div>
            <div className="text-right flex flex-col items-end">
              <div className="text-sm text-green-400">
                {formatTokenBalance(suppliedBalance)}
              </div>
              <div className="text-gray-400 text-xs">
                {formatCurrency(dollarAmount)}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-start">
            <div className="text-gray-400 text-sm mt-0">supply APY</div>
            <div className="text-sm text-green-400">{supplyAPY}%</div>
          </div>

          <div className="flex justify-between items-start">
            <div className="text-gray-400 text-sm mt-0">collateral value</div>
            <div className="text-right flex flex-col items-end">
              {isUsedAsCollateral && canBeCollateral ? (
                <>
                  <div className="text-sm text-orange-400">
                    $
                    {(
                      (parseFloat(dollarAmount) || 0) *
                      (liquidationThreshold || 0)
                    ).toFixed(2)}
                  </div>
                  <div className="text-gray-400 text-xs">
                    {((liquidationThreshold || 0) * 100).toFixed(0)}% LTV
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-400">
                  {canBeCollateral ? "not enabled" : "not available"}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between items-start">
            <div className="text-gray-400 text-sm mt-0">health factor</div>
            <div className={`text-sm ${getHealthFactorColor(healthFactor)}`}>
              {formatHealthFactor(healthFactor)}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between p-3 pt-0 gap-2">
          <WithdrawModal
            tokenSymbol={subtitle}
            tokenName={title}
            suppliedBalance={suppliedBalance}
            supplyAPY={`${supplyAPY}%`}
            healthFactor={healthFactor}
            tokenPrice={tokenPrice}
            liquidationThreshold={liquidationThreshold}
            totalCollateralUSD={totalCollateralUSD}
            totalDebtUSD={totalDebtUSD}
            isUsedAsCollateral={isUsedAsCollateral}
            onWithdraw={handleModalWithdraw}
          >
            <PrimaryButton onClick={onWithdraw}>withdraw</PrimaryButton>
          </WithdrawModal>
          <AaveAssetSwapModal
            type="supplied"
            currentAsset={{
              address: tokenAddress,
              symbol: subtitle,
              name: title,
              decimals: decimals,
              balance: suppliedBalance,
              liquidationThreshold: liquidationThreshold,
              isUsedAsCollateral: isUsedAsCollateral,
            }}
            availableAssets={availableSuppliedAssets}
            onSwapAssets={handleAssetSwap}
            chain={chain}
            healthFactor={healthFactor}
            totalCollateralUSD={totalCollateralUSD}
            totalDebtUSD={totalDebtUSD}
          >
            <GrayButton onClick={() => {}}>swap</GrayButton>
          </AaveAssetSwapModal>
        </CardFooter>
      </Card>
    </>
  );
};

export default SupplyOwnedCard;
