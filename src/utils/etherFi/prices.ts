import { DEPOSIT_ASSETS } from "@/config/etherFi";

export interface EtherFiPriceResponse {
  price_usd: number;
  total_supply: number;
  usd_market_cap: number;
}

/**
 * Fetches the price for a single asset from EtherFi API
 */
export async function fetchAssetPrice(symbol: string): Promise<number> {
  const assetKey = symbol.toLowerCase();
  const asset = DEPOSIT_ASSETS[assetKey];

  if (!asset) {
    throw new Error(`Asset ${symbol} not found in DEPOSIT_ASSETS`);
  }

  // Return 1.0 for stablecoins
  if (asset.stable) {
    return 1.0;
  }

  // Fetch from EtherFi API if priceUrl exists
  if (asset.priceUrl) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(asset.priceUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data: EtherFiPriceResponse = await response.json();
        return data.price_usd;
      } catch (error) {
        if (attempt === 3) {
          console.error(`Error fetching price for ${symbol}:`, error);
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  throw new Error(`No price URL configured for asset ${symbol}`);
}

/**
 * Fetches prices for multiple assets in parallel
 */
export async function fetchMultipleAssetPrices(
  symbols: string[],
): Promise<Record<string, number>> {
  const pricePromises = symbols.map(async (symbol) => {
    try {
      const price = await fetchAssetPrice(symbol);
      return { symbol, price };
    } catch (error) {
      console.error(`Failed to fetch price for ${symbol}:`, error);
      return { symbol, price: 0 }; // Return 0 for failed requests
    }
  });

  const results = await Promise.all(pricePromises);

  return results.reduce(
    (acc, { symbol, price }) => {
      acc[symbol] = price;
      return acc;
    },
    {} as Record<string, number>,
  );
}

/**
 * Gets prices for all supported deposit assets
 */
export async function getAllDepositAssetPrices(): Promise<
  Record<string, number>
> {
  const allSymbols = Object.keys(DEPOSIT_ASSETS);
  return fetchMultipleAssetPrices(allSymbols);
}

/**
 * Gets prices for assets supported by a specific vault
 */
export async function getVaultAssetPrices(
  depositAssets: string[],
): Promise<Record<string, number>> {
  // Convert to lowercase to match DEPOSIT_ASSETS keys
  const normalizedSymbols = depositAssets.map((symbol) => symbol.toLowerCase());
  return fetchMultipleAssetPrices(normalizedSymbols);
}
