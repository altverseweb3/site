import { useState, useEffect, useRef, useCallback } from "react";
import {
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Edit2,
  Check,
} from "lucide-react";
import {
  useTransactionDetails,
  useSetSlippageValue,
  useSetReceiveAddress,
  useDestinationChain,
} from "@/store/web3Store";
import { WalletType } from "@/types/web3";
import { GasDrop } from "@/components/ui/GasDrop";
import ConnectWalletButton from "@/components/ui/ConnectWalletButton";
import { useDestinationWallet } from "@/hooks/dynamic/useUserWallets";
import { useWalletByType } from "@/hooks/dynamic/useUserWallets";
interface TransactionDetailsProps {
  protocolFeeUsd?: number;
  relayerFeeUsd?: number;
  totalFeeUsd?: number;
  estimatedTime?: string | number | null; // Allow number for seconds or null
  className?: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

export function TransactionDetails({
  estimatedTime = "~",
  isOpen,
  onToggle,
}: TransactionDetailsProps) {
  // ─── Zustand store hooks ─────────────────────────────────────────────────────
  const transactionDetails = useTransactionDetails();
  const setSlippageValue = useSetSlippageValue();
  const setReceiveAddress = useSetReceiveAddress();
  const destinationChain = useDestinationChain();
  const requiredWallet = useDestinationWallet();
  const destinationChainWallet = useWalletByType(destinationChain?.walletType);

  // ─── Local state ─────────────────────────────────────────────────────────────
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(isOpen || false);
  const [slippageMode, setSlippageMode] = useState<"auto" | "custom">("auto");
  const [customSlippage, setCustomSlippage] = useState<string>("");
  const [slippageError, setSlippageError] = useState<string | null>(null);
  const [isEditingReceiveAddress, setIsEditingReceiveAddress] = useState(false);
  const [receiveAddressInput, setReceiveAddressInput] = useState("");
  const [addressError, setAddressError] = useState<string | null>(null);
  const [inputFontSize, setInputFontSize] = useState<number>(12);

  // Ref for click‐outside on receive address input
  const receiveAddressInputRef = useRef<HTMLInputElement>(null);

  // ─── Constants ───────────────────────────────────────────────────────────────
  const MAX_SLIPPAGE = 10;
  const DEFAULT_AUTO_SLIPPAGE = "auto";
  const DEFAULT_CUSTOM_SLIPPAGE = "3.00%";

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Generate placeholder text based on wallet type
   */
  const getPlaceholderText = useCallback((walletType?: WalletType): string => {
    switch (walletType) {
      case WalletType.EVM:
        return "Connect Ethereum wallet";
      case WalletType.SOLANA:
        return "Connect Solana wallet";
      case WalletType.SUI:
        return "Connect Sui wallet";
      default:
        return "Connect wallet";
    }
  }, []);

  /**
   * Truncate address based on wallet type, but don't truncate placeholder text
   */
  const truncateAddress = useCallback(
    (address: string, walletType?: WalletType): string => {
      if (!address || !walletType) return address;

      // Don't truncate placeholder text
      const placeholder = getPlaceholderText(walletType);
      if (address === placeholder) return address;

      switch (walletType) {
        case WalletType.EVM:
        case WalletType.SUI:
          // EVM and Sui addresses: 0x + first 4 + ... + last 4
          if (address.length <= 10) return address;
          return `${address.slice(0, 6)}...${address.slice(-4)}`;
        case WalletType.SOLANA:
          // Solana addresses: first 4 + ... + last 4
          if (address.length <= 8) return address;
          return `${address.slice(0, 4)}...${address.slice(-4)}`;
        default:
          return address;
      }
    },
    [getPlaceholderText],
  );

  /**
   * Calculate dynamic font size for input based on text length
   */
  const calculateDynamicFontSize = useCallback(
    (text: string, containerWidth: number): number => {
      // Base font sizes for different screen sizes
      const baseFontSize = window.innerWidth >= 640 ? 12 : 9; // sm:text-xs vs text-[9px]
      const minFontSize = 6;

      if (!text || containerWidth <= 0) return baseFontSize;

      // Approximate character width multiplier (monospace font)
      const charWidthMultiplier = 0.6;
      const estimatedTextWidth =
        text.length * baseFontSize * charWidthMultiplier;

      if (estimatedTextWidth <= containerWidth) {
        return baseFontSize;
      }

      // Calculate reduced font size to fit
      const scaleFactor = containerWidth / estimatedTextWidth;
      const newFontSize = Math.max(minFontSize, baseFontSize * scaleFactor);

      return Math.floor(newFontSize);
    },
    [],
  );

  /**
   * Update input font size based on current text
   */
  const updateInputFontSize = useCallback(() => {
    if (receiveAddressInputRef.current && isEditingReceiveAddress) {
      const containerWidth = receiveAddressInputRef.current.offsetWidth;
      const newFontSize = calculateDynamicFontSize(
        receiveAddressInput,
        containerWidth,
      );
      setInputFontSize(newFontSize);
    }
  }, [receiveAddressInput, isEditingReceiveAddress, calculateDynamicFontSize]);

  /**
   * Check if the address is valid for the given wallet type
   */
  const validateAddressForWalletType = useCallback(
    (address: string, walletType?: WalletType): boolean => {
      if (!address || !walletType) return false;

      // Check for Ethereum address (starts with 0x followed by 40 hex chars)
      const isEthereumAddress = /^0x[a-fA-F0-9]{40}$/.test(address);

      // Check for Solana address (Base58 encoded, typically 32-44 chars)
      const isSolanaAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);

      // Check for Sui address (starts with 0x followed by 64 hex chars)
      const isSuiAddress = /^0x[a-fA-F0-9]{64}$/.test(address);

      switch (walletType) {
        case WalletType.EVM:
          return isEthereumAddress;
        case WalletType.SOLANA:
          return isSolanaAddress;
        case WalletType.SUI:
          return isSuiAddress;
        default:
          return false;
      }
    },
    [],
  );

  /**
   * Format a slippage string (e.g. "3" or "3.0" or "3.00")
   * into "3.00%". If NaN, return DEFAULT_AUTO_SLIPPAGE.
   */
  const formatSlippageValue = (value: string): string => {
    const numeric = parseFloat(value.replace("%", ""));
    if (isNaN(numeric)) return DEFAULT_AUTO_SLIPPAGE;
    return `${numeric.toFixed(2)}%`;
  };

  /**
   * Get error message for address validation
   */
  const getAddressErrorMessage = (
    address: string,
    walletType?: WalletType,
  ): string | null => {
    if (!address) return "Address is required";
    if (!walletType) return "Invalid wallet type";

    switch (walletType) {
      case WalletType.EVM:
        return /^0x[a-fA-F0-9]{40}$/.test(address)
          ? null
          : "Invalid Ethereum address format";
      case WalletType.SOLANA:
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)
          ? null
          : "Invalid Solana address format";
      case WalletType.SUI:
        return /^0x[a-fA-F0-9]{64}$/.test(address)
          ? null
          : "Invalid Sui address format";
      default:
        return "Unsupported wallet type";
    }
  };

  /**
   * Save the receiveAddressInput into the store if valid,
   * otherwise keep the error state.
   */
  const saveReceiveAddress = useCallback(() => {
    const walletType = destinationChain?.walletType;
    const error = getAddressErrorMessage(receiveAddressInput, walletType);

    if (!error) {
      setReceiveAddress(receiveAddressInput);
      setAddressError(null);
    } else {
      setAddressError(error);
    }

    setIsEditingReceiveAddress(false);
  }, [receiveAddressInput, destinationChain?.walletType, setReceiveAddress]);

  /**
   * Update the receive address based on destination chain wallet type
   */
  const updateReceiveAddressForChain = useCallback(() => {
    if (!destinationChain?.walletType) return;

    // Try to get a wallet of the needed type
    if (destinationChainWallet) {
      // We have a matching wallet, use its address
      setReceiveAddressInput(destinationChainWallet.address);
      setReceiveAddress(destinationChainWallet.address);
      setAddressError(null);
    } else {
      // No matching wallet, clear the address or keep existing if valid
      const currentAddress = transactionDetails.receiveAddress || "";
      const error = getAddressErrorMessage(
        currentAddress,
        destinationChain.walletType,
      );

      if (error) {
        // Current address is invalid for new chain, clear it
        setReceiveAddressInput("");
        setReceiveAddress(null);
      }
    }
  }, [
    destinationChain?.walletType,
    setReceiveAddress,
    destinationChainWallet,
    transactionDetails.receiveAddress,
  ]);

  // ─── Effects ────────────────────────────────────────────────────────────────

  // Initialize slippage + receive address on mount
  useEffect(() => {
    const storeSlippage = transactionDetails.slippage;
    if (storeSlippage === "auto" || !storeSlippage) {
      setSlippageMode("auto");
      if (storeSlippage !== "auto") {
        setSlippageValue("auto");
      }
    } else {
      setSlippageMode("custom");
      setCustomSlippage(storeSlippage.replace("%", ""));
    }

    if (transactionDetails.receiveAddress) {
      setReceiveAddressInput(transactionDetails.receiveAddress);
    } else if (requiredWallet) {
      setReceiveAddressInput(requiredWallet.address);
    }

    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update receive address when destination chain changes
  useEffect(() => {
    updateReceiveAddressForChain();
  }, [destinationChain, updateReceiveAddressForChain]);

  // Update when new wallets are connected
  useEffect(() => {
    if (destinationChain?.walletType) {
      if (
        destinationChainWallet &&
        (!transactionDetails.receiveAddress ||
          !validateAddressForWalletType(
            transactionDetails.receiveAddress,
            destinationChain.walletType,
          ))
      ) {
        // Update to the new wallet address if we don't have a valid address already
        setReceiveAddressInput(destinationChainWallet.address);
        setReceiveAddress(destinationChainWallet.address);
        setAddressError(null);
      }
    }
  }, [
    destinationChain?.walletType,
    destinationChainWallet,
    setReceiveAddress,
    transactionDetails.receiveAddress,
    validateAddressForWalletType,
  ]);

  // Validate current address when editing stops
  useEffect(() => {
    if (!isEditingReceiveAddress && receiveAddressInput) {
      const error = getAddressErrorMessage(
        receiveAddressInput,
        destinationChain?.walletType,
      );
      setAddressError(error);
    }
  }, [
    isEditingReceiveAddress,
    receiveAddressInput,
    destinationChain?.walletType,
  ]);

  // Update font size when input text changes or editing starts
  useEffect(() => {
    if (isEditingReceiveAddress) {
      // Small delay to ensure DOM has updated
      const timer = setTimeout(updateInputFontSize, 10);
      return () => clearTimeout(timer);
    }
  }, [receiveAddressInput, isEditingReceiveAddress, updateInputFontSize]);

  // Update font size on window resize
  useEffect(() => {
    const handleResize = () => {
      if (isEditingReceiveAddress) {
        updateInputFontSize();
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isEditingReceiveAddress, updateInputFontSize]);

  // Click‐outside handler for receive address input
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        receiveAddressInputRef.current &&
        !receiveAddressInputRef.current.contains(event.target as Node) &&
        isEditingReceiveAddress
      ) {
        saveReceiveAddress();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditingReceiveAddress, saveReceiveAddress]);

  // Sync external isOpen prop
  useEffect(() => {
    if (isOpen !== undefined) {
      setIsDetailsExpanded(isOpen);
    }
  }, [isOpen]);

  // ─── Event handlers ─────────────────────────────────────────────────────────

  const toggleDetails = () => {
    setIsDetailsExpanded((prev) => !prev);
    onToggle?.();
  };

  /**
   * Format estimatedTime (number in seconds or a string).
   */
  const formatEstimatedTime = (time?: string | number | null): string => {
    if (time === null || time === undefined) return "~";
    if (typeof time === "string" && isNaN(Number(time))) {
      return time;
    }
    const seconds = typeof time === "string" ? parseInt(time, 10) : time;
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      return `${Math.round(seconds / 60)}m`;
    } else {
      const hours = Math.round((seconds / 3600) * 10) / 10;
      return `${hours}h`;
    }
  };

  const handleSlippageModeChange = (mode: "auto" | "custom") => {
    setSlippageMode(mode);
    setSlippageError(null);

    if (mode === "auto") {
      setSlippageValue(DEFAULT_AUTO_SLIPPAGE);
    } else {
      if (customSlippage && !isNaN(parseFloat(customSlippage))) {
        const n = parseFloat(customSlippage);
        if (n > 0 && n <= MAX_SLIPPAGE) {
          setSlippageValue(formatSlippageValue(customSlippage));
        } else {
          setCustomSlippage(DEFAULT_CUSTOM_SLIPPAGE.replace("%", ""));
          setSlippageValue(DEFAULT_CUSTOM_SLIPPAGE);
        }
      } else {
        setCustomSlippage(DEFAULT_CUSTOM_SLIPPAGE.replace("%", ""));
        setSlippageValue(DEFAULT_CUSTOM_SLIPPAGE);
      }
    }
  };

  const handleCustomSlippageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const v = e.target.value;
    if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) {
      setCustomSlippage(v);
      const n = parseFloat(v);
      if (v && !isNaN(n)) {
        if (n > MAX_SLIPPAGE) {
          setSlippageError(`Maximum slippage is ${MAX_SLIPPAGE}%`);
        } else if (n <= 0) {
          setSlippageError("Slippage must be greater than 0%");
        } else {
          setSlippageError(null);
        }
      } else {
        setSlippageError(null);
      }
    }
  };

  const handleCustomSlippageBlur = () => {
    if (customSlippage && !slippageError) {
      const n = parseFloat(customSlippage);
      if (!isNaN(n) && n > 0 && n <= MAX_SLIPPAGE) {
        setSlippageValue(formatSlippageValue(customSlippage));
      }
    } else if (customSlippage === "") {
      handleSlippageModeChange("auto");
    }
  };
  // Determine what to show as the current receiving address
  const receivingAddress =
    transactionDetails.receiveAddress ||
    requiredWallet?.address ||
    getPlaceholderText(destinationChain?.walletType);

  // Get truncated address for display
  const displayAddress = truncateAddress(
    receivingAddress,
    destinationChain?.walletType,
  );
  const isShowingPlaceholder =
    receivingAddress === getPlaceholderText(destinationChain?.walletType);
  const startEditingReceiveAddress = useCallback(() => {
    // If we're showing placeholder text, start with empty input
    if (isShowingPlaceholder) {
      setReceiveAddressInput("");
    }
    setIsEditingReceiveAddress(true);
  }, [isShowingPlaceholder]);

  const handleReceiveAddressChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setReceiveAddressInput(e.target.value);
    // Clear error while typing
    setAddressError(null);
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="mt-2 text-white border-zinc-900 border-[1px] rounded-[3px] px-2">
      {/* Summary Row */}
      <div
        className="flex items-center justify-between cursor-pointer py-2 numeric-input text-zinc-400 sm:text-[12px] text-[9px]"
        onClick={toggleDetails}
      >
        <div className="text-left">
          {!isDetailsExpanded ? "expand for details" : "transaction details"}
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <Clock size={14} />
            <span>{formatEstimatedTime(estimatedTime)}</span>
          </div>
          {isDetailsExpanded ? (
            <ChevronUp size={16} />
          ) : (
            <ChevronDown size={16} />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isDetailsExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="py-2">
          <div className="grid grid-cols-2 gap-y-2 text-[12px]">
            {/* Slippage Row */}
            <div className="text-left text-zinc-400">slippage</div>
            <div className="text-right flex items-center justify-end">
              <div className="flex space-x-1 mr-2">
                <button
                  className={`px-2 py-0.5 rounded-[3px] sm:text-xs text-[9px] border ${
                    slippageMode === "auto"
                      ? "bg-[#F59E0B25] text-[#F59E0B] border-[#61410B]"
                      : "bg-[#27272A75] text-[#FAFAFA50] border-[#27272A]"
                  }`}
                  onClick={() => handleSlippageModeChange("auto")}
                >
                  auto
                </button>
                <button
                  className={`px-2 py-0.5 rounded-[3px] sm:text-xs text-[9px] border ${
                    slippageMode === "custom"
                      ? "bg-[#F59E0B25] text-[#F59E0B] border-[#61410B]"
                      : "bg-[#27272A75] text-[#FAFAFA50] border-[#27272A]"
                  }`}
                  onClick={() => handleSlippageModeChange("custom")}
                >
                  custom %
                </button>
              </div>
              <div className="numeric-input text-zinc-200 min-w-[60px] text-right">
                {slippageMode === "auto" ? (
                  <div className="text-amber-500">auto</div>
                ) : (
                  <div className="flex items-center justify-end">
                    <input
                      type="text"
                      value={customSlippage}
                      onChange={handleCustomSlippageChange}
                      onBlur={handleCustomSlippageBlur}
                      className={`bg-transparent text-right w-10 px-0 outline-none ${
                        slippageError ? "text-red-500" : "text-zinc-200"
                      }`}
                      placeholder="0.00"
                      autoFocus
                    />
                    <span className="ml-0.5">%</span>
                    {slippageError && (
                      <div className="relative group ml-1">
                        <AlertCircle size={14} className="text-red-500" />
                        <div className="absolute top-full mt-1 right-0 bg-zinc-800 text-red-400 text-xs p-1 rounded-md w-48 hidden group-hover:block z-10">
                          {slippageError}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Receiving Address Block */}
          <div className="mt-2">
            <div className="flex items-center justify-between">
              <div className="text-left text-amber-500 text-[12px] whitespace-nowrap flex-shrink-0 min-w-[85px]">
                receiving addr.
              </div>

              {isEditingReceiveAddress ? (
                <div className="flex items-center w-full ml-4">
                  <button
                    className="ml-2 text-amber-500 hover:text-amber-400 flex-shrink-0"
                    onClick={saveReceiveAddress}
                  >
                    <Check size={14} />
                  </button>
                  <input
                    ref={receiveAddressInputRef}
                    type="text"
                    value={receiveAddressInput}
                    onChange={handleReceiveAddressChange}
                    className={`numeric-input bg-transparent text-right text-zinc-200 w-full outline-none font-mono ${
                      addressError ? "text-red-500" : ""
                    }`}
                    style={{ fontSize: `${inputFontSize}px` }}
                    autoFocus
                  />
                </div>
              ) : (
                <div className="flex items-center w-full">
                  <span className="flex-grow" />
                  <button
                    className="text-amber-500 hover:text-amber-400 flex-shrink-0 mr-[5px]"
                    onClick={startEditingReceiveAddress}
                  >
                    <Edit2 size={14} />
                  </button>
                  <span
                    className={`sm:text-xs text-[9px] font-mono text-right flex-shrink-0 ${
                      addressError
                        ? "text-red-500"
                        : isShowingPlaceholder
                          ? "text-zinc-500 italic"
                          : "text-zinc-200"
                    }`}
                  >
                    {displayAddress}
                  </span>
                  {addressError && (
                    <div className="relative group ml-1 flex-shrink-0">
                      <AlertCircle size={14} className="text-red-500" />
                      <div className="absolute top-full mt-1 right-0 bg-zinc-800 text-red-400 text-xs p-1 rounded-md w-48 hidden group-hover:block z-10">
                        {addressError}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Align the button to the right */}
            {!requiredWallet && (
              <div className="flex justify-end mt-2">
                <ConnectWalletButton
                  className="w-auto"
                  walletType={destinationChain?.walletType}
                  size="sm"
                />
              </div>
            )}
          </div>

          {/* ─── Gas Drop ─────────────────────────── */}

          <GasDrop
            className="mt-2"
            maxGasDrop={destinationChain?.gasDrop || 0}
            symbol={destinationChain?.nativeGasToken.symbol}
            initialEnabled={false}
            initialValue={50}
          />
        </div>
      </div>
    </div>
  );
}
