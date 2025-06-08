import React, { useState, useEffect } from "react";
import { PrimaryButton, GrayButton } from "./SupplyButtonComponents";
import { RepayModal } from "./RepayModal";
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

interface BorrowOwnedCardProps {
  title?: string;
  subtitle?: string;
  borrowedBalance?: string;
  dollarAmount?: string;
  borrowAPY?: string;
  onRepay?: () => void;
  tokenPrice?: number;
  totalCollateralUSD?: number;
  totalDebtUSD?: number;
  healthFactor?: string;
  tokenAddress?: string;
  decimals?: number;
  currentRateMode?: 1 | 2; // 1 = stable, 2 = variable
  stableAPY?: string;
  variableAPY?: string;
  availableBorrowedAssets?: Array<{
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    balance?: string;
  }>;
}

const BorrowOwnedCard: React.FC<BorrowOwnedCardProps> = ({
  title = "usd coin",
  subtitle = "USDC",
  borrowedBalance = "0.00",
  dollarAmount = "0.72",
  borrowAPY = "2.45",
  onRepay = () => {},
  tokenPrice = 1,
  totalCollateralUSD = 0,
  totalDebtUSD = 0,
  healthFactor = "1.24",
  tokenAddress = "",
  decimals = 18,
  currentRateMode = 2,
  availableBorrowedAssets = [],
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
          console.log(
            `✅ Found token data from files for ${tokenAddress}:`,
            token,
          );
        } else {
          console.log(
            `❌ No token data found in files for ${tokenAddress} on chain ${currentChainId}`,
          );
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
      } catch (error) {
        console.error(`Error fetching token data for ${tokenAddress}:`, error);
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

  const handleModalRepay = async (amount: string): Promise<boolean> => {
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

      console.log(
        `🚀 Starting repay: ${amount} ${subtitle} on chain ${currentChainId}`,
      );

      // Show loading toast
      const toastId = toast.loading(`Repaying ${amount} ${subtitle}`, {
        description: "Approve token transfer and repay to Aave",
      });

      // Call the real Aave repay function
      const result = await AaveTransactions.repayAsset({
        tokenAddress,
        amount,
        tokenDecimals: decimals,
        tokenSymbol: subtitle,
        userAddress,
        chainId: currentChainId as SupportedChainId,
        interestRateMode: 2, // Variable rate (most common)
        signer,
      });

      if (result.success) {
        toast.success(`Successfully repaid ${amount} ${subtitle}`, {
          id: toastId,
          description: `Transaction: ${result.txHash?.slice(0, 10)}...`,
        });

        // Call the original callback
        onRepay();
        return true;
      } else {
        toast.error("Repay failed", {
          id: toastId,
          description: result.error || "Transaction failed",
        });
        return false;
      }
    } catch (error: unknown) {
      console.error("Repay failed:", error);
      toast.error("Repay failed", {
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

      console.log(
        `🔄 Starting borrow swap: ${amount} ${fromAsset.symbol} debt → ${toAsset.symbol} debt`,
      );

      // Show loading toast
      const toastId = toast.loading(
        `Swapping ${amount} ${fromAsset.symbol} debt to ${toAsset.symbol}`,
        {
          description: "Processing borrowed asset swap in Aave",
        },
      );

      // Call the Aave borrowed asset swap function
      const result = await AaveTransactions.swapBorrowedAssets({
        fromTokenAddress: fromAsset.address,
        toTokenAddress: toAsset.address,
        amount,
        fromTokenDecimals: fromAsset.decimals || 18,
        toTokenDecimals: toAsset.decimals || 18,
        fromTokenSymbol: fromAsset.symbol,
        toTokenSymbol: toAsset.symbol,
        userAddress,
        chainId: currentChainId as SupportedChainId,
        interestRateMode: currentRateMode,
        signer,
      });

      if (result.success) {
        toast.success(
          `Successfully swapped ${fromAsset.symbol} debt to ${toAsset.symbol}`,
          {
            id: toastId,
            description: `Transaction: ${result.txHash?.slice(0, 10)}...`,
          },
        );

        // Call the original callback to refresh data
        onRepay();
        return true;
      } else {
        toast.error("Borrow swap failed", {
          id: toastId,
          description: result.error || "Transaction failed",
        });
        return false;
      }
    } catch (error: unknown) {
      console.error("Borrow swap failed:", error);
      toast.error("Borrow swap failed", {
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
      <Card className="text-white border border-[#232326] h-[198px] p-0 rounded-[3px] shadow-none">
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
          <div>
            <CardTitle className="text-sm font-medium leading-none">
              {fetchedToken ? fetchedToken.name : title}
            </CardTitle>
            <CardDescription className="text-gray-400 text-xs mt-1">
              {fetchedToken ? fetchedToken.ticker : subtitle}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-3 pt-2 space-y-2">
          <div className="flex justify-between items-start">
            <div className="text-gray-400 text-sm mt-0">borrowed balance</div>
            <div className="text-right flex flex-col items-end">
              <div className="text-sm text-red-400">
                {formatTokenBalance(borrowedBalance)}
              </div>
              <div className="text-gray-400 text-xs">
                {formatCurrency(dollarAmount)}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-start">
            <div className="text-gray-400 text-sm mt-0">borrow APY</div>
            <div className="text-sm text-red-400">{borrowAPY}%</div>
          </div>

          <div className="flex justify-between items-start">
            <div className="text-gray-400 text-sm mt-0">debt contribution</div>
            <div className="text-right flex flex-col items-end">
              <div className="text-sm text-red-400">
                {totalDebtUSD > 0
                  ? ((parseFloat(dollarAmount) / totalDebtUSD) * 100).toFixed(1)
                  : "0.0"}
                %
              </div>
              <div className="text-gray-400 text-xs">of total debt</div>
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
          <RepayModal
            tokenSymbol={subtitle}
            tokenName={title}
            borrowedBalance={borrowedBalance}
            borrowAPY={`${borrowAPY}%`}
            healthFactor={healthFactor}
            tokenPrice={tokenPrice}
            totalCollateralUSD={totalCollateralUSD}
            totalDebtUSD={totalDebtUSD}
            onRepay={handleModalRepay}
          >
            <PrimaryButton onClick={onRepay}>repay</PrimaryButton>
          </RepayModal>
          <AaveAssetSwapModal
            type="borrowed"
            currentAsset={{
              address: tokenAddress,
              symbol: subtitle,
              name: title,
              decimals: decimals,
              balance: borrowedBalance,
            }}
            availableAssets={availableBorrowedAssets}
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

export default BorrowOwnedCard;
