import { useEffect } from "react";
import { evmAddress, chainId, PageSize, OrderDirection } from "@aave/react";
import { useAaveUserTransactionHistory } from "@/hooks/aave/useAaveUserData";
import {
  ChainId,
  EvmAddress,
  AaveMarket,
  UserTransactionItem,
} from "@/types/aave";

interface MarketTransactionData {
  marketAddress: string;
  marketName: string;
  chainId: ChainId;
  data: UserTransactionItem[] | null;
  loading: boolean;
  error: boolean;
  hasData: boolean;
}

interface SingleMarketTransactionHistoryProps {
  market: AaveMarket;
  onDataChange: (marketData: MarketTransactionData) => void;
  userWalletAddress: EvmAddress;
}

export const SingleMarketTransactionHistory: React.FC<
  SingleMarketTransactionHistoryProps
> = ({ market, onDataChange, userWalletAddress }) => {
  const { data, loading, error } = useAaveUserTransactionHistory({
    market: evmAddress(market.address),
    user: userWalletAddress,
    chainId: chainId(market.chainId),
    orderBy: { date: OrderDirection.Desc },
    pageSize: PageSize.Fifty,
  });

  useEffect(() => {
    const marketData: MarketTransactionData = {
      marketAddress: market.address,
      marketName: market.name,
      chainId: market.chainId as ChainId,
      data: data?.items || null,
      error: !!error,
      loading,
      hasData: !!(data?.items && data.items.length > 0),
    };

    onDataChange(marketData);
  }, [
    data,
    loading,
    error,
    market.address,
    market.name,
    market.chainId,
    onDataChange,
  ]);

  // This component doesn't render anything it's just for data fetching
  return null;
};
