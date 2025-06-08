import React, { useState, useEffect } from "react";
import { PrimaryButton, GrayButton } from "./SupplyButtonComponents";
import { SupplyModal } from "./SupplyModal";
import { TokenDetailsModal } from "./TokenDetailsModal";
import { TokenImage } from "@/components/ui/TokenImage";
import { useWalletConnection } from "@/utils/walletMethods";
import { getTokenByAddress } from "@/utils/tokenMethods";
import { Token, Chain } from "@/types/web3";
import { getChainByChainId } from "@/config/chains";
import useWeb3Store from "@/store/web3Store";
import { formatTokenBalance, formatCurrency } from "@/utils/formatUtils";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";

interface SupplyUnOwnedCardProps {
  title?: string;
  subtitle?: string;
  balance?: string;
  dollarAmount?: string;
  supplyAPY?: string;
  canBeCollateral?: boolean;
  onSupply?: () => void;
  tokenPrice?: number;
  liquidationThreshold?: number;
  userBalance?: string;
  healthFactor?: string;
  // Add these for proper token image loading
  tokenAddress?: string;
  decimals?: number;
}

const SupplyUnOwnedCard: React.FC<SupplyUnOwnedCardProps> = ({
  title = "usd coin",
  subtitle = "USDC",
  balance = "0.00",
  dollarAmount = "0.72",
  supplyAPY = "1.97",
  canBeCollateral = true,
  onSupply = () => {},
  tokenPrice = 1,
  liquidationThreshold = 0.85,
  userBalance = "1,547.82",
  healthFactor = "1.24",
  tokenAddress = "",
  decimals = 18,
}) => {
  // Get current chainId from connected wallet
  const { evmNetwork } = useWalletConnection();

  const currentChainId = evmNetwork?.chainId
    ? typeof evmNetwork.chainId === "string"
      ? parseInt(evmNetwork.chainId, 10)
      : evmNetwork.chainId
    : 1; // Default to Ethereum mainnet

  // State for the fetched token data
  const [fetchedToken, setFetchedToken] = useState<Token | null>(null);
  const [isLoadingToken, setIsLoadingToken] = useState(false);

  // Simplified - just use the userBalance prop without any wallet balance detection
  const displayBalance = userBalance;

  // Get token data from web3Store (same as swap interface)
  const tokenFromStore = useWeb3Store((state) => {
    if (!tokenAddress || !currentChainId) return null;

    const compositeKey = `${currentChainId}-${tokenAddress.toLowerCase()}`;
    return state.tokensByCompositeKey[compositeKey] || null;
  });

  // Fetch token data using only your token methods (no blockchain fallback)
  useEffect(() => {
    const fetchTokenData = async () => {
      if (!tokenAddress || !currentChainId) return;

      setIsLoadingToken(true);
      try {
        // First try to get from web3Store (preferred method like swap)
        if (tokenFromStore) {
          setFetchedToken(tokenFromStore);
          return;
        }

        // Fallback to file-based lookup
        const token = await getTokenByAddress(tokenAddress, currentChainId);
        if (token) {
          setFetchedToken(token);
        } else {
          // Create a basic token object with the provided props
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
        // Set fallback token data
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
  }, [tokenAddress, currentChainId, title, subtitle, decimals, tokenFromStore]);

  const handleModalSupply = async (): Promise<boolean> => {
    onSupply();
    return true;
  };

  // Create Token and Chain objects for TokenImage
  const createTokenObject = (): Token => {
    return {
      id: fetchedToken?.id || `${currentChainId}-${tokenAddress}`,
      name: fetchedToken?.name || title,
      ticker: fetchedToken?.ticker || subtitle,
      address: tokenAddress,
      decimals: fetchedToken?.decimals || decimals,
      // Use the symbol in lowercase as the icon filename (no .png extension)
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
    // Use the proper chain configuration
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
              // Loading placeholder
              <div className="bg-gray-700 rounded-full p-2 w-[34px] h-[34px] flex items-center justify-center animate-pulse">
                <span className="font-bold text-white text-sm">...</span>
              </div>
            ) : fetchedToken ? (
              // Use TokenImage with fetched token data
              <TokenImage token={token} chain={chain} size="lg" />
            ) : (
              // Fallback to simple circle with first letter
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
            <div className="text-gray-400 text-sm mt-0">supply balance</div>
            <div className="text-right flex flex-col items-end">
              <div className="text-sm">{formatTokenBalance(balance)}</div>
              <div className="text-gray-400 text-xs">
                {formatCurrency(dollarAmount)}
              </div>
            </div>
          </div>

          <div className="flex justify-between items-start">
            <div className="text-gray-400 text-sm mt-0">supply APY</div>
            <div className="text-sm">{supplyAPY}%</div>
          </div>

          <div className="flex justify-between items-start">
            <div className="text-gray-400 text-sm mt-0">can be collateral</div>
            {canBeCollateral && <div className="text-amber-500">✓</div>}
          </div>
        </CardContent>

        <CardFooter className="flex justify-between p-3 pt-0 gap-2">
          <SupplyModal
            tokenSymbol={subtitle}
            tokenName={title}
            balance={displayBalance}
            supplyAPY={`${supplyAPY}%`}
            collateralizationStatus={canBeCollateral ? "enabled" : "disabled"}
            healthFactor={healthFactor}
            tokenPrice={tokenPrice}
            liquidationThreshold={liquidationThreshold}
            totalCollateralUSD={0}
            totalDebtUSD={0}
            onSupply={handleModalSupply}
            tokenAddress={tokenAddress}
            tokenDecimals={decimals}
          >
            <PrimaryButton onClick={onSupply}>supply</PrimaryButton>
          </SupplyModal>
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

export default SupplyUnOwnedCard;
