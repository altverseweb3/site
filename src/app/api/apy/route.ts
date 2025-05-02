import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // Don't cache this route

// Helper to import and call the apyFetch module
async function getApyData() {
  try {
    // Dynamically import the mjs module
    const apyFetchModule = await import("@/utils/apyFetch.mjs");

    // Call the queryAllVaults function
    const results = await apyFetchModule.queryAllVaults();

    // Process the results into a format suitable for the frontend
    const apyData: Record<string, string> = {};

    for (const result of results) {
      // Check if result has net_apy property and it's valid
      if (
        !result.error &&
        "net_apy" in result &&
        result.net_apy !== null &&
        result.net_apy !== undefined &&
        typeof result.net_apy === "number" &&
        result.net_apy > 0
      ) {
        // Use address as key and format APY as percentage
        apyData[result.address] = `${(result.net_apy * 100).toFixed(1)}%`;
      }
    }

    return apyData;
  } catch (error) {
    console.error("Error in getApyData:", error);
    throw error;
  }
}

export async function GET() {
  try {
    const apyData = await getApyData();
    return NextResponse.json(apyData);
  } catch (error) {
    console.error("Error fetching APY data:", error);
    return NextResponse.json(
      { error: "Failed to fetch APY data" },
      { status: 500 },
    );
  }
}
