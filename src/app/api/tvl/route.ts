import { NextResponse } from "next/server";
import { getTVLByVaultId } from "@/utils/tvlCache.mjs";
import { getVaultTVL } from "@/utils/getVaultTVL.mjs";

export async function GET() {
  try {
    // Ensure TVL data is loaded first
    await getVaultTVL();

    const result: Record<number, string> = {};

    // Map of vault IDs
    const vaultIds = [1, 2, 3, 4, 5, 6, 7, 8];

    // Get TVL for each vault ID
    for (const vaultId of vaultIds) {
      const tvl = getTVLByVaultId(vaultId);

      if (tvl) {
        // Format the number nicely
        const value = Number(tvl).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
        result[vaultId] = value;
      } else {
        // If no TVL found, use "N/A" instead of static values
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
