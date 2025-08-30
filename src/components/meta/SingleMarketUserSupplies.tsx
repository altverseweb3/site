import { useEffect } from "react";
import { evmAddress, chainId } from "@aave/react";
import { useAaveUserSupplies } from "@/hooks/aave/useAaveUserData";
import { ChainId, EvmAddress, AaveMarket } from "@/types/aave";

interface MarketUserReserveSupplyPosition {
  __typename: "MarketUserReserveSupplyPosition";
  market: {
    __typename: "MarketInfo";
    name: string;
    address: string;
    chain: {
      __typename: "Chain";
      name: string;
      chainId: number;
    };
  };
  currency: {
    __typename: "Currency";
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    chainId: number;
  };
  balance: {
    __typename: "TokenAmount";
    usd: string;
    amount: {
      __typename: "DecimalValue";
      value: string;
    };
  };
  apy: {
    __typename: "PercentValue";
    value: string;
    formatted: string;
  };
  isCollateral: boolean;
  canBeCollateral: boolean;
}

interface UserSupplyData {
  marketAddress: string;
  marketName: string;
  chainId: ChainId;
  supplies: MarketUserReserveSupplyPosition[];
  loading: boolean;
  error: boolean;
  hasData: boolean;
}

interface SingleMarketUserSuppliesProps {
  market: AaveMarket;
  onDataChange: (supplyData: UserSupplyData) => void;
  userWalletAddress: EvmAddress;
}

export const SingleMarketUserSupplies: React.FC<
  SingleMarketUserSuppliesProps
> = ({ market, onDataChange, userWalletAddress }) => {
  console.log(
    `[SingleMarketUserSupplies] Initializing for market: ${market.name} (${market.address})`,
  );
  console.log(`[SingleMarketUserSupplies] User wallet: ${userWalletAddress}`);
  console.log(
    `[SingleMarketUserSupplies] Market chainId: ${market.chainId}, converted chainId:`,
    chainId(market.chainId),
  );

  // Always call hooks at the top level - never conditionally
  const { data } = useAaveUserSupplies({
    markets: [
      {
        chainId: chainId(market.chainId),
        address: evmAddress(market.address),
      },
    ],
    user: userWalletAddress,
  });

  console.log(`[SingleMarketUserSupplies] Hook returned data:`, data);

  const loading = false;
  const error = false;

  useEffect(() => {
    console.log(
      `[SingleMarketUserSupplies] useEffect triggered for market: ${market.name}`,
    );
    console.log(`[SingleMarketUserSupplies] Data in useEffect:`, data);
    console.log(`[SingleMarketUserSupplies] Data length:`, data?.length);
    console.log(
      `[SingleMarketUserSupplies] Loading: ${loading}, Error: ${error}`,
    );

    const supplyData: UserSupplyData = {
      marketAddress: market.address,
      marketName: market.name,
      chainId: market.chainId as ChainId,
      supplies: data || [],
      error,
      loading,
      hasData: !!(data && data.length > 0),
    };

    console.log(
      `[SingleMarketUserSupplies] Constructed supplyData:`,
      supplyData,
    );
    console.log(`[SingleMarketUserSupplies] Has data: ${supplyData.hasData}`);

    onDataChange(supplyData);
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
