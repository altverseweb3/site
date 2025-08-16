"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Search, X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  StyledDialogClose,
  DialogTitle,
} from "@/components/ui/StyledDialog";
import { Token, Chain } from "@/types/web3";
import useWeb3Store, {
  useSourceChain,
  useDestinationChain,
  useSourceToken,
  useDestinationToken,
} from "@/store/web3Store";
import { TokenImage } from "@/components/ui/TokenImage";
import { useDebounce } from "use-debounce";
import { SkeletonTokenList } from "@/components/ui/SkeletonTokenList";
import { getTokenMetadata } from "@/utils/tokens/tokenApiMethods";
import useUIStore from "@/store/uiStore";
import { parseDecimalNumber } from "@/utils/tokens/tokenMethods";
import { truncateAddress, formatBalance } from "@/utils/formatters";
import SelectChainButton from "@/components/ui/SelectChainButton";

interface TokenListItemProps {
  token: Token;
  onSelect: (token: Token) => void;
  copiedAddresses: Record<string, boolean>;
  onCopy: (text: string, tokenId: string) => void;
  chain: Chain;
}

const TokenListItem: React.FC<TokenListItemProps> = React.memo(
  ({ token, onSelect, copiedAddresses, onCopy, chain }) => {
    const handleClick = useCallback(() => {
      onSelect(token);
    }, [onSelect, token]);

    const handleCopy = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onCopy(token.address, token.id);
      },
      [onCopy, token.address, token.id],
    );

    const FormattedNumber = ({ value }: { value: string | number }) => {
      const { hasSubscript, subscriptCount, remainingDigits } =
        parseDecimalNumber(value);

      if (hasSubscript) {
        return (
          <span>
            0.0<sub>{subscriptCount}</sub>
            {remainingDigits}
          </span>
        );
      }

      return <span>{remainingDigits}</span>;
    };

    return (
      <div className="px-2 py-0.5 cursor-pointer group" onClick={handleClick}>
        <div className="flex items-center justify-between p-[5px] px-[9px] rounded-md w-full transition-colors duration-150 ease-in-out hover:bg-[#27272A]">
          <div className="flex items-center gap-3">
            <TokenImage token={token} chain={chain} />

            <div className="flex flex-col">
              <div className="font-medium text-[#FAFAFA]">
                {token.name.length > 32
                  ? token.name.slice(0, 32) + "..."
                  : token.name}
              </div>
              <div className="flex items-center text-sm text-[#FAFAFA55]">
                <span className="numeric-input flex items-center w-16">
                  {token.ticker}
                </span>
                <div className="flex items-center">
                  <span className="numeric-input text-sm flex items-center">
                    {truncateAddress(token.address)}
                  </span>
                  <button
                    className="ml-1 text-[#FAFAFA40] hover:text-[#FAFAFA80] focus:outline-none transition-colors opacity-0 group-hover:opacity-100"
                    onClick={handleCopy}
                    title="Copy address"
                    aria-label="Copy address to clipboard"
                  >
                    <div className="relative h-3 w-3">
                      <Copy
                        className={`h-3 w-3 absolute transition-all duration-300 ${
                          copiedAddresses[token.id]
                            ? "opacity-0 scale-75 transform rotate-[-8deg]"
                            : "opacity-100"
                        }`}
                      />

                      <Check
                        className={`h-3 w-3 absolute text-amber-500 transition-all duration-300 ${
                          copiedAddresses[token.id]
                            ? "opacity-100 scale-100"
                            : "opacity-0 scale-50 transform rotate-[15deg]"
                        }`}
                      />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-regular text-[#FAFAFA] numeric-input">
              {token.userBalanceUsd
                ? `$${formatBalance(token.userBalanceUsd)}`
                : ""}
            </div>
            <div className="text-sm text-[#FAFAFA55] numeric-input">
              <FormattedNumber value={token.userBalance || "0"} />
            </div>
          </div>
        </div>
      </div>
    );
  },
);

TokenListItem.displayName = "TokenListItem";

interface TokenListSectionProps {
  title: string;
  className: string;
  tokens: Token[];
  onSelectToken: (token: Token) => void;
  copiedAddresses: Record<string, boolean>;
  onCopy: (text: string, tokenId: string) => void;
  chain: Chain;
}

const TokenListSection: React.FC<TokenListSectionProps> = React.memo(
  ({
    title,
    className,
    tokens,
    onSelectToken,
    copiedAddresses,
    onCopy,
    chain,
  }) => {
    if (tokens.length === 0) return null;

    return (
      <div>
        <div className={`px-4 pb-2 text-sm text-[#FAFAFA55] ${className}`}>
          {title}
        </div>
        <div>
          {tokens.map((token) => (
            <TokenListItem
              key={`${token.id}-${token.stringChainId}-${token.address}`}
              token={token}
              onSelect={onSelectToken}
              copiedAddresses={copiedAddresses}
              onCopy={onCopy}
              chain={chain}
            />
          ))}
        </div>
      </div>
    );
  },
);

TokenListSection.displayName = "TokenListSection";

const VirtualizedTokenList: React.FC<{
  walletTokens: Token[];
  allTokens: Token[];
  onSelectToken: (token: Token) => void;
  copiedAddresses: Record<string, boolean>;
  onCopy: (text: string, tokenId: string) => void;
  chain: Chain;
  searchQuery: string;
  isSearchingMetadata?: boolean;
}> = React.memo(
  ({
    walletTokens,
    allTokens,
    onSelectToken,
    copiedAddresses,
    onCopy,
    chain,
    searchQuery,
  }) => {
    const { processedWalletTokens, processedAllTokens } = useMemo(() => {
      // Find native gas token addresses to avoid duplicates
      const nativeGasToken = allTokens.find(
        (token) => token.isNativeGas === true,
      );
      const nativeGasAddress = nativeGasToken?.address || "";

      // Keep track of whether we've already included native tokens
      let hasAddedNativeGas = false;
      let hasAddedNativeWrapped = false;
      let hasAddedL2Token = false;

      // Filter out duplicate native tokens - keep only one of each type
      const filterNonDuplicates = (tokens: Token[]) =>
        tokens.filter((token) => {
          // If this is a native gas token
          if (token.isNativeGas === true) {
            if (!hasAddedNativeGas) {
              hasAddedNativeGas = true;
              return true;
            }
            return false;
          }

          // If this is a native wrapped token
          if (token.isNativeWrapped === true) {
            if (!hasAddedNativeWrapped) {
              hasAddedNativeWrapped = true;
              return true;
            }
            return false;
          }

          // If this is an L2 token
          if (token.isL2Token === true) {
            if (!hasAddedL2Token) {
              hasAddedL2Token = true;
              return true;
            }
            return false;
          }

          // Regular tokens - avoid duplicates with native gas
          return (
            token.address !== "0x0000000000000000000000000000000000000000" &&
            token.address.toUpperCase() !== nativeGasAddress.toUpperCase()
          );
        });

      // Reset flags before processing each list
      const processWalletTokens = () => {
        hasAddedNativeGas = false;
        hasAddedNativeWrapped = false;
        hasAddedL2Token = false;
        return filterNonDuplicates(walletTokens);
      };

      const processAllTokens = () => {
        hasAddedNativeGas = false;
        hasAddedNativeWrapped = false;
        hasAddedL2Token = false;
        return filterNonDuplicates(allTokens);
      };

      // Sort function to place native gas, wrapped, and L2 tokens first
      const sortWithNativeFirst = (tokens: Token[]) => {
        return [...tokens].sort((a, b) => {
          // Native gas tokens come first
          if (a.isNativeGas && !b.isNativeGas) return -1;
          if (!a.isNativeGas && b.isNativeGas) return 1;

          // Native wrapped tokens come second
          if (a.isNativeWrapped && !b.isNativeWrapped) return -1;
          if (!a.isNativeWrapped && b.isNativeWrapped) return 1;

          // L2 tokens come third
          if (a.isL2Token && !b.isL2Token) return -1;
          if (!a.isL2Token && b.isL2Token) return 1;

          return 0;
        });
      };

      const processedWalletTokens = processWalletTokens();
      const processedAllTokens = sortWithNativeFirst(processAllTokens());

      return { processedWalletTokens, processedAllTokens };
    }, [walletTokens, allTokens]);

    // Apply search filtering on the processed token lists
    const filteredWalletTokens = useMemo(() => {
      const query = searchQuery.toLowerCase();
      if (!query) return processedWalletTokens;
      return processedWalletTokens.filter(
        (token) =>
          token.name.toLowerCase().includes(query) ||
          token.ticker.toLowerCase().includes(query) ||
          token.address.toLowerCase().includes(query),
      );
    }, [processedWalletTokens, searchQuery]);

    const filteredAllTokens = useMemo(() => {
      const query = searchQuery.toLowerCase();
      if (!query) return processedAllTokens;
      return processedAllTokens.filter(
        (token) =>
          token.name.toLowerCase().includes(query) ||
          token.ticker.toLowerCase().includes(query) ||
          token.address.toLowerCase().includes(query),
      );
    }, [processedAllTokens, searchQuery]);

    if (filteredWalletTokens.length === 0 && filteredAllTokens.length === 0) {
      return (
        <div className="p-4 text-center text-[#FAFAFA55]">
          {searchQuery
            ? `No tokens found matching "${searchQuery}"`
            : `No tokens available for ${chain.name}`}
        </div>
      );
    }

    return (
      <>
        {/* Wallet tokens section */}
        <TokenListSection
          title="your wallet"
          className="pt-0"
          tokens={filteredWalletTokens}
          onSelectToken={onSelectToken}
          copiedAddresses={copiedAddresses}
          onCopy={onCopy}
          chain={chain}
        />
        {/* All tokens section */}
        <TokenListSection
          title="all tokens"
          className={filteredWalletTokens.length > 0 ? "pt-3" : "pt-0"}
          tokens={filteredAllTokens}
          onSelectToken={onSelectToken}
          copiedAddresses={copiedAddresses}
          onCopy={onCopy}
          chain={chain}
        />
      </>
    );
  },
);

VirtualizedTokenList.displayName = "VirtualizedTokenList";

interface SelectTokenButtonProps {
  variant: "source" | "destination";
  onTokenSelect?: (token: Token) => void;
  selectedToken?: Token;
}

export const SelectTokenButton: React.FC<SelectTokenButtonProps> = ({
  variant,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 150);
  const [copiedAddresses, setCopiedAddresses] = useState<
    Record<string, boolean>
  >({});
  const [isTokenListReady, setTokenListReady] = useState(false);
  const tokensPreloadedRef = useRef(false);
  const [userIntentToOpen, setUserIntentToOpen] = useState(false);
  const [chainTokens, setChainTokens] = useState([] as Token[]);
  const [isSearchingMetadata, setIsSearchingMetadata] = useState(false);

  const tokensLoading = useWeb3Store((state) => state.tokensLoading);
  const sourceChain = useSourceChain();
  const destinationChain = useDestinationChain();
  const sourceToken = useSourceToken();
  const destinationToken = useDestinationToken();
  const addCustomToken = useWeb3Store((state) => state.addCustomToken);
  const sourceIsOpen = useUIStore((state) => state.sourceTokenSelectOpen);
  const destinationIsOpen = useUIStore(
    (state) => state.destinationTokenSelectOpen,
  );
  const setSourceIsOpen = useUIStore((state) => state.setSourceTokenSelectOpen);
  const setDestinationIsOpen = useUIStore(
    (state) => state.setDestinationTokenSelectOpen,
  );
  const chainToShow = variant === "source" ? sourceChain : destinationChain;

  const isOpen = variant === "source" ? sourceIsOpen : destinationIsOpen;
  const setIsOpen =
    variant === "source" ? setSourceIsOpen : setDestinationIsOpen;

  const selectedToken = variant === "source" ? sourceToken : destinationToken;

  const setSourceToken = useWeb3Store((state) => state.setSourceToken);
  const setDestinationToken = useWeb3Store(
    (state) => state.setDestinationToken,
  );
  const loadTokens = useWeb3Store((state) => state.loadTokens);
  const getTokensForChain = useWeb3Store((state) => state.getTokensForChain);
  const tokenCount = useWeb3Store((state) => state.allTokensList.length);

  const lookedUpAddresses = useRef<Set<string>>(new Set());

  const isValidEthereumAddress = useCallback((address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/i.test(address);
  }, []);

  const lookupTokenByAddress = useCallback(
    async (address: string) => {
      const normalizedAddress = address.toLowerCase();

      if (!isValidEthereumAddress(normalizedAddress)) return;

      const lookupKey = `${chainToShow.chainId}-${normalizedAddress}`;
      if (lookedUpAddresses.current.has(lookupKey)) return;

      lookedUpAddresses.current.add(lookupKey);

      setIsSearchingMetadata(true);
      try {
        const metadata = await getTokenMetadata(
          chainToShow.chainId,
          normalizedAddress,
        );
        if (metadata && metadata.name) {
          const newToken: Token = {
            id: `custom-${chainToShow.chainId}-${normalizedAddress}`,
            chainId: chainToShow.chainId,
            stringChainId: chainToShow.id,
            name: metadata.name,
            ticker: metadata.symbol || "???",
            address: normalizedAddress,
            decimals: metadata.decimals || 18,
            icon: "unknown.png",
            isWalletToken: false,
            customToken: true,
          };

          addCustomToken(newToken);
        } else {
          console.error(
            "Invalid or missing metadata for address:",
            normalizedAddress,
          );
        }
      } catch (error) {
        console.error("Error looking up token metadata:", error);
      } finally {
        setIsSearchingMetadata(false);
      }
    },
    [chainToShow, isValidEthereumAddress, addCustomToken],
  );

  useEffect(() => {
    if (tokenCount === 0 && !tokensLoading && !tokensPreloadedRef.current) {
      tokensPreloadedRef.current = true;
      loadTokens();
    }
  }, [loadTokens, tokensLoading, tokenCount]);

  useEffect(() => {
    if (userIntentToOpen && tokenCount === 0 && !tokensLoading) {
      loadTokens();
    }
  }, [userIntentToOpen, loadTokens, tokensLoading, tokenCount]);

  useEffect(() => {
    let timerId: NodeJS.Timeout | undefined;

    if (!isOpen) {
      timerId = setTimeout(() => {
        setTokenListReady(false);
      }, 200);
    }
    return () => {
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && !isTokenListReady) {
      requestAnimationFrame(() => {
        const timer = setTimeout(() => {
          setTokenListReady(true);
        }, 100);
        return () => clearTimeout(timer);
      });
    }
  }, [isOpen, isTokenListReady]);

  useEffect(() => {
    setChainTokens(getTokensForChain(chainToShow.chainId));
    lookedUpAddresses.current.clear();
  }, [getTokensForChain, chainToShow, tokensLoading, isOpen, tokenCount]);

  const walletTokens = useMemo(() => {
    return chainTokens.filter((token) => token.isWalletToken);
  }, [chainTokens]);

  const allTokens = useMemo(() => {
    return chainTokens.filter((token) => !token.isWalletToken);
  }, [chainTokens]);

  const copyToClipboard = useCallback((text: string, tokenId: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAddresses((prev) => ({ ...prev, [tokenId]: true }));

      setTimeout(() => {
        setCopiedAddresses((prev) => ({ ...prev, [tokenId]: false }));
      }, 2000);
    });
  }, []);

  useEffect(() => {
    if (
      debouncedSearchQuery &&
      isValidEthereumAddress(debouncedSearchQuery) &&
      !isSearchingMetadata &&
      walletTokens.filter(
        (t) => t.address.toLowerCase() === debouncedSearchQuery.toLowerCase(),
      ).length === 0 &&
      allTokens.filter(
        (t) => t.address.toLowerCase() === debouncedSearchQuery.toLowerCase(),
      ).length === 0
    ) {
      lookupTokenByAddress(debouncedSearchQuery);
    }
  }, [
    debouncedSearchQuery,
    walletTokens,
    allTokens,
    isSearchingMetadata,
    isValidEthereumAddress,
    lookupTokenByAddress,
  ]);

  const handleSelectToken = useCallback(
    (token: Token) => {
      if (variant === "source") {
        setSourceToken(token);
      } else {
        setDestinationToken(token);
      }

      setIsOpen(false);
    },
    [variant, setSourceToken, setDestinationToken, setIsOpen],
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    [],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      if (open) {
        setSearchQuery("");
        setChainTokens(getTokensForChain(chainToShow.chainId));
        lookedUpAddresses.current.clear();
      }
    },
    [getTokensForChain, chainToShow.chainId, setIsOpen],
  );

  const handleMouseEnter = useCallback(() => {
    setUserIntentToOpen(true);
  }, []);

  const buttonContent = useMemo(() => {
    if (!selectedToken) {
      return <span className="truncate">select token</span>;
    }

    return (
      <div className="flex items-center gap-2 flex-1 mr-1">
        <div className="w-5 h-5 relative flex-shrink-0">
          <TokenImage token={selectedToken} chain={chainToShow} size="sm" />
        </div>
        <div className="flex flex-col items-start justify-center leading-none min-w-0 w-full">
          <span className="truncate text-[#FAFAFA] text-[16px] w-full text-left">
            {selectedToken.ticker}
          </span>
          <span className="text-[9px] text-[#FAFAFA98] mt-[2px] w-full text-left">
            {chainToShow.name}
          </span>
        </div>
      </div>
    );
  }, [selectedToken, chainToShow]);

  const baseClasses =
    "min-w-[100px] sm:min-w-[110px] md:min-w-[120px] flex items-center justify-between gap-2 px-2 rounded-[6px] text-[1rem] font-medium whitespace-nowrap h-[2rem] sm:h-[2.25rem]";

  const variantClasses: Record<SelectTokenButtonProps["variant"], string> = {
    source:
      "bg-amber-500/25 text-amber-500 hover:bg-amber-500/40 hover:text-amber-400 border-amber-500/15 border-[1px] text-sm sm:text-base",
    destination:
      "bg-[#0EA5E9]/10 text-sky-500 hover:bg-[#0b466b] hover:text-sky-400 border-[#0EA5E9]/25 border-[1px] text-sm sm:text-base",
  };

  const selectedTokenClass =
    "bg-[#27272A] text-[#FAFAFA] hover:bg-[#323232] border-0 text-sm sm:text-base";

  const buttonClass = selectedToken
    ? `${baseClasses} ${selectedTokenClass}`
    : `${baseClasses} ${variantClasses[variant]}`;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          className={`${buttonClass} ${selectedToken ? "py-[3px]" : "py-2"}`}
          onMouseEnter={handleMouseEnter}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
        >
          {buttonContent}
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 flex-shrink-0"
          >
            <path
              d="M5 7.5L10 12.5L15 7.5"
              stroke={selectedToken ? "#A1A1A1" : "currentColor"}
              strokeWidth="1.66667"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-[480px] p-0 pb-4 bg-[#18181B] border-[#1C1C1E] rounded-[6px] overflow-hidden max-w-[calc(100%-60px)]"
        showCloseButton={false}
      >
        <div className="px-4 pt-4 flex justify-between items-center">
          <DialogTitle className="sm:text-lg text-md font-medium text-[#FAFAFA]">
            token select
          </DialogTitle>
          <StyledDialogClose className="bg-[#442E0B] rounded-[3px] border-[#61410B] border-[0.5px]">
            <X className="h-4 w-4 text-amber-500" />
            <span className="sr-only">Close</span>
          </StyledDialogClose>
        </div>

        {/* Search input */}
        <div className="px-4 pt-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-[#FAFAFA20]" />
            </div>
            <input
              type="text"
              placeholder="search token or paste address"
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full h-[38px] bg-[#27272A] text-[#FAFAFA] placeholder-[#FAFAFA20] pl-10 pr-12 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-amber-500 sm:text-lg text-base"
              style={{ fontSize: "16px" }}
            />
            <div className="absolute inset-y-0 right-1 flex items-center">
              <SelectChainButton storeType={variant} style="compact" />
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="max-h-[420px] overflow-y-auto scrollbar-thin px-2">
          {/* Skeleton while the actual tokens are being prepared */}
          {allTokens.length === 0 && <SkeletonTokenList itemCount={8} />}

          {/* Actual token list - only shown when ready */}
          {tokenCount > 0 && (
            <VirtualizedTokenList
              walletTokens={walletTokens}
              allTokens={allTokens}
              onSelectToken={handleSelectToken}
              copiedAddresses={copiedAddresses}
              onCopy={copyToClipboard}
              chain={chainToShow}
              searchQuery={debouncedSearchQuery}
              isSearchingMetadata={isSearchingMetadata}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SelectTokenButton;
