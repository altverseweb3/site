// store/web3Store.ts

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  WalletInfo,
  Web3StoreState,
  WalletType,
  Token,
  Chain,
} from "@/types/web3";
import {
  defaultSourceChain,
  defaultDestinationChain,
  getChainByChainId,
} from "@/config/chains";
import { loadAllTokens, StructuredTokenData } from "@/utils/tokenMethods";
import { chains } from "@/config/chains";
import { TokenPrice } from "@/types/web3";

const STORE_VERSION = 1;

const useWeb3Store = create<Web3StoreState>()(
  persist(
    (set, get) => ({
      version: STORE_VERSION,

      connectedWallets: [],

      // Chain selection state
      sourceChain: defaultSourceChain,
      destinationChain: defaultDestinationChain,

      // Token selection state
      sourceToken: null,
      destinationToken: null,

      // Transaction details state
      transactionDetails: {
        slippage: "auto", // Default slippage value
        receiveAddress: null,
        gasDrop: 0,
      },

      // tokens
      tokensByCompositeKey: {},
      tokensByChainId: {},
      tokensByAddress: {},
      allTokensList: [],
      tokensLoading: false,
      tokensError: null,

      tokenBalancesByWallet: {},
      tokenPricesUsd: {},

      // Transaction details actions
      setSlippageValue: (value: "auto" | string) => {
        set((state) => {
          // If value is "auto", use it directly
          if (value === "auto") {
            return {
              transactionDetails: {
                ...state.transactionDetails,
                slippage: "auto",
              },
            };
          }

          // Otherwise, ensure the value has % suffix for percentage values
          const formattedValue = value.endsWith("%") ? value : `${value}%`;
          return {
            transactionDetails: {
              ...state.transactionDetails,
              slippage: formattedValue,
            },
          };
        });
      },

      setReceiveAddress: (address: string | null) => {
        set((state) => ({
          transactionDetails: {
            ...state.transactionDetails,
            receiveAddress: address,
          },
        }));
      },

      setGasDrop: (gasDrop: number) => {
        set((state) => ({
          transactionDetails: {
            ...state.transactionDetails,
            gasDrop: gasDrop,
          },
        }));
      },

      // Wallet actions
      addWallet: (wallet: WalletInfo) => {
        const walletForStorage = {
          type: wallet.type,
          name: wallet.name,
          address: wallet.address,
          chainId: wallet.chainId,
        };

        set((state) => {
          const existingWalletIndex = state.connectedWallets.findIndex(
            (w) => w.type === wallet.type,
          );
          let newWallets: Array<Omit<WalletInfo, "provider">>;

          if (existingWalletIndex >= 0) {
            newWallets = [...state.connectedWallets];
            newWallets[existingWalletIndex] = walletForStorage;
          } else {
            newWallets = [...state.connectedWallets, walletForStorage];
          }

          return {
            connectedWallets: newWallets,
          };
        });
      },

      removeWallet: (walletType: WalletType) => {
        set((state) => {
          const updatedWallets = state.connectedWallets.filter(
            (w) => w.type !== walletType,
          );

          return {
            connectedWallets: updatedWallets,
          };
        });
      },

      updateWalletAddress: (walletType: WalletType, address: string) => {
        set((state) => ({
          connectedWallets: state.connectedWallets.map((wallet) =>
            wallet.type === walletType ? { ...wallet, address } : wallet,
          ),
        }));
      },

      updateWalletChainId: (walletType: WalletType, chainId: number) => {
        set((state) => ({
          connectedWallets: state.connectedWallets.map((wallet) =>
            wallet.type === walletType ? { ...wallet, chainId } : wallet,
          ),
        }));
      },

      disconnectAll: () => {
        set({
          connectedWallets: [],
        });
      },

      // New method to get all wallets of a specific type
      getWalletsOfType: (walletType?: WalletType): WalletInfo[] => {
        const wallets = get().connectedWallets;
        // If walletType is undefined, return all wallets
        if (walletType === undefined) {
          return wallets;
        }
        // Otherwise, filter by the specified wallet type
        return wallets.filter((w) => w.type === walletType);
      },

      getWalletBySourceChain: () => {
        const sourceChainWalletType = get().sourceChain.walletType;
        return (
          get().connectedWallets.find(
            (w) => w.type === sourceChainWalletType,
          ) || null
        );
      },

      getWalletByDestinationChain: () => {
        const destinationChainWalletType = get().destinationChain.walletType;
        return (
          get().connectedWallets.find(
            (w) => w.type === destinationChainWalletType,
          ) || null
        );
      },

      // New method to check if a specific wallet type is connected
      isWalletTypeConnected: (walletType: WalletType): boolean => {
        return get().connectedWallets.some((w) => w.type === walletType);
      },

      // New method to get a connected wallet by type
      getWalletByType: (walletType: WalletType): WalletInfo | null => {
        return (
          get().connectedWallets.find((w) => w.type === walletType) || null
        );
      },

      // Chain selection actions
      setSourceChain: (chain: Chain) => {
        set((state) => {
          return {
            sourceChain: chain,
            destinationChain: state.destinationChain,
            // Reset source token when changing chains
            sourceToken: null,
          };
        });
      },

      setDestinationChain: (chain: Chain) => {
        set((state) => ({
          destinationChain: chain,
          sourceChain: state.sourceChain,
          // Reset destination token when changing chains
          destinationToken: null,
        }));
      },

      swapChains: () => {
        set((state) => {
          const newSourceToken = state.destinationToken
            ? {
                ...state.destinationToken,
                alwaysLoadPrice: true,
              }
            : null;

          const newDestinationToken = state.sourceToken
            ? {
                ...state.sourceToken,
                alwaysLoadPrice: true,
              }
            : null;

          return {
            sourceChain: state.destinationChain,
            destinationChain: state.sourceChain,
            sourceToken: newSourceToken,
            destinationToken: newDestinationToken,
          };
        });
      },

      // Token selection actions
      setSourceToken: (token: Token | null) => {
        console.log("Setting source token:", token ? token.name : "null");
        set({ sourceToken: token });
        // Update token collections to set source token to have alwaysLoadPrice to true
        if (token) {
          set((state) => {
            const updatedToken = {
              ...token,
              alwaysLoadPrice: true,
            };
            const newTokensList = state.allTokensList.map((t) =>
              t.address === token.address && t.chainId === token.chainId
                ? updatedToken
                : t,
            );
            const {
              tokensByCompositeKey: updatedByCompositeKey,
              tokensByChainId: updatedByChainId,
              tokensByAddress: updatedByAddress,
            } = updateTokenCollections(newTokensList);
            return {
              allTokensList: newTokensList,
              tokensByCompositeKey: updatedByCompositeKey,
              tokensByChainId: updatedByChainId,
              tokensByAddress: updatedByAddress,
            };
          });
        }
      },

      setDestinationToken: (token: Token | null) => {
        console.log("Setting destination token:", token ? token.name : "null");
        set({ destinationToken: token });
        // Update token collections to set destination token to have alwaysLoadPrice to true
        if (token) {
          set((state) => {
            const updatedToken = {
              ...token,
              alwaysLoadPrice: true,
            };
            const newTokensList = state.allTokensList.map((t) =>
              t.address === token.address && t.chainId === token.chainId
                ? updatedToken
                : t,
            );
            const {
              tokensByCompositeKey: updatedByCompositeKey,
              tokensByChainId: updatedByChainId,
              tokensByAddress: updatedByAddress,
            } = updateTokenCollections(newTokensList);
            return {
              allTokensList: newTokensList,
              tokensByCompositeKey: updatedByCompositeKey,
              tokensByChainId: updatedByChainId,
              tokensByAddress: updatedByAddress,
            };
          });
        }
      },

      addCustomToken: (token: Token) => {
        set((state) => {
          // Ensure lowercase address for consistency
          const address = token.address.toLowerCase();
          const chainId = token.stringChainId;
          const compositeKey = `${chainId}-${address}`;

          // Check if token already exists in the store
          if (state.tokensByCompositeKey[compositeKey]) {
            console.log("Token already exists in store:", compositeKey);
            return state; // No changes needed
          }

          console.log("Adding custom token to store:", token);

          // Add token to allTokensList
          const newTokensList = [...state.allTokensList, token];

          // Update derived collections
          const {
            tokensByCompositeKey: updatedByCompositeKey,
            tokensByChainId: updatedByChainId,
            tokensByAddress: updatedByAddress,
          } = updateTokenCollections(newTokensList);

          return {
            allTokensList: newTokensList,
            tokensByCompositeKey: updatedByCompositeKey,
            tokensByChainId: updatedByChainId,
            tokensByAddress: updatedByAddress,
          };
        });
      },

      loadTokens: async () => {
        if (get().tokensLoading) return;

        try {
          set({ tokensLoading: true, tokensError: null });
          const structuredTokens: StructuredTokenData = await loadAllTokens();

          // Get current serialized tokens
          const currentSourceToken = get().sourceToken;
          const currentDestinationToken = get().destinationToken;

          // Create a copy of allTokensList that we can modify
          const updatedTokensList = [...structuredTokens.allTokensList];
          let needsCollectionUpdate = false;

          // Find and update source token if it exists
          if (currentSourceToken) {
            const sourceTokenIndex = updatedTokensList.findIndex(
              (token) =>
                token.address.toLowerCase() ===
                  currentSourceToken.address.toLowerCase() &&
                token.chainId === currentSourceToken.chainId,
            );

            if (sourceTokenIndex !== -1) {
              updatedTokensList[sourceTokenIndex] = {
                ...updatedTokensList[sourceTokenIndex],
                alwaysLoadPrice: true,
              };
              needsCollectionUpdate = true;
            }
          }

          // Find and update destination token if it exists
          if (currentDestinationToken) {
            const destTokenIndex = updatedTokensList.findIndex(
              (token) =>
                token.address.toLowerCase() ===
                  currentDestinationToken.address.toLowerCase() &&
                token.chainId === currentDestinationToken.chainId,
            );

            if (destTokenIndex !== -1) {
              updatedTokensList[destTokenIndex] = {
                ...updatedTokensList[destTokenIndex],
                alwaysLoadPrice: true,
              };
              needsCollectionUpdate = true;
            }
          }

          // If we updated any tokens, update the derived collections
          let tokensByCompositeKey = structuredTokens.byCompositeKey;
          let tokensByChainId = structuredTokens.byChainId;
          let tokensByAddress = structuredTokens.byChainIdAndAddress;

          if (needsCollectionUpdate) {
            const updatedCollections =
              updateTokenCollections(updatedTokensList);
            tokensByCompositeKey = updatedCollections.tokensByCompositeKey;
            tokensByChainId = updatedCollections.tokensByChainId;
            tokensByAddress = updatedCollections.tokensByAddress;
          }

          // Now get the full token objects with alwaysLoadPrice set
          let fullSourceToken = null;
          let fullDestinationToken = null;

          if (currentSourceToken) {
            fullSourceToken =
              updatedTokensList.find(
                (token) =>
                  token.address.toLowerCase() ===
                    currentSourceToken.address.toLowerCase() &&
                  token.chainId === currentSourceToken.chainId,
              ) || null;
          }

          if (currentDestinationToken) {
            fullDestinationToken =
              updatedTokensList.find(
                (token) =>
                  token.address.toLowerCase() ===
                    currentDestinationToken.address.toLowerCase() &&
                  token.chainId === currentDestinationToken.chainId,
              ) || null;
          }

          set({
            tokensByCompositeKey: tokensByCompositeKey,
            tokensByChainId: tokensByChainId,
            tokensByAddress: tokensByAddress,
            allTokensList: updatedTokensList,
            sourceToken: fullSourceToken,
            destinationToken: fullDestinationToken,
            tokensLoading: false,
            tokensError: null,
          });
        } catch (error) {
          console.error("Error loading tokens:", error);
          set({
            tokensByCompositeKey: {}, // Reset on error
            tokensByChainId: {},
            tokensByAddress: {},
            allTokensList: [],
            tokensError: error instanceof Error ? error.message : String(error),
            tokensLoading: false,
          });
        }
      },

      getTokensForChain: (chainId: number): Token[] => {
        return get().tokensByChainId[chainId] || [];
      },

      updateTokenBalances: (chainId, userAddress, balances) => {
        const { tokenBalancesByWallet, allTokensList, tokensByCompositeKey } =
          get();

        // Create a wallet key for storing balances
        const chain = getChainByChainId(chainId); // Ensure chain exists
        const walletKey = `${chain.id}-${userAddress.toLowerCase()}`;

        // Get existing balances or create a new record
        const existingBalances = tokenBalancesByWallet[walletKey] || {};
        const updatedBalances = { ...existingBalances };

        // Create a map to track which tokens have been updated
        const updatedTokens: Record<string, Token> = {};

        // Process each balance
        balances.forEach((balance) => {
          const tokenAddress = balance.contractAddress.toLowerCase();

          // Store the balance (keeping it as a string)
          updatedBalances[tokenAddress] = balance.tokenBalance;

          // Find token in our collections
          const compositeKey = `${chain.id}-${tokenAddress}`;
          const token = tokensByCompositeKey[compositeKey];
          if (token) {
            // Create updated token with balance info
            const tokenWithBalance: Token = {
              ...token,
              userBalance: balance.tokenBalance,
              isWalletToken: true,
            };

            // Calculate USD balance if price is available in the token
            if (token.priceUsd) {
              try {
                // Convert balance from Wei to token units based on decimals
                let numericalBalance = balance.tokenBalance;
                if (numericalBalance.startsWith("0x")) {
                  numericalBalance = BigInt(numericalBalance).toString();
                }

                // Format with 2 decimal places for currency display
                tokenWithBalance.userBalanceUsd = (
                  Number(numericalBalance) * Number(token.priceUsd)
                ).toFixed(2);
              } catch (e) {
                console.error("Error calculating USD balance:", e);
              }
            }

            updatedTokens[compositeKey] = tokenWithBalance;
          }
        });

        // Update tokens in our main list
        const newTokensList = allTokensList.map((token) => {
          const compositeKey = `${token.stringChainId}-${token.address.toLowerCase()}`;
          return updatedTokens[compositeKey] || token;
        });

        // Get updated derived collections
        const {
          tokensByCompositeKey: updatedByCompositeKey,
          tokensByChainId: updatedByChainId,
          tokensByAddress: updatedByAddress,
        } = updateTokenCollections(newTokensList);

        // Update the store
        set({
          tokenBalancesByWallet: {
            ...tokenBalancesByWallet,
            [walletKey]: updatedBalances,
          },
          allTokensList: newTokensList,
          tokensByCompositeKey: updatedByCompositeKey,
          tokensByChainId: updatedByChainId,
          tokensByAddress: updatedByAddress,
        });
      },

      updateTokenPrices: (priceResults) => {
        const { tokenPricesUsd, allTokensList, tokensByCompositeKey } = get();
        // Create a copy of current prices
        const updatedPrices = { ...tokenPricesUsd };

        // Create a map to track which tokens have been updated
        const updatedTokens: Record<string, Token> = {};

        // Process each price result
        priceResults.forEach((result) => {
          if (result.error) {
            console.error(
              `Error in price data for ${result.network}/${result.address}:`,
              result.error,
            );
            return;
          }

          // Find the chain for this network
          const chain = Object.values(chains).find(
            (c) => c.alchemyNetworkName === result.network,
          );

          if (!chain) {
            console.warn(`Chain not found for network ${result.network}`);
            return;
          }

          const tokenAddress = result.address.toLowerCase();
          const compositeKey = `${chain.id}-${tokenAddress}`;

          // Find USD price if available
          const usdPrice = result.prices.find(
            (p: TokenPrice) => p.currency.toLowerCase() === "usd",
          );
          if (usdPrice) {
            // Store price in the prices map
            updatedPrices[compositeKey] = usdPrice.value;

            // Find token in our collections
            const token = tokensByCompositeKey[compositeKey];

            if (token) {
              let userBalanceUsd: string | undefined = undefined;

              // Calculate USD balance if we have both price and balance
              if (token.userBalance) {
                try {
                  // Handle hex balance
                  let balance = token.userBalance;
                  if (balance.startsWith("0x")) {
                    balance = BigInt(balance).toString();
                  }
                  const balanceInTokenUnits = Number(balance);
                  const price = Number(usdPrice.value);

                  userBalanceUsd = (balanceInTokenUnits * price).toString();
                } catch (e) {
                  console.error("Error calculating USD balance:", e);
                }
              }

              // Update token with price info
              updatedTokens[compositeKey] = {
                ...token,
                priceUsd: usdPrice.value, // Store the price in the token object
                userBalanceUsd,
              };
            }
          }
        });

        // Update tokens in our main list
        const newTokensList = allTokensList.map((token) => {
          const compositeKey = `${token.stringChainId}-${token.address.toLowerCase()}`;
          return updatedTokens[compositeKey] || token;
        });

        // Get updated derived collections
        const updatedCollections = updateTokenCollections(newTokensList);

        // Update the store
        set({
          tokenPricesUsd: updatedPrices,
          allTokensList: newTokensList,
          ...updatedCollections,
        });
      },

      setTokensLoading: (loading) => {
        set({ tokensLoading: loading });
      },
    }),
    {
      name: "altverse-storage-web3",
      version: STORE_VERSION,
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          return {
            getItem: () => Promise.resolve(null),
            setItem: () => Promise.resolve(),
            removeItem: () => Promise.resolve(),
          };
        }
        return localStorage;
      }),
      migrate: (persistedState: unknown, version: number) => {
        console.log(
          `Checking store version. Persisted: ${version}, Current: ${STORE_VERSION}`,
        );

        // If no version exists (existing users) or version mismatch, start fresh
        if (version !== STORE_VERSION) {
          console.log(
            `Store version mismatch or missing. Persisted: ${version}, Current: ${STORE_VERSION}. Starting with fresh state.`,
          );
          // Return undefined to trigger using the initial state
          return undefined;
        }

        // Versions match, use the persisted state
        return persistedState;
      },
      partialize: (state) => {
        const serializeToken = (token: Token | null) => {
          if (!token) return null;
          return {
            id: token.id,
            name: token.name,
            ticker: token.ticker,
            icon: token.icon,
            address: token.address,
            decimals: token.decimals,
            chainId: token.chainId,
            userBalance: token.userBalance,
            userBalanceUsd: token.userBalanceUsd,
            isWalletToken: token.isWalletToken,
            alwaysLoadPrice: token.alwaysLoadPrice,
          };
        };
        return {
          // Include version in persisted data
          version: state.version,
          // Only persist what we need and ensure we don't store providers
          connectedWallets: state.connectedWallets.map((wallet) => ({
            type: wallet.type,
            name: wallet.name,
            address: wallet.address,
            chainId: wallet.chainId,
          })),
          sourceChain: state.sourceChain,
          destinationChain: state.destinationChain,
          transactionDetails: state.transactionDetails,
          sourceToken: serializeToken(state.sourceToken),
          destinationToken: serializeToken(state.destinationToken),
        };
      },
    },
  ),
);

const updateTokenCollections = (
  tokens: Token[],
): {
  tokensByCompositeKey: Record<string, Token>;
  tokensByChainId: Record<number, Token[]>;
  tokensByAddress: Record<number, Record<string, Token>>;
} => {
  // Create new collections
  const byCompositeKey: Record<string, Token> = {};
  const byChainId: Record<number, Token[]> = {};
  const byChainIdAndAddress: Record<number, Record<string, Token>> = {};

  // Populate collections
  tokens.forEach((token) => {
    const chainId = token.chainId;
    const stringChainId = token.stringChainId;
    const address = token.address.toLowerCase();
    const compositeKey = `${stringChainId}-${address}`;

    // Update byCompositeKey
    byCompositeKey[compositeKey] = token;

    // Update byChainId
    if (!byChainId[chainId]) {
      byChainId[chainId] = [];
    }
    byChainId[chainId].push(token);

    // Update byChainIdAndAddress
    if (!byChainIdAndAddress[chainId]) {
      byChainIdAndAddress[chainId] = {};
    }
    byChainIdAndAddress[chainId][address] = token;
  });

  // Update the store
  return {
    tokensByCompositeKey: byCompositeKey,
    tokensByChainId: byChainId,
    tokensByAddress: byChainIdAndAddress,
  };
};

export const useSourceChain = (): Chain => {
  return useWeb3Store((state) => state.sourceChain);
};

export const useDestinationChain = (): Chain => {
  return useWeb3Store((state) => state.destinationChain);
};

// Get wallet by type hook
export const useWalletByType = (walletType: WalletType): WalletInfo | null => {
  return useWeb3Store((state) => state.getWalletByType(walletType));
};

// Check if a wallet type is connected
export const useIsWalletTypeConnected = (walletType: WalletType): boolean => {
  return useWeb3Store((state) => state.isWalletTypeConnected(walletType));
};

// Get all wallets of a specific type
export const useWalletsOfType = (walletType: WalletType): WalletInfo[] => {
  return useWeb3Store((state) => state.getWalletsOfType(walletType));
};

// New hooks for the selected tokens
export const useSourceToken = (): Token | null => {
  return useWeb3Store((state) => state.sourceToken);
};

export const useDestinationToken = (): Token | null => {
  return useWeb3Store((state) => state.destinationToken);
};

export const useTokensLoading = (): boolean => {
  return useWeb3Store((state) => state.tokensLoading);
};

export const useTokensError = (): string | null => {
  return useWeb3Store((state) => state.tokensError);
};

export const useAllTokensList = (): Token[] => {
  return useWeb3Store((state) => state.allTokensList);
};

export const useTokensForChain = (chainId: number): Token[] => {
  return useWeb3Store((state) => state.tokensByChainId[chainId] || []);
};

export const useSourceChainTokens = (): Token[] => {
  const sourceChainId = useWeb3Store((state) => state.sourceChain.chainId);
  return useWeb3Store((state) => state.tokensByChainId[sourceChainId] || []);
};

export const useDestinationChainTokens = (): Token[] => {
  const destinationChainId = useWeb3Store(
    (state) => state.destinationChain.chainId,
  );
  return useWeb3Store(
    (state) => state.tokensByChainId[destinationChainId] || [],
  );
};

export const useTokenByAddress = (
  address: string | undefined,
  chainId: number | undefined,
): Token | undefined => {
  const lowerAddress = address?.toLowerCase();
  return useWeb3Store((state) => {
    if (!lowerAddress || chainId === undefined) return undefined;
    const chainTokens = state.tokensByAddress[chainId];
    return chainTokens ? chainTokens[lowerAddress] : undefined;
  });
};

export const useLoadTokens = () => {
  return useWeb3Store((state) => state.loadTokens);
};

export const useTransactionDetails = () => {
  return useWeb3Store((state) => state.transactionDetails);
};

export const useSetSlippageValue = () => {
  return useWeb3Store((state) => state.setSlippageValue);
};

export const useSetReceiveAddress = () => {
  return useWeb3Store((state) => state.setReceiveAddress);
};

export const useSetGasDrop = () => {
  return useWeb3Store((state) => state.setGasDrop);
};

export default useWeb3Store;
