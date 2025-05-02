import { NextResponse } from "next/server";
import {
  getTVLByVaultId,
  VAULT_ID_TO_ADDRESS,
  invalidateTVLCache,
} from "@/utils/tvlCache.mjs";
import { vaults } from "@/utils/getVaultTVL.mjs";

// Import function to get price data
import { fetchAllTokenPrices } from "@/utils/pricequery.mjs";

export async function GET() {
  try {
    // Get price data for tokens
    // Use a more specific type for token prices
    interface TokenPriceData {
      symbol: string;
      price_usd: number;
      success: boolean;
      total_supply?: number;
      usd_market_cap?: number;
      timestamp?: string;
      error?: string;
    }

    // Get token prices first
    // Removed console.log
    const tokenPrices = (await fetchAllTokenPrices()) as Record<
      string,
      TokenPriceData
    >;

    // Removed console.log

    // Start with empty result object
    const result: Record<number, string> = {};

    // Map of vault IDs
    const vaultIds = [1, 2, 3, 4, 5, 6, 7, 8];

    // Invalidate the cache to ensure fresh data when explicitly requested
    invalidateTVLCache();

    // Get TVL for each vault ID and multiply by token price
    for (const vaultId of vaultIds) {
      try {
        // Removed console.log
        // getTVLByVaultId is now async, so we need to await it
        const tvl = await getTVLByVaultId(vaultId);

        if (tvl) {
          // Find the expected token symbol for this vault
          // Type assertion to handle TypeScript's strict index signature checking
          const address =
            VAULT_ID_TO_ADDRESS[vaultId as keyof typeof VAULT_ID_TO_ADDRESS];
          const vault = vaults.find(
            (v) => v.address.toLowerCase() === address.toLowerCase(),
          );

          const tokenSymbol = vault?.expectedSymbol;
          let tokenPrice = 1; // Default to 1 if no price found (for stablecoins)

          // Get token price if available
          if (
            tokenSymbol &&
            tokenPrices[tokenSymbol] &&
            tokenPrices[tokenSymbol].price_usd
          ) {
            tokenPrice = tokenPrices[tokenSymbol].price_usd;
            // Removed console.log
          } else {
            // Removed console.log
          }

          // Calculate TVL in USD
          const tvlValue = Number(tvl) * tokenPrice;
          // Removed console.log

          // Format the number nicely
          const value = tvlValue.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });

          result[vaultId] = value;
        } else {
          // If no TVL found, use "N/A"
          // Removed console.log
          result[vaultId] = "N/A";
        }
      } catch (err) {
        console.error(`Error calculating TVL for vault ${vaultId}:`, err);
        result[vaultId] = "N/A";
      }
    }

    // Removed console.log
    return NextResponse.json(result);
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      {
        1: "N/A",
        2: "N/A",
        3: "N/A",
        4: "N/A",
        5: "N/A",
        6: "N/A",
        7: "N/A",
        8: "N/A",
      },
      { status: 500 },
    );
  }
}
