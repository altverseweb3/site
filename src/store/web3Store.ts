import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  WalletInfo,
  Web3StoreState,
  WalletType,
  Token,
  Chain,
} from "@/types/web3";
import { defaultSourceChain, defaultDestinationChain } from "@/config/chains";
import { loadAllTokens, StructuredTokenData } from "@/utils/tokenMethods";

const useWeb3Store = create<Web3StoreState>()(
  persist(
    (set, get) => ({
      connectedWallets: [],
      activeWallet: null,

      // Chain selection state
      sourceChain: defaultSourceChain,
      destinationChain: defaultDestinationChain,

      // Token selection state
      sourceToken: null,
      destinationToken: null,

      // Transaction details state
      transactionDetails: {
        slippage: "3.25%", // Default slippage value
        receiveAddress: null,
      },

      // tokens
      tokensByCompositeKey: {},
      tokensByChainId: {},
      tokensByAddress: {},
      allTokensList: [],
      tokensLoading: false,
      tokensError: null,

      // Transaction details actions
      setSlippageValue: (value: string) => {
        // Ensure value has % suffix
        const formattedValue = value.endsWith("%") ? value : `${value}%`;
        set((state) => ({
          transactionDetails: {
            ...state.transactionDetails,
            slippage: formattedValue,
          },
        }));
      },

      setReceiveAddress: (address: string | null) => {
        set((state) => ({
          transactionDetails: {
            ...state.transactionDetails,
            receiveAddress: address,
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
            activeWallet: state.activeWallet || walletForStorage,
          };
        });
      },

      removeWallet: (walletType: WalletType) => {
        set((state) => ({
          connectedWallets: state.connectedWallets.filter(
            (w) => w.type !== walletType,
          ),
          activeWallet:
            state.activeWallet?.type === walletType
              ? state.connectedWallets.find((w) => w.type !== walletType) ||
                null
              : state.activeWallet,
        }));
      },

      setActiveWallet: (walletType: WalletType) => {
        set((state) => ({
          activeWallet:
            state.connectedWallets.find((w) => w.type === walletType) ||
            state.activeWallet,
        }));
      },

      updateWalletAddress: (walletType: WalletType, address: string) => {
        set((state) => ({
          connectedWallets: state.connectedWallets.map((wallet) =>
            wallet.type === walletType ? { ...wallet, address } : wallet,
          ),
          activeWallet:
            state.activeWallet?.type === walletType
              ? { ...state.activeWallet, address }
              : state.activeWallet,
        }));
      },

      updateWalletChainId: (walletType: WalletType, chainId: number) => {
        set((state) => ({
          connectedWallets: state.connectedWallets.map((wallet) =>
            wallet.type === walletType ? { ...wallet, chainId } : wallet,
          ),
          activeWallet:
            state.activeWallet?.type === walletType
              ? { ...state.activeWallet, chainId }
              : state.activeWallet,
        }));
      },

      disconnectAll: () => {
        set({
          connectedWallets: [],
          activeWallet: null,
        });
      },

      // Chain selection actions
      setSourceChain: (chain: Chain) => {
        set((state) => ({
          sourceChain: chain,
          destinationChain:
            state.destinationChain.id === chain.id
              ? state.sourceChain
              : state.destinationChain,
          // Reset source token when changing chains
          sourceToken: null,
        }));
      },

      setDestinationChain: (chain: Chain) => {
        set((state) => ({
          destinationChain: chain,
          sourceChain:
            state.sourceChain.id === chain.id
              ? state.destinationChain
              : state.sourceChain,
          // Reset destination token when changing chains
          destinationToken: null,
        }));
      },

      swapChains: () => {
        set((state) => ({
          sourceChain: state.destinationChain,
          destinationChain: state.sourceChain,
          // Swap tokens along with chains
          sourceToken: state.destinationToken,
          destinationToken: state.sourceToken,
        }));
      },

      // Token selection actions
      setSourceToken: (token: Token | null) => {
        console.log("Setting source token:", token ? token.name : "null");
        set({ sourceToken: token });
      },

      setDestinationToken: (token: Token | null) => {
        console.log("Setting destination token:", token ? token.name : "null");
        set({ destinationToken: token });
      },

      swapTokens: () => {
        const state = get();
        console.log(
          "Swapping tokens:",
          state.sourceToken ? state.sourceToken.name : "null",
          "<->",
          state.destinationToken ? state.destinationToken.name : "null",
        );
        set((state) => ({
          sourceToken: state.destinationToken,
          destinationToken: state.sourceToken,
        }));
      },

      loadTokens: async () => {
        if (get().tokensLoading) return;

        try {
          set({ tokensLoading: true, tokensError: null });
          const structuredTokens: StructuredTokenData = await loadAllTokens();

          // Get current serialized tokens
          const currentSourceToken = get().sourceToken;
          const currentDestinationToken = get().destinationToken;

          // Find the full token objects from the loaded tokens if they exist
          let fullSourceToken = null;
          let fullDestinationToken = null;

          if (currentSourceToken) {
            fullSourceToken =
              structuredTokens.allTokensList.find(
                (token) =>
                  token.address.toLowerCase() ===
                    currentSourceToken.address.toLowerCase() &&
                  token.chainId === currentSourceToken.chainId,
              ) || null;
          }

          if (currentDestinationToken) {
            fullDestinationToken =
              structuredTokens.allTokensList.find(
                (token) =>
                  token.address.toLowerCase() ===
                    currentDestinationToken.address.toLowerCase() &&
                  token.chainId === currentDestinationToken.chainId,
              ) || null;
          }

          set({
            tokensByCompositeKey: structuredTokens.byCompositeKey,
            tokensByChainId: structuredTokens.byChainId,
            tokensByAddress: structuredTokens.byChainIdAndAddress,
            allTokensList: structuredTokens.allTokensList,
            // Rehydrate full token objects from the loaded token list
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

      getWalletTokens: (): Token[] => {
        return get().allTokensList.filter((token) => token.isWalletToken);
      },

      getAllTokens: (): Token[] => {
        return get().allTokensList.filter((token) => !token.isWalletToken);
      },

      getTokensForChain: (chainId: number): Token[] => {
        return get().tokensByChainId[chainId] || [];
      },

      getTokenById: (compositeKey: string): Token | undefined => {
        return get().tokensByCompositeKey[compositeKey];
      },

      getTokenByAddress: (
        address: string,
        chainId: number,
      ): Token | undefined => {
        const lowerAddress = address.toLowerCase();
        const chainTokensByAddress = get().tokensByAddress[chainId];
        return chainTokensByAddress
          ? chainTokensByAddress[lowerAddress]
          : undefined;
      },

      findTokenByAddressAnyChain: (address: string): Token | undefined => {
        const lowerAddress = address.toLowerCase();
        return get().allTokensList.find(
          (token) => token.address.toLowerCase() === lowerAddress,
        );
      },
    }),
    {
      name: "altverse-storage-web3",
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
          };
        };
        return {
          // Only persist what we need and ensure we don't store providers
          connectedWallets: state.connectedWallets.map((wallet) => ({
            type: wallet.type,
            name: wallet.name,
            address: wallet.address,
            chainId: wallet.chainId,
          })),
          activeWallet: state.activeWallet
            ? {
                type: state.activeWallet.type,
                name: state.activeWallet.name,
                address: state.activeWallet.address,
                chainId: state.activeWallet.chainId,
              }
            : null,
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

export const useCurrentChainId = (): number | null => {
  return useWeb3Store((state) => state.activeWallet?.chainId ?? null);
};

export const useSourceChain = (): Chain => {
  return useWeb3Store((state) => state.sourceChain);
};

export const useDestinationChain = (): Chain => {
  return useWeb3Store((state) => state.destinationChain);
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

export default useWeb3Store;
