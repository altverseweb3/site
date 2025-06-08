import React, { useState, useEffect } from "react";
import { PrimaryButton, GrayButton } from "./SupplyButtonComponents";
import { BorrowModal } from "./BorrowModal";
import { TokenDetailsModal } from "./TokenDetailsModal";
import { TokenImage } from "@/components/ui/TokenImage";
import { useWalletConnection } from "@/utils/walletMethods";
import { getTokenByAddress } from "@/utils/tokenMethods";
import { Token, Chain } from "@/types/web3";
import { getChainByChainId } from "@/config/chains";
import { formatTokenBalance, formatCurrency } from "@/utils/formatUtils";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";

interface BorrowUnOwnedCardProps {
  title?: string;
  subtitle?: string;
  balance?: string;
  dollarAmount?: string;
  borrowAPY?: string;
  availableToBorrow?: string;
  onBorrow?: () => void;
  tokenPrice?: number;
  liquidationThreshold?: number;
  totalCollateralUSD?: number;
  totalDebtUSD?: number;
  healthFactor?: string;
  tokenAddress?: string;
  decimals?: number;
}

const BorrowUnOwnedCard: React.FC<BorrowUnOwnedCardProps> = ({
  title = "usd coin",
  subtitle = "USDC",
  balance = "0.00",
  dollarAmount = "0.72",
  borrowAPY = "2.45",
  availableToBorrow = "1,000.00",
  onBorrow = () => {},
  tokenPrice = 1,
  liquidationThreshold = 0.85,
  totalCollateralUSD = 0,
  totalDebtUSD = 0,
  healthFactor = "1.24",
  tokenAddress = "",
  decimals = 18,
}) => {
  const { evmNetwork } = useWalletConnection();

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

  const handleModalBorrow = async (): Promise<boolean> => {
    onBorrow();
    return true;
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
            <div className="text-gray-400 text-sm mt-0">borrow balance</div>
            <div className="text-right flex flex-col items-end">
              <div className="text-sm">{formatTokenBalance(balance)}</div>
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
            <div className="text-gray-400 text-sm mt-0">
              available to borrow
            </div>
            <div className="text-sm">
              {formatTokenBalance(availableToBorrow)}
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex justify-between p-3 pt-0 gap-2">
          <BorrowModal
            tokenSymbol={subtitle}
            tokenName={title}
            availableToBorrow={availableToBorrow}
            borrowAPY={`${borrowAPY}%`}
            healthFactor={healthFactor}
            tokenPrice={tokenPrice}
            liquidationThreshold={liquidationThreshold}
            totalCollateralUSD={totalCollateralUSD}
            totalDebtUSD={totalDebtUSD}
            onBorrow={handleModalBorrow}
            tokenAddress={tokenAddress}
            tokenDecimals={decimals}
          >
            <PrimaryButton onClick={onBorrow}>borrow</PrimaryButton>
          </BorrowModal>
          <TokenDetailsModal
            tokenAddress={tokenAddress}
            tokenSymbol={subtitle}
            tokenName={title}
            decimals={decimals}
          >
            <GrayButton onClick={() => {}}>details</GrayButton>
          </TokenDetailsModal>
        </CardFooter>
      </Card>
    </>
  );
};

export default BorrowUnOwnedCard;
