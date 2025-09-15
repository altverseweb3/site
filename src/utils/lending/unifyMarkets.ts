import {
  Market,
  UnifiedMarketData,
  UserSupplyData,
  UserBorrowData,
} from "@/types/aave";

export const unifyMarkets = (
  markets: Market[],
  marketSupplyData?: Record<string, UserSupplyData>,
  marketBorrowData?: Record<string, UserBorrowData>,
): UnifiedMarketData[] => {
  return markets.flatMap((market) => {
    // Create a map of assets by their underlying token address
    const assetMap = new Map();

    // Find user data for this market
    const userSupplyForMarket = marketSupplyData
      ? Object.values(marketSupplyData).find(
          (data) =>
            data.marketAddress === market.address &&
            data.chainId === market.chain.chainId,
        )
      : undefined;

    const userBorrowForMarket = marketBorrowData
      ? Object.values(marketBorrowData).find(
          (data) =>
            data.marketAddress === market.address &&
            data.chainId === market.chain.chainId,
        )
      : undefined;

    // Add supply reserves
    market.supplyReserves.forEach((reserve) => {
      const key = reserve.underlyingToken.address;

      // Find user supply positions for this reserve
      const userSupplyPositions =
        userSupplyForMarket?.supplies?.filter(
          (supply) =>
            supply.currency.address.toLowerCase() ===
            reserve.underlyingToken.address.toLowerCase(),
        ) || [];

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
        userSupplyPositions,
        userBorrowPositions: [],
      });
    });

    // Add/merge borrow reserves
    market.borrowReserves.forEach((reserve) => {
      const key = reserve.underlyingToken.address;
      const existing = assetMap.get(key);

      // Find user borrow positions for this reserve
      const userBorrowPositions =
        userBorrowForMarket?.borrows?.filter(
          (borrow) =>
            borrow.currency.address.toLowerCase() ===
            reserve.underlyingToken.address.toLowerCase(),
        ) || [];

      const borrowData = {
        apy: reserve.borrowInfo?.apy?.value || 0,
        totalBorrowed: reserve.borrowInfo?.total?.amount?.value || "0",
        totalBorrowedUsd: reserve.borrowInfo?.total?.usd || 0,
      };

      if (existing) {
        // Merge with existing supply data
        existing.borrowData = borrowData;
        existing.userBorrowPositions = userBorrowPositions;
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
          userSupplyPositions: [],
          userBorrowPositions,
        });
      }
    });

    return Array.from(assetMap.values());
  });
};
