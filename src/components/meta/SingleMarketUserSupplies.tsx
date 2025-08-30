import { useEffect } from "react";
import { evmAddress, chainId } from "@aave/react";
import { useAaveUserSupplies } from "@/hooks/aave/useAaveUserData";
import { ChainId, EvmAddress, AaveMarket, UserSupplyData } from "@/types/aave";

interface SingleMarketUserSuppliesProps {
  market: AaveMarket;
  onDataChange: (supplyData: UserSupplyData) => void;
  userWalletAddress: EvmAddress;
}

export const SingleMarketUserSupplies: React.FC<
  SingleMarketUserSuppliesProps
> = ({ market, onDataChange, userWalletAddress }) => {
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

  const loading = false;
  const error = false;

  useEffect(() => {
    const supplyData: UserSupplyData = {
      marketAddress: market.address,
      marketName: market.name,
      chainId: market.chainId as ChainId,
      supplies: data || [],
      error,
      loading,
      hasData: !!(data && data.length > 0),
    };

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
