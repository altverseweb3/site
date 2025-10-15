// store/web3Store.ts

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  WalletInfo,
  Web3StoreState,
  WalletType,
  Token,
  Chain,
  SwapStateForSection,
  SerializedToken,
  SerializedSwapStateForSection,
  SectionKey,
  UserWallets,
} from "@/types/web3";
import {
  defaultSourceChain,
  defaultDestinationChain,
  getChainByChainId,
  getChainById,
} from "@/config/chains";
import {
  loadAllTokens,
  StructuredTokenData,
} from "@/utils/tokens/tokenMethods";
import { chains } from "@/config/chains";
import { TokenPrice } from "@/types/web3";
import { STORE_VERSION } from "@/store/storeVersion";

const createDefaultSwapStateForSection = (
  sourceChain?: Chain,
  destinationChain?: Chain,
): SwapStateForSection => ({
  sourceChain: sourceChain || defaultSourceChain,
  destinationChain: destinationChain || defaultDestinationChain,
  sourceToken: null,
  destinationToken: null,
  transactionDetails: {
    slippage: "auto",
    receiveAddress: null,
    gasDrop: 0,
  },
});

const useWeb3Store = create<Web3StoreState>()(
  persist(
    (set, get) => ({
      version: STORE_VERSION,
      connectedWallets: [],

      // Initialize with default integrations
      swapIntegrations: {
        swap: createDefaultSwapStateForSection(),
        earn: createDefaultSwapStateForSection(
          getChainById("ethereum"),
          getChainById("ethereum"),
        ),
        lend: createDefaultSwapStateForSection(
          getChainById("ethereum"),
          getChainById("ethereum"),
        ),
      },

      activeSwapSection: "swap" as SectionKey,

      // Token state (unchanged)
      tokensByCompositeKey: {},
      tokensByChainId: {},
      tokensByAddress: {},
      allTokensList: [],
      tokensLoading: false,
      tokensError: null,
      tokenBalancesByWallet: {},
      tokenPricesUsd: {},

      selectedAaveChains: [],

      // New integration management methods
      getSwapStateForSection: () => {
        const key = get().activeSwapSection;
        const integration = get().swapIntegrations[key];
        if (!integration) {
          console.warn(`Integration '${key}' not found, creating default`);
          get().initializeSwapStateForSection();
          return get().swapIntegrations[key];
        }
        return integration;
      },

      initializeSwapStateForSection: () => {
        const key = get().activeSwapSection;
        set((state) => ({
          swapIntegrations: {
            ...state.swapIntegrations,
            [key]: createDefaultSwapStateForSection(),
          },
        }));
      },

      setActiveSwapSection: (sectionKey: SectionKey) => {
        set({ activeSwapSection: sectionKey });
      },

      setSourceChain: (chain: Chain) => {
        const key = get().activeSwapSection;
        set((state) => {
          const integration = state.swapIntegrations[key];
          if (!integration) return state;

          return {
            swapIntegrations: {
              ...state.swapIntegrations,
              [key]: {
                ...integration,
                sourceChain: chain,
                sourceToken: null, // Reset token when changing chains
              },
            },
          };
        });
      },

      setDestinationChain: (chain: Chain) => {
        const key = get().activeSwapSection;
        set((state) => {
          const integration = state.swapIntegrations[key];
          if (!integration) return state;

          return {
            swapIntegrations: {
              ...state.swapIntegrations,
              [key]: {
                ...integration,
                destinationChain: chain,
                destinationToken: null, // Reset token when changing chains
              },
            },
          };
        });
      },

      swapChains: () => {
        const key = get().activeSwapSection;
        set((state) => {
          const integration = state.swapIntegrations[key];
          if (!integration) return state;

          const newSourceToken = integration.destinationToken
            ? { ...integration.destinationToken, alwaysLoadPrice: true }
            : null;

          const newDestinationToken = integration.sourceToken
            ? { ...integration.sourceToken, alwaysLoadPrice: true }
            : null;

          return {
            swapIntegrations: {
              ...state.swapIntegrations,
              [key]: {
                ...integration,
                sourceChain: integration.destinationChain,
                destinationChain: integration.sourceChain,
                sourceToken: newSourceToken,
                destinationToken: newDestinationToken,
              },
            },
          };
        });
      },

      setSourceToken: (token: Token | null) => {
        const key = get().activeSwapSection;
        set((state) => {
          const integration = state.swapIntegrations[key];
          if (!integration) return state;

          return {
            swapIntegrations: {
              ...state.swapIntegrations,
              [key]: {
                ...integration,
                sourceToken: token,
              },
            },
          };
        });

        // Update token collections (same logic as before)
        if (token) {
          set((state) => {
            const updatedToken = { ...token, alwaysLoadPrice: true };
            const newTokensList = state.allTokensList.map((t) =>
              t.address === token.address && t.chainId === token.chainId
                ? updatedToken
                : t,
            );
            const updatedCollections = updateTokenCollections(newTokensList);
            return {
              allTokensList: newTokensList,
              ...updatedCollections,
            };
          });
        }
      },

      setDestinationToken: (token: Token | null) => {
        const key = get().activeSwapSection;
        set((state) => {
          const integration = state.swapIntegrations[key];
          if (!integration) return state;

          return {
            swapIntegrations: {
              ...state.swapIntegrations,
              [key]: {
                ...integration,
                destinationToken: token,
              },
            },
          };
        });

        // Update token collections (same logic as before)
        if (token) {
          set((state) => {
            const updatedToken = { ...token, alwaysLoadPrice: true };
            const newTokensList = state.allTokensList.map((t) =>
              t.address === token.address && t.chainId === token.chainId
                ? updatedToken
                : t,
            );
            const updatedCollections = updateTokenCollections(newTokensList);
            return {
              allTokensList: newTokensList,
              ...updatedCollections,
            };
          });
        }
      },

      setSlippageValue: (value: "auto" | string) => {
        const key = get().activeSwapSection;
        set((state) => {
          const integration = state.swapIntegrations[key];
          if (!integration) return state;

          const formattedValue =
            value === "auto"
              ? "auto"
              : value.endsWith("%")
                ? value
                : `${value}%`;

          return {
            swapIntegrations: {
              ...state.swapIntegrations,
              [key]: {
                ...integration,
                transactionDetails: {
                  ...integration.transactionDetails,
                  slippage: formattedValue,
                },
              },
            },
          };
        });
      },

      setReceiveAddress: (address: string | null) => {
        const key = get().activeSwapSection;
        set((state) => {
          const integration = state.swapIntegrations[key];
          if (!integration) return state;

          return {
            swapIntegrations: {
              ...state.swapIntegrations,
              [key]: {
                ...integration,
                transactionDetails: {
                  ...integration.transactionDetails,
                  receiveAddress: address,
                },
              },
            },
          };
        });
      },

      setGasDrop: (gasDrop: number) => {
        const key = get().activeSwapSection;
        set((state) => {
          const integration = state.swapIntegrations[key];
          if (!integration) return state;

          return {
            swapIntegrations: {
              ...state.swapIntegrations,
              [key]: {
                ...integration,
                transactionDetails: {
                  ...integration.transactionDetails,
                  gasDrop,
                },
              },
            },
          };
        });
      },

      addCustomToken: (token: Token) => {
        set((state) => {
          // Ensure lowercase address for consistency
          const address = token.address.toLowerCase();
          const chainId = token.stringChainId;
          const compositeKey = `${chainId}-${address}`;

          // Check if token already exists in the store
          if (state.tokensByCompositeKey[compositeKey]) {
            return state; // No changes needed
          }

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

          // Get all current tokens from all swap integrations
          const currentSwapStateForSections = get().swapIntegrations;
          const selectedTokens: Token[] = [];

          // Collect all source and destination tokens from all integrations
          Object.values(currentSwapStateForSections).forEach((integration) => {
            if (integration.sourceToken) {
              selectedTokens.push(integration.sourceToken);
            }
            if (integration.destinationToken) {
              selectedTokens.push(integration.destinationToken);
            }
          });

          // Create a copy of allTokensList that we can modify
          const updatedTokensList = [...structuredTokens.allTokensList];
          let needsCollectionUpdate = false;

          // Find and update tokens that are selected in any integration
          selectedTokens.forEach((selectedToken) => {
            const tokenIndex = updatedTokensList.findIndex(
              (token) =>
                token.address.toLowerCase() ===
                  selectedToken.address.toLowerCase() &&
                token.chainId === selectedToken.chainId,
            );

            if (tokenIndex !== -1) {
              updatedTokensList[tokenIndex] = {
                ...updatedTokensList[tokenIndex],
                alwaysLoadPrice: true,
              };
              needsCollectionUpdate = true;
            }
          });

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

          // Update each integration with the full token objects
          const updatedIntegrations: Record<string, SwapStateForSection> = {};

          Object.entries(currentSwapStateForSections).forEach(
            ([key, integration]) => {
              let fullSourceToken = null;
              let fullDestinationToken = null;

              // Find full source token object if it exists
              if (integration.sourceToken) {
                fullSourceToken =
                  updatedTokensList.find(
                    (token) =>
                      token.address.toLowerCase() ===
                        integration.sourceToken!.address.toLowerCase() &&
                      token.chainId === integration.sourceToken!.chainId,
                  ) || null;
              }

              // Find full destination token object if it exists
              if (integration.destinationToken) {
                fullDestinationToken =
                  updatedTokensList.find(
                    (token) =>
                      token.address.toLowerCase() ===
                        integration.destinationToken!.address.toLowerCase() &&
                      token.chainId === integration.destinationToken!.chainId,
                  ) || null;
              }

              updatedIntegrations[key] = {
                ...integration,
                sourceToken: fullSourceToken,
                destinationToken: fullDestinationToken,
              };
            },
          );

          set({
            tokensByCompositeKey: tokensByCompositeKey,
            tokensByChainId: tokensByChainId,
            tokensByAddress: tokensByAddress,
            allTokensList: updatedTokensList,
            swapIntegrations: updatedIntegrations,
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
        const {
          tokenBalancesByWallet,
          allTokensList,
          tokensByCompositeKey,
          swapIntegrations,
        } = get();

        const chain = getChainByChainId(chainId);
        const walletKey = `${chain.id}-${userAddress.toLowerCase()}`;

        const existingBalances = tokenBalancesByWallet[walletKey] || {};
        const updatedBalances = { ...existingBalances };

        const updatedTokens: Record<string, Token> = {};

        balances.forEach((balance) => {
          const tokenAddress = balance.contractAddress.toLowerCase();

          updatedBalances[tokenAddress] = balance.tokenBalance;

          const compositeKey = `${chain.id}-${tokenAddress}`;
          const token = tokensByCompositeKey[compositeKey];
          if (token) {
            const tokenWithBalance: Token = {
              ...token,
              userBalance: balance.tokenBalance,
              isWalletToken: true,
            };

            if (token.priceUsd) {
              try {
                let numericalBalance = balance.tokenBalance;
                if (numericalBalance.startsWith("0x")) {
                  numericalBalance = BigInt(numericalBalance).toString();
                }

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

        const newTokensList = allTokensList.map((token) => {
          const compositeKey = `${token.stringChainId}-${token.address.toLowerCase()}`;
          return updatedTokens[compositeKey] || token;
        });

        const {
          tokensByCompositeKey: updatedByCompositeKey,
          tokensByChainId: updatedByChainId,
          tokensByAddress: updatedByAddress,
        } = updateTokenCollections(newTokensList);

        const updatedIntegrations: Record<string, SwapStateForSection> = {};

        Object.entries(swapIntegrations).forEach(([key, integration]) => {
          let updatedSourceToken = integration.sourceToken;
          let updatedDestinationToken = integration.destinationToken;

          if (integration.sourceToken) {
            const sourceCompositeKey = `${integration.sourceToken.stringChainId}-${integration.sourceToken.address.toLowerCase()}`;
            const refreshedSourceToken =
              updatedByCompositeKey[sourceCompositeKey];
            if (refreshedSourceToken) {
              updatedSourceToken = refreshedSourceToken;
            }
          }

          if (integration.destinationToken) {
            const destCompositeKey = `${integration.destinationToken.stringChainId}-${integration.destinationToken.address.toLowerCase()}`;
            const refreshedDestinationToken =
              updatedByCompositeKey[destCompositeKey];
            if (refreshedDestinationToken) {
              updatedDestinationToken = refreshedDestinationToken;
            }
          }

          updatedIntegrations[key] = {
            ...integration,
            sourceToken: updatedSourceToken,
            destinationToken: updatedDestinationToken,
          };
        });

        set({
          tokenBalancesByWallet: {
            ...tokenBalancesByWallet,
            [walletKey]: updatedBalances,
          },
          allTokensList: newTokensList,
          tokensByCompositeKey: updatedByCompositeKey,
          tokensByChainId: updatedByChainId,
          tokensByAddress: updatedByAddress,
          swapIntegrations: updatedIntegrations,
        });
      },
      updateTokenPrices: (priceResults) => {
        const {
          tokenPricesUsd,
          allTokensList,
          tokensByCompositeKey,
          swapIntegrations,
        } = get();
        const updatedPrices = { ...tokenPricesUsd };

        const updatedTokens: Record<string, Token> = {};

        priceResults.forEach((result) => {
          if (result.error) {
            return;
          }

          const chain = Object.values(chains).find(
            (c) => c.alchemyNetworkName === result.network,
          );

          if (!chain) {
            console.warn(`Chain not found for network ${result.network}`);
            return;
          }

          const tokenAddress = result.address.toLowerCase();
          const compositeKey = `${chain.id}-${tokenAddress}`;

          const usdPrice = result.prices.find(
            (p: TokenPrice) => p.currency.toLowerCase() === "usd",
          );
          if (usdPrice) {
            updatedPrices[compositeKey] = usdPrice.value;

            const token = tokensByCompositeKey[compositeKey];

            if (token) {
              let userBalanceUsd: string | undefined = undefined;

              if (token.userBalance) {
                try {
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

              updatedTokens[compositeKey] = {
                ...token,
                priceUsd: usdPrice.value,
                userBalanceUsd,
              };
            }
          }
        });

        const newTokensList = allTokensList.map((token) => {
          const compositeKey = `${token.stringChainId}-${token.address.toLowerCase()}`;
          return updatedTokens[compositeKey] || token;
        });

        const updatedCollections = updateTokenCollections(newTokensList);

        const updatedIntegrations: Record<string, SwapStateForSection> = {};

        Object.entries(swapIntegrations).forEach(([key, integration]) => {
          let updatedSourceToken = integration.sourceToken;
          let updatedDestinationToken = integration.destinationToken;

          if (integration.sourceToken) {
            const sourceCompositeKey = `${integration.sourceToken.stringChainId}-${integration.sourceToken.address.toLowerCase()}`;
            const refreshedSourceToken =
              updatedCollections.tokensByCompositeKey[sourceCompositeKey];
            if (refreshedSourceToken) {
              updatedSourceToken = refreshedSourceToken;
            }
          }

          if (integration.destinationToken) {
            const destCompositeKey = `${integration.destinationToken.stringChainId}-${integration.destinationToken.address.toLowerCase()}`;
            const refreshedDestinationToken =
              updatedCollections.tokensByCompositeKey[destCompositeKey];
            if (refreshedDestinationToken) {
              updatedDestinationToken = refreshedDestinationToken;
            }
          }

          updatedIntegrations[key] = {
            ...integration,
            sourceToken: updatedSourceToken,
            destinationToken: updatedDestinationToken,
          };
        });

        set({
          tokenPricesUsd: updatedPrices,
          allTokensList: newTokensList,
          ...updatedCollections,
          swapIntegrations: updatedIntegrations,
        });
      },

      setTokensLoading: (loading) => {
        set({ tokensLoading: loading });
      },

      setSelectedAaveChains(chains: Chain[]) {
        set({ selectedAaveChains: chains });
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
        // If no version exists (existing users) or version mismatch, start fresh
        if (version !== STORE_VERSION) {
          // Return undefined to trigger using the initial state
          return undefined;
        }

        // Versions match, use the persisted state
        return persistedState;
      },
      partialize: (state) => {
        const serializeToken = (token: Token | null): SerializedToken => {
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
            isNativeGas: token.isNativeGas,
            isNativeWrapped: token.isNativeWrapped,
            isL2Token: token.isL2Token,
          };
        };
        // Serialize each swap integration
        const serializedIntegrations: Record<
          string,
          SerializedSwapStateForSection
        > = {};
        Object.entries(state.swapIntegrations).forEach(([key, integration]) => {
          serializedIntegrations[key] = {
            sourceChain: integration.sourceChain,
            destinationChain: integration.destinationChain,
            sourceToken: serializeToken(integration.sourceToken),
            destinationToken: serializeToken(integration.destinationToken),
            transactionDetails: integration.transactionDetails,
          };
        });
        return {
          version: state.version,
          connectedWallets: state.connectedWallets.map((wallet) => ({
            type: wallet.type,
            name: wallet.name,
            address: wallet.address,
            chainId: wallet.chainId,
          })),
          swapIntegrations: serializedIntegrations,
          selectedAaveChains: state.selectedAaveChains,
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
  return useWeb3Store((state) => state.getSwapStateForSection().sourceChain);
};

export const useDestinationChain = (): Chain => {
  return useWeb3Store(
    (state) => state.getSwapStateForSection().destinationChain,
  );
};

// New hooks for the selected tokens
export const useSourceToken = (): Token | null => {
  return useWeb3Store((state) => state.getSwapStateForSection().sourceToken);
};

export const useDestinationToken = (): Token | null => {
  return useWeb3Store(
    (state) => state.getSwapStateForSection().destinationToken,
  );
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
  const sourceChainId = useWeb3Store(
    (state) => state.getSwapStateForSection().sourceChain.chainId,
  );
  return useWeb3Store((state) => state.tokensByChainId[sourceChainId] || []);
};

export const useDestinationChainTokens = (): Token[] => {
  const destinationChainId = useWeb3Store(
    (state) => state.getSwapStateForSection().destinationChain.chainId,
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
  return useWeb3Store(
    (state) => state.getSwapStateForSection().transactionDetails,
  );
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

export const useSetActiveSwapSection = () => {
  return useWeb3Store((state) => state.setActiveSwapSection);
};

export const useSelectedAaveChains = (): Chain[] => {
  return useWeb3Store((state) => state.selectedAaveChains);
};

export const useSetSelectedAaveChains = () => {
  return useWeb3Store((state) => state.setSelectedAaveChains);
};

export const useExtractUserWallets = (
  connectedWallets: Array<Omit<WalletInfo, "provider">>,
): UserWallets => {
  const userWallets: UserWallets = {};

  connectedWallets.forEach((wallet) => {
    switch (wallet.type) {
      case WalletType.EVM:
        userWallets.evm = wallet.address;
        break;
      case WalletType.SOLANA:
        userWallets.solana = wallet.address;
        break;
      case WalletType.SUI:
        userWallets.sui = wallet.address;
        break;
      default:
        console.warn(`Unknown wallet type: ${wallet.type}`);
    }
  });

  return userWallets;
};

export const useConnectedWalletSummary = (
  connectedWallets: Array<Omit<WalletInfo, "provider">>,
): {
  hasEVM: boolean;
  hasSolana: boolean;
  hasSUI: boolean;
  totalConnected: number;
  walletsByType: Record<string, string>;
} => {
  const userWallets = useExtractUserWallets(connectedWallets);

  return {
    hasEVM: !!userWallets.evm,
    hasSolana: !!userWallets.solana,
    hasSUI: !!userWallets.sui,
    totalConnected: connectedWallets.length,
    walletsByType: {
      EVM: userWallets.evm || "Not connected",
      Solana: userWallets.solana || "Not connected",
      SUI: userWallets.sui || "Not connected",
    },
  };
};

export default useWeb3Store;
