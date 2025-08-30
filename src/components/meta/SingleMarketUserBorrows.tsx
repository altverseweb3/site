import { useEffect } from "react";
import { evmAddress, chainId } from "@aave/react";
import { useAaveUserBorrows } from "@/hooks/aave/useAaveUserData";
import { ChainId, EvmAddress, AaveMarket, UserBorrowData } from "@/types/aave";

interface SingleMarketUserBorrowsProps {
  market: AaveMarket;
  onDataChange: (borrowData: UserBorrowData) => void;
  userWalletAddress: EvmAddress;
}

export const SingleMarketUserBorrows: React.FC<
  SingleMarketUserBorrowsProps
> = ({ market, onDataChange, userWalletAddress }) => {
  // Always call hooks at the top level - never conditionally
  const { data } = useAaveUserBorrows({
    markets: [
      {
        chainId: chainId(market.chainId),
        address: evmAddress(market.address),
      },
    ],
    user: userWalletAddress,
  });

  const loading = false;
  const error = false;

  useEffect(() => {
    const borrowData: UserBorrowData = {
      marketAddress: market.address,
      marketName: market.name,
      chainId: market.chainId as ChainId,
      borrows: data || [],
      error,
      loading,
      hasData: !!(data && data.length > 0),
    };

    onDataChange(borrowData);
  }, [
    data,
    loading,
    error,
    market.address,
    market.name,
    market.chainId,
    onDataChange,
  ]);

  return null;
};
