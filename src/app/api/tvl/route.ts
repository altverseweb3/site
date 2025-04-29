import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

// Convert exec to promise-based
const execPromise = promisify(exec);

export async function GET() {
  try {
    // Static values as fallback
    const staticValues = {
      1: "168,123.26", // Liquid ETH
      2: "86,946.04", // The Bera ETH Vault
      3: "629.09", // Liquid BTC
      4: "30,043,876.80", // Liquid USD
      5: "9,926.00", // Liquid Move ETH
      6: "5,272,095.52", // Ultra Yield Stablecoin Vault
      7: "336,251.25", // Elixir Stable Vault
      8: "77,598.18", // Usual Stable Vault
    };

    // Try to get live values from script
    try {
      // Get the path to the getVaultTVL.mjs script
      const scriptPath = path.join(
        process.cwd(),
        "src",
        "utils",
        "getVaultTVL.mjs",
      );

      // Execute the script
      const { stdout } = await execPromise(`node ${scriptPath}`);

      // First, dump the entire output for debugging
      console.log("Script output:", stdout);

      // Look for TVL values like: "- liquidETH: TVL=168123.260159046499097723"
      // Use a more permissive regex that can handle special characters
      const tvlLines = stdout.match(/- .+?: TVL=[\d.]+/g);

      console.log("TVL lines found:", tvlLines);

      if (tvlLines && tvlLines.length > 0) {
        // Map of symbols to vault IDs - be very careful with exact symbols
        const symbolToId: Record<string, number> = {
          liquidETH: 1,
          liquidBeraETH: 2,
          liquidBTC: 3,
          liquidUSD: 4,
          liquidMoveETH: 5,
          UltraUSD: 6,
          liquidElixir: 7,
          "eUSD0++": 8,
        };

        // Create a backup mapping based on vault addresses (more reliable)
        const addressToId: Record<string, number> = {
          "0xf0bb20865277aBd641a307eCe5Ee04E79073416C": 1, // Liquid ETH
          "0x83599937c2C9bEA0E0E8ac096c6f32e86486b410": 2, // The Bera ETH Vault
          "0x5f46d540b6eD704C3c8789105F30E075AA900726": 3, // Liquid BTC
          "0x08c6F91e2B681FaF5e17227F2a44C307b3C1364C": 4, // Liquid USD
          "0xca8711dAF13D852ED2121E4bE3894Dae366039E4": 5, // Liquid Move ETH
          "0xbc0f3B23930fff9f4894914bD745ABAbA9588265": 6, // Ultra Yield Stablecoin Vault
          "0x352180974C71f84a934953Cf49C4E538a6F9c997": 7, // Elixir Stable Vault
          "0xeDa663610638E6557c27e2f4e973D3393e844E70": 8, // Usual Stable Vault (eUSD0++)
        };

        // Process each TVL line
        const result: Record<number, string> = {};

        tvlLines.forEach((line) => {
          // Line looks like: "- symbolName: TVL=123.456"
          // Use a more permissive regex that can handle special characters
          const match = line.match(/- (.+?): TVL=([\d.]+)/);
          console.log(
            `Processing line: ${line}, match: ${match ? JSON.stringify(match) : "no match"}`,
          );

          if (match && match[1] && match[2]) {
            const symbol = match[1];
            const tvlValue = match[2];
            console.log(`Found symbol: ${symbol}, TVL: ${tvlValue}`);

            // First try to match by symbol
            let vaultId = symbolToId[symbol];

            // If no match by symbol, try to look for an address in the line
            if (!vaultId) {
              // Check if this line contains any of our vault addresses
              for (const [address, id] of Object.entries(addressToId)) {
                if (stdout.includes(address) && stdout.includes(symbol)) {
                  console.log(
                    `Found address match for ${address} with symbol ${symbol}`,
                  );
                  vaultId = id;
                  break;
                }
              }
            }

            if (vaultId) {
              // Format the number nicely
              const value = Number(tvlValue).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              });

              result[vaultId] = value;
              console.log(`Added TVL for vault ${vaultId}: ${value}`);
            }
          }
        });

        // Special check for the Usual Stable Vault (eUSD0++)
        if (!result[8] && stdout.includes("Usual Stable Vault")) {
          const usualMatch = stdout.match(
            /Usual Stable Vault[^]*?TVL=([\d.]+)/,
          );
          if (usualMatch && usualMatch[1]) {
            const tvlValue = usualMatch[1];
            const value = Number(tvlValue).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
            result[8] = value;
            console.log(`Added TVL for Usual Stable Vault (ID 8): ${value}`);
          }
        }

        // If we got at least one result, return it
        if (Object.keys(result).length > 0) {
          console.log("Returning live TVL values:", result);
          return NextResponse.json(result);
        }
      }

      // If we get here, we couldn't parse any values from the script output
      console.log("Falling back to static TVL values");
      return NextResponse.json(staticValues);
    } catch (execError) {
      console.error("Error executing TVL script:", execError);
      // Return static values if script execution fails
      return NextResponse.json(staticValues);
    }
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
