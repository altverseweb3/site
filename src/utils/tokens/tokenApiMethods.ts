// src/utils/altverseAPIMethods.ts
import { altverseAPI, ApiResponse } from "@/api/altverse";
import { getChainByChainId } from "@/config/chains";
import useWeb3Store from "@/store/web3Store";
import {
  Token,
  TokenAddressInfo,
  TokenPriceResult,
  TokenMetadata,
  SolanaTokenBalance,
  EnhancedTokenBalance,
  TokenBalance,
} from "@/types/web3";
import { SuiBalanceResult } from "@/api/altverse";
import { Chain } from "@/types/web3";

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

export async function getPricesAndBalances(
  sourceChain: Chain,
  destinationChain: Chain,
): Promise<boolean> {
  const store = useWeb3Store.getState();
  const sourceWallet = store.getWalletBySourceChain();
  const destinationWallet = store.getWalletByDestinationChain();

  store.setTokensLoading(true);

  try {
    const [sourceResult, destinationResult] = await Promise.allSettled([
      getPricesAndBalancesForChain(
        sourceChain.chainId,
        sourceWallet?.address,
        "source",
      ),
      getPricesAndBalancesForChain(
        destinationChain.chainId,
        destinationWallet?.address,
        "destination",
      ),
    ]);

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
  userAddress?: string,
  chainType: "source" | "destination" = "source",
): Promise<boolean> {
  try {
    // 1. Get Chain Info
    const chain = getChainByChainId(chainId);
    if (!chain) {
      console.error(
        `Chain with ID ${chainId} not found for ${chainType} chain`,
      );
      return false;
    }
    const networkName = chain.alchemyNetworkName;

    // 2. Fetch Balances only if userAddress is provided
    let addressesWithBalance: string[] = [];
    let balanceData: EnhancedTokenBalance[] | null = null;

    if (userAddress) {
      try {
        let balanceResponse:
          | ApiResponse<SuiBalanceResult[]>
          | ApiResponse<SolanaTokenBalance[]>
          | ApiResponse<TokenBalance[]>;

        if (chain.id === "sui") {
          // Handle Sui balances
          balanceResponse = await altverseAPI.getSuiBalances({
            owner: userAddress,
          });
        } else if (chain.id === "solana") {
          // Handle Solana SPL balances
          balanceResponse = await altverseAPI.getSplBalances({
            network: networkName,
            userAddress,
          });
        } else {
          // Handle EVM balances
          balanceResponse = await altverseAPI.getBalances({
            network: networkName,
            userAddress,
          });
        }

        if (balanceResponse.error || !balanceResponse.data) {
          console.error(
            `Error fetching token balances for ${chainType} chain:`,
            balanceResponse.error,
          );
          // Update store with empty balances for this user/chain to clear old data
          useWeb3Store.getState().updateTokenBalances(chainId, userAddress, []);
          // Continue to fetch alwaysLoadPrice tokens even if balance fetch fails (except for Sui)
        } else {
          // Transform responses to match EVM format
          if (chain.id === "sui") {
            // Transform Sui response to match EVM format
            // Balances will be formatted in the Sui-specific processing section
            balanceData = (balanceResponse.data as SuiBalanceResult[]).map(
              (suiBalance) => ({
                contractAddress: suiBalance.coinType, // Already normalized during token loading
                tokenBalance: suiBalance.totalBalance, // Keep raw balance - will be formatted later
                // Include additional Sui-specific properties
                coinObjectCount: suiBalance.coinObjectCount,
                lockedBalance: suiBalance.lockedBalance,
              }),
            ) as EnhancedTokenBalance[];
          } else if (chain.id === "solana") {
            // Transform Solana SPL token response to match EVM format
            balanceData = (balanceResponse.data as SolanaTokenBalance[]).map(
              (splToken) => ({
                contractAddress: splToken.mint, // mint address is the token contract for Solana
                tokenBalance:
                  splToken.uiAmountString ||
                  splToken.uiAmount?.toString() ||
                  "0", // Use already formatted amount
                // Include additional Solana-specific properties that might be useful
                decimals: splToken.decimals,
                uiAmount: splToken.uiAmount,
                uiAmountString: splToken.uiAmountString,
                pubkey: splToken.pubkey,
                owner: splToken.owner,
                isNative: splToken.isNative || false,
                // Store raw amount for reference if needed
                rawAmount: splToken.amount,
              }),
            ) as EnhancedTokenBalance[];
          } else {
            balanceData = balanceResponse.data as EnhancedTokenBalance[];
          }

          if (!balanceData || balanceData.length === 0) {
            console.warn(
              `No token balances found for ${userAddress} on ${chainType} chain ${chainId}.`,
            );
            // Update store with empty balances
            useWeb3Store
              .getState()
              .updateTokenBalances(chainId, userAddress, []);
          } else {
            // Extract addresses with balance - preserve case for Solana and Sui, lowercase for others
            addressesWithBalance = balanceData.map(
              (balance) =>
                chain.id === "solana" || chain.id === "sui"
                  ? balance.contractAddress // Keep original case for Solana and Sui
                  : balance.contractAddress.toLowerCase(), // Lowercase for EVM chains
            );
          }
        }
      } catch (error) {
        console.error(`Error fetching balances for ${chainType} chain:`, error);
        // Update store with empty balances on error
        useWeb3Store.getState().updateTokenBalances(chainId, userAddress, []);
        // Continue to fetch alwaysLoadPrice tokens even if balance fetch fails (except for Sui)
      }
    } else {
      console.warn(
        `No wallet connected. Fetching only prices for tokens with alwaysLoadPrice on ${chainType} chain.`,
      );
    }

    // 3. Skip price fetching for Sui chains
    if (chain.id === "sui") {
      // 6. Process Balances for Sui if userAddress is provided and we have balance data
      if (userAddress && balanceData && balanceData.length > 0) {
        // Get token metadata for formatting
        const updatedTokens = useWeb3Store
          .getState()
          .getTokensForChain(chainId);

        // Create lookup mapping for Sui tokens
        const tokensByAddress: Record<string, Token> = {};
        updatedTokens.forEach((token) => {
          tokensByAddress[token.address] = token;
        });

        // Process and format Sui balances
        const processedBalances = balanceData.map((balance) => {
          const token = tokensByAddress[balance.contractAddress];

          if (token && token.decimals !== undefined) {
            // Format the raw Sui balance using the token's decimals
            const formattedBalance = formatTokenBalance(
              balance.tokenBalance,
              token.decimals,
            );

            return {
              ...balance,
              tokenBalance: formattedBalance,
              balanceUsd: undefined, // No USD value calculation for Sui
            };
          } else {
            // If we don't have token info, assume SUI native with 9 decimals as fallback
            const fallbackDecimals =
              balance.contractAddress === "0x2::sui::SUI" ? 9 : 9;
            const formattedBalance = formatTokenBalance(
              balance.tokenBalance,
              fallbackDecimals,
            );

            console.warn(
              `Token info missing for Sui address ${balance.contractAddress}. Using fallback decimals (${fallbackDecimals}).`,
            );

            return {
              ...balance,
              tokenBalance: formattedBalance,
              balanceUsd: undefined,
            };
          }
        });

        // 7. Update Token Balances in the Store
        useWeb3Store
          .getState()
          .updateTokenBalances(chainId, userAddress, processedBalances);
      }

      return true;
    }

    // 3. Prepare Addresses for Price Fetching (for non-Sui chains)
    // Get tokens with alwaysLoadPrice - preserve case for Solana, lowercase for others
    const alwaysLoadPriceAddresses = useWeb3Store
      .getState()
      .allTokensList.filter(
        (token) => token.chainId === chainId && token.alwaysLoadPrice,
      )
      .map(
        (token) =>
          chain.id === "solana"
            ? token.address // Keep original case for Solana
            : token.address.toLowerCase(), // Lowercase for EVM chains
      );

    // Combine and deduplicate addresses
    const uniqueAddresses = [
      ...new Set([...addressesWithBalance, ...alwaysLoadPriceAddresses]),
    ];

    if (uniqueAddresses.length === 0) {
      console.warn(
        `No tokens to fetch prices for on ${chainType} chain ${chainId}.`,
      );
      return true; // Successfully determined there are no tokens to fetch prices for
    }

    const tokenAddressesForPriceFetch: TokenAddressInfo[] = uniqueAddresses.map(
      (address) => ({
        network: networkName,
        address: address, // This preserves the original case for Solana
      }),
    );

    // 4. Fetch Prices in Batches
    const batchSize = 25;
    const batches: TokenAddressInfo[][] = [];
    for (let i = 0; i < tokenAddressesForPriceFetch.length; i += batchSize) {
      batches.push(tokenAddressesForPriceFetch.slice(i, i + batchSize));
    }

    const allFetchedPrices: TokenPriceResult[] = [];
    const batchPromises = batches.map(async (batch, i) => {
      try {
        const response = await altverseAPI.getTokenPrices({ addresses: batch });

        if (response.error || !response.data) {
          console.error(
            `Error fetching token prices batch ${i + 1} for ${chainType} chain:`,
            response.error,
          );
          return; // Skip this batch on error
        }

        // Add successfully fetched prices to the aggregate list
        allFetchedPrices.push(...response.data.data);
      } catch (error) {
        console.error(
          `Error in price batch ${i + 1} for ${chainType} chain:`,
          error,
        );
      }
    });

    // Wait for all price batches to complete
    await Promise.all(batchPromises);

    // 5. Update Token Prices in the Store
    if (allFetchedPrices.length > 0) {
      useWeb3Store.getState().updateTokenPrices(allFetchedPrices);
    }

    // 6. Process Balances only if userAddress is provided and we have balance data
    if (userAddress && balanceData && balanceData.length > 0) {
      // Get potentially updated token info from the store (which now includes latest prices)
      const updatedTokens = useWeb3Store.getState().getTokensForChain(chainId);

      // Create lookup mapping - for Solana, create both case-sensitive and case-insensitive lookups
      const tokensByAddress: Record<string, Token> = {};
      updatedTokens.forEach((token) => {
        if (chain.id === "solana") {
          // For Solana, keep both original case and lowercase for flexible lookup
          tokensByAddress[token.address] = token;
          tokensByAddress[token.address.toLowerCase()] = token;
        } else {
          // For EVM chains, use lowercase
          tokensByAddress[token.address.toLowerCase()] = token;
        }
      });

      const processedBalances = balanceData.map((balance) => {
        // For token lookup, try original case first, then lowercase as fallback
        const tokenAddress =
          chain.id === "solana"
            ? balance.contractAddress
            : balance.contractAddress.toLowerCase();

        let token = tokensByAddress[tokenAddress];

        // If not found and this is Solana, try the other case
        if (!token && chain.id === "solana") {
          token = tokensByAddress[balance.contractAddress.toLowerCase()];
        }

        // Type guard to check if balance has Solana-specific properties
        const isSolanaBalance = (
          bal: EnhancedTokenBalance,
        ): bal is EnhancedTokenBalance & { isNative: boolean } => {
          return "isNative" in bal;
        };

        // For Solana, check if this is a native SOL balance
        if (
          chain.id === "solana" &&
          isSolanaBalance(balance) &&
          balance.isNative
        ) {
          // Handle native SOL balance - it's already formatted
          const formattedBalance = balance.tokenBalance; // Already formatted by API

          let balanceUsd: string | undefined = undefined;
          // For native SOL, we might need to look up the token info differently
          // The mint address for native SOL is "11111111111111111111111111111111"
          const nativeSolToken =
            tokensByAddress["11111111111111111111111111111111"];
          if (nativeSolToken && nativeSolToken.priceUsd) {
            try {
              const numBalance = parseFloat(formattedBalance);
              const price =
                typeof nativeSolToken.priceUsd === "string"
                  ? parseFloat(nativeSolToken.priceUsd)
                  : nativeSolToken.priceUsd;
              if (!isNaN(numBalance) && !isNaN(price)) {
                balanceUsd = (numBalance * price).toFixed(2);
              }
            } catch (e) {
              console.error(`Error calculating USD balance for native SOL:`, e);
            }
          }

          return {
            ...balance,
            tokenBalance: formattedBalance,
            balanceUsd,
          };
        }

        if (token && token.decimals !== undefined) {
          // For Solana SPL tokens, the balance is already formatted by the API
          // For EVM tokens, we need to format them
          const formattedBalance =
            chain.id === "solana"
              ? balance.tokenBalance // Already formatted by Solana API
              : formatTokenBalance(balance.tokenBalance, token.decimals); // Format for EVM

          let balanceUsd: string | undefined = undefined;
          // Use the price fetched and stored in the token object
          if (token.priceUsd) {
            try {
              const numBalance = parseFloat(formattedBalance);
              // Ensure price is treated as a number
              const price =
                typeof token.priceUsd === "string"
                  ? parseFloat(token.priceUsd)
                  : token.priceUsd;
              if (!isNaN(numBalance) && !isNaN(price)) {
                balanceUsd = (numBalance * price).toFixed(2);
              } else {
                console.warn(
                  `Invalid number for USD calculation: balance=${formattedBalance}, price=${token.priceUsd} for token ${token.ticker || tokenAddress}`,
                );
              }
            } catch (e) {
              console.error(
                `Error calculating USD balance for ${token.ticker || tokenAddress} on ${chainType} chain:`,
                e,
              );
            }
          } else {
            // Log if price is missing after attempting to fetch it
            console.warn(
              `Price missing for token ${token.ticker || tokenAddress} (address: ${tokenAddress}) on ${chainType} chain after fetch.`,
            );
          }

          return {
            ...balance, // Spread original balance data
            tokenBalance: formattedBalance, // Overwrite with formatted balance
            balanceUsd, // Add calculated USD value
          };
        } else {
          // Handle cases where token info might be missing in the store
          console.warn(
            `Token info or decimals missing for address ${tokenAddress} on chain ${chainId}. Cannot format balance or calculate USD value.`,
          );
          return {
            ...balance, // Return original balance data
            tokenBalance: balance.tokenBalance, // Keep raw balance
            balanceUsd: undefined,
          };
        }
      });

      // 7. Update Token Balances in the Store
      useWeb3Store
        .getState()
        .updateTokenBalances(chainId, userAddress, processedBalances);
    }

    return true;
  } catch (error) {
    console.error(
      `Unhandled error fetching prices and balances for ${chainType} chain ${chainId}:`,
      error,
    );
    return false;
  }

  // This return is unreachable but added for TypeScript type safety
  return false;
}

/**
 * Fetches token metadata for a specific token address and chain
 * @param chainId The chain ID where the token contract exists
 * @param contractAddress The token contract address
 * @returns Promise resolving to the token metadata or null if an error occurs
 */
export async function getTokenMetadata(
  chainId: number,
  contractAddress: string,
): Promise<TokenMetadata | null> {
  try {
    // Get chain info
    const chain = getChainByChainId(chainId);
    if (!chain) {
      console.error(`Chain with ID ${chainId} not found for token metadata`);
      return null;
    }

    // Prepare and send the request
    const response = await altverseAPI.getTokenMetadata({
      network: chain.alchemyNetworkName,
      contractAddress,
    });

    // Handle errors
    if (response.error || !response.data) {
      console.error(`Error fetching token metadata:`, response.error);
      return null;
    }
    return response.data;
  } catch (error) {
    console.error(`Error fetching token metadata:`, error);
    return null;
  }
}
