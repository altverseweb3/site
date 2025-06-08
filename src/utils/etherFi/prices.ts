import { DEPOSIT_ASSETS } from "@/config/etherFi";

export interface EtherFiPriceResponse {
  price_usd: number;
  total_supply: number;
  usd_market_cap: number;
}

/**
 * Fetch price using our API route to avoid CORS issues
 */
async function fetchPriceViaAPI(url: string): Promise<EtherFiPriceResponse> {
  try {
    const apiUrl = `/api/etherfi-price?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return (await response.json()) as EtherFiPriceResponse;
  } catch (error) {
    throw error;
  }
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
        const data: EtherFiPriceResponse = await fetchPriceViaAPI(
          asset.priceUrl,
        );
        return data.price_usd;
      } catch (error) {
        console.warn(`Attempt ${attempt} failed for ${symbol}:`, error);

        if (attempt === 2) {
          console.error(`All attempts failed for ${symbol}:`, error);
          throw new Error(
            `Failed to fetch price for ${symbol} after ${attempt} attempts`,
          );
        }

        // Shorter wait before retry for speed
        await new Promise((resolve) => setTimeout(resolve, 300));
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
