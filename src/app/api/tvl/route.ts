import { NextResponse } from "next/server";
import { getTVLByVaultId, VAULT_ID_TO_ADDRESS } from "@/utils/tvlCache.mjs";
import { getVaultTVL, vaults } from "@/utils/getVaultTVL.mjs";

// Import function to get price data
import { fetchAllTokenPrices } from "@/utils/pricequery.mjs";

export async function GET() {
  try {
    // Ensure TVL data is loaded first
    await getVaultTVL();

    // Get price data for tokens
    const tokenPrices = await fetchAllTokenPrices();

    console.log("Token price data:", tokenPrices);

    const result: Record<number, string> = {};

    // Map of vault IDs
    const vaultIds = [1, 2, 3, 4, 5, 6, 7, 8];

    // Get TVL for each vault ID and multiply by token price
    for (const vaultId of vaultIds) {
      try {
        const tvl = getTVLByVaultId(vaultId);

        if (tvl) {
          // Find the expected token symbol for this vault
          const vault = vaults.find(
            (v) =>
              v.address.toLowerCase() ===
              VAULT_ID_TO_ADDRESS[vaultId].toLowerCase(),
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
            console.log(`Using price for ${tokenSymbol}: $${tokenPrice}`);
          }

          // Calculate TVL in USD
          const tvlValue = Number(tvl) * tokenPrice;

          // Format the number nicely
          const value = tvlValue.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          });

          result[vaultId] = value;
        } else {
          // If no TVL found, use "N/A"
          result[vaultId] = "N/A";
        }
      } catch (err) {
        console.error(`Error calculating TVL for vault ${vaultId}:`, err);
        result[vaultId] = "N/A";
      }
    }

    console.log("Returning TVL values:", result);
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
