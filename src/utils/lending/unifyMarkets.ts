import { Market, UnifiedMarketData } from "@/types/aave";

export const unifyMarkets = (markets: Market[]): UnifiedMarketData[] => {
  return markets.flatMap((market) => {
    // Create a map of assets by their underlying token address
    const assetMap = new Map();

    // Add supply reserves
    market.supplyReserves.forEach((reserve) => {
      const key = reserve.underlyingToken.address;
      assetMap.set(key, {
        ...reserve,
        marketInfo: market,
        marketName: market.name,
        supplyData: {
          apy: reserve.supplyInfo?.apy?.value || 0,
          totalSupplied: reserve.supplyInfo?.total?.value || "0",
          totalSuppliedUsd: reserve.size?.usd || 0,
        },
        borrowData: {
          apy: 0,
          totalBorrowed: "0",
          totalBorrowedUsd: 0,
        },
        usdExchangeRate: reserve.usdExchangeRate,
        isFrozen: reserve.isFrozen,
        isPaused: reserve.isPaused,
        incentives: reserve.incentives || [],
      });
    });

    // Add/merge borrow reserves
    market.borrowReserves.forEach((reserve) => {
      const key = reserve.underlyingToken.address;
      const existing = assetMap.get(key);

      const borrowData = {
        apy: reserve.borrowInfo?.apy?.value || 0,
        totalBorrowed: reserve.borrowInfo?.total?.amount?.value || "0",
        totalBorrowedUsd: reserve.borrowInfo?.total?.usd || 0,
      };

      if (existing) {
        // Merge with existing supply data
        existing.borrowData = borrowData;
        // Merge incentives arrays
        existing.incentives = [
          ...existing.incentives,
          ...(reserve.incentives || []),
        ];
      } else {
        // Create new entry with only borrow data
        assetMap.set(key, {
          ...reserve,
          marketInfo: market,
          marketName: market.name,
          supplyData: {
            apy: 0,
            totalSupplied: "0",
            totalSuppliedUsd: 0,
          },
          borrowData,
          usdExchangeRate: reserve.usdExchangeRate,
          isFrozen: reserve.isFrozen,
          isPaused: reserve.isPaused,
          incentives: reserve.incentives || [],
        });
      }
    });

    return Array.from(assetMap.values());
  });
};
