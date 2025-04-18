// src/utils/tokenApiMethods.ts
import { evmTokenApi } from "@/api/evmTokenApi";
import { getChainByChainId } from "@/config/chains";
import useWeb3Store from "@/store/web3Store";
import { Token, TokenAddressInfo, TokenBalance } from "@/types/web3";

/**
 * Formats a balance from hex or large number string to a human-readable token amount
 * @param balanceStr The balance string (possibly in hex format)
 * @param decimals The token's decimal places
 * @returns Formatted balance as a string with appropriate decimal places
 */
function formatTokenBalance(balanceStr: string, decimals: number): string {
  try {
    // Handle hex values
    let numericalBalance: bigint;
    if (balanceStr.startsWith("0x")) {
      numericalBalance = BigInt(balanceStr);
    } else {
      // Handle non-hex large numbers
      numericalBalance = BigInt(balanceStr);
    }

    // Convert to base units by dividing by 10^decimals
    const divisor = BigInt(10) ** BigInt(decimals);

    // Calculate whole part and fractional part
    const wholePart = numericalBalance / divisor;
    const fractionalPart = numericalBalance % divisor;

    // Convert to string with proper decimal formatting
    if (fractionalPart === BigInt(0)) {
      return wholePart.toString();
    } else {
      // Pad with leading zeros if needed
      let fractionalStr = fractionalPart.toString().padStart(decimals, "0");

      // Trim trailing zeros
      fractionalStr = fractionalStr.replace(/0+$/, "");

      return `${wholePart}.${fractionalStr}`;
    }
  } catch (e) {
    console.error("Error formatting token balance:", e);
    return "0"; // Return 0 as fallback
  }
}

export async function getPricesAndBalancesForActiveWallet(): Promise<boolean> {
  const store = useWeb3Store.getState();
  const activeWallet = store.activeWallet;

  if (!activeWallet) {
    console.warn("No active wallet to fetch prices and balances for");
    return false;
  }

  store.setTokensLoading(true);

  try {
    const [sourceResult, destinationResult] = await Promise.allSettled([
      getPricesAndBalancesForChain(
        store.sourceChain.chainId,
        activeWallet.address,
        "source",
      ),
      getPricesAndBalancesForChain(
        store.destinationChain.chainId,
        activeWallet.address,
        "destination",
      ),
    ]);

    console.log("Source chain fetch result:", sourceResult);
    console.log("Destination chain fetch result:", destinationResult);

    // Check if both operations succeeded
    const sourceSuccess =
      sourceResult.status === "fulfilled" && sourceResult.value;
    const destSuccess =
      destinationResult.status === "fulfilled" && destinationResult.value;

    return sourceSuccess && destSuccess;
  } catch (error) {
    console.error("Error fetching prices and balances:", error);
    return false;
  } finally {
    store.setTokensLoading(false);
  }
}

export async function getPricesAndBalancesForChain(
  chainId: number,
  userAddress: string,
  chainType: "source" | "destination" = "source",
): Promise<boolean> {
  try {
    console.log(`Starting fetch for ${chainType} chain (ID: ${chainId})`);

    // Get tokens for this chain
    const tokens = useWeb3Store.getState().getTokensForChain(chainId);
    if (!tokens.length) {
      console.warn(`No tokens found for chain ${chainId} (${chainType})`);
      return false;
    }

    // Prepare price fetching
    console.log(
      `Fetching prices for ${tokens.length} tokens on ${chainType} chain`,
    );

    const tokenAddresses: TokenAddressInfo[] = tokens
      .map((token) => {
        const chain = getChainByChainId(token.chainId);
        if (!chain) return null;

        return {
          network: chain.alchemyNetworkName,
          address: token.address,
        };
      })
      .filter(Boolean) as TokenAddressInfo[];

    // Prepare batches
    const batchSize = 25;
    const batches: TokenAddressInfo[][] = [];

    for (let i = 0; i < tokenAddresses.length; i += batchSize) {
      batches.push(tokenAddresses.slice(i, i + batchSize));
    }

    // Start the price fetch operation
    const pricePromise = (async () => {
      const batchPromises = batches.map(async (batch, i) => {
        try {
          console.log(
            `Processing price batch ${i + 1}/${batches.length} for ${chainType} chain`,
          );
          const response = await evmTokenApi.getTokenPrices({
            addresses: batch,
          });

          if (response.error || !response.data) {
            console.error(
              `Error fetching token prices for ${chainType} chain:`,
              response.error,
            );
            return;
          }

          // Get the latest state before updating to avoid race conditions
          useWeb3Store.getState().updateTokenPrices(response.data.data);
        } catch (error) {
          console.error(
            `Error in price batch ${i + 1} for ${chainType} chain:`,
            error,
          );
        }
      });

      await Promise.all(batchPromises);
      console.log(`All price batches processed for ${chainType} chain`);
    })();

    // Start the balance fetch operation concurrently
    let balancePromise: Promise<TokenBalance[] | null> = Promise.resolve(null);

    if (userAddress) {
      balancePromise = (async () => {
        console.log(
          `Fetching balances for address ${userAddress} on ${chainType} chain`,
        );

        const chain = getChainByChainId(chainId);
        if (!chain) {
          console.error(
            `Chain with ID ${chainId} not found for ${chainType} chain`,
          );
          return null;
        }

        try {
          const balanceResponse = await evmTokenApi.getBalances({
            network: chain.alchemyNetworkName,
            userAddress,
          });

          if (balanceResponse.error || !balanceResponse.data) {
            console.error(
              `Error fetching token balances for ${chainType} chain:`,
              balanceResponse.error,
            );
            return null;
          }

          return balanceResponse.data;
        } catch (error) {
          console.error(
            `Error fetching balances for ${chainType} chain:`,
            error,
          );
          return null;
        }
      })();
    }

    // Wait for both operations to complete
    const [, balanceData] = await Promise.all([pricePromise, balancePromise]);

    // Process balances if we have them
    if (balanceData) {
      // Get fresh tokens after price updates
      const updatedTokens = useWeb3Store.getState().getTokensForChain(chainId);

      // Process balances with up-to-date token info
      const tokensByAddress: Record<string, Token> = {};
      updatedTokens.forEach((token) => {
        tokensByAddress[token.address.toLowerCase()] = token;
      });

      const processedBalances = balanceData.map((balance) => {
        const tokenAddress = balance.contractAddress.toLowerCase();
        const token = tokensByAddress[tokenAddress];

        if (token && token.decimals !== undefined) {
          const formattedBalance = formatTokenBalance(
            balance.tokenBalance,
            token.decimals,
          );

          let balanceUsd = undefined;
          if (token.priceUsd) {
            try {
              const numBalance = parseFloat(formattedBalance);
              const price = parseFloat(token.priceUsd);
              balanceUsd = (numBalance * price).toFixed(2);
            } catch (e) {
              console.error(
                `Error calculating USD balance for ${chainType} chain:`,
                e,
              );
            }
          }

          return {
            ...balance,
            tokenBalance: formattedBalance,
            balanceUsd,
          };
        }

        return balance;
      });

      // Get the latest state before updating to avoid race conditions
      useWeb3Store
        .getState()
        .updateTokenBalances(chainId, userAddress, processedBalances);
    }

    console.log(
      `Successfully completed fetch for ${chainType} chain (ID: ${chainId})`,
    );
    return true;
  } catch (error) {
    console.error(
      `Error fetching prices and balances for ${chainType} chain:`,
      error,
    );
    return false;
  }
}
