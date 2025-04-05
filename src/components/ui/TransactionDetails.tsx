import { useState, useEffect, useRef, useCallback } from "react";
import {
  Fuel,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Edit2,
  Check,
} from "lucide-react";
import useWeb3Store, {
  useTransactionDetails,
  useSetSlippageValue,
  useSetReceiveAddress,
} from "@/store/web3Store";

interface TransactionDetailsProps {
  exchangeRate?: string;
  exchangeValue?: string;
  gasFee?: string;
  estimatedTime?: string | number | null; // Allow number for seconds or null
  className?: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

export function TransactionDetails({
  exchangeRate = "1 USDC = 0.000362352 ETH",
  exchangeValue = "$1.00",
  gasFee = "<$0.01",
  estimatedTime = "~",
  isOpen,
  onToggle,
}: TransactionDetailsProps) {
  // Get values from zustand store
  const activeWallet = useWeb3Store((state) => state.activeWallet);
  const transactionDetails = useTransactionDetails();
  const setSlippageValue = useSetSlippageValue();
  const setReceiveAddress = useSetReceiveAddress();

  // Local state
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(isOpen || false);
  const [slippageMode, setSlippageMode] = useState<"auto" | "custom">("auto");
  const [customSlippage, setCustomSlippage] = useState<string>("");
  const [slippageError, setSlippageError] = useState<string | null>(null);
  const [isEditingReceiveAddress, setIsEditingReceiveAddress] = useState(false);
  const [receiveAddressInput, setReceiveAddressInput] = useState("");

  const MAX_SLIPPAGE = 10;

  // Default values
  const DEFAULT_AUTO_SLIPPAGE = "auto";
  const DEFAULT_CUSTOM_SLIPPAGE = "3.00%";

  // Ref for address input to handle click outside
  const receiveAddressInputRef = useRef<HTMLInputElement>(null);

  // Format slippage value to ensure consistent format (always 2 decimal places with % sign)
  const formatSlippageValue = (value: string): string => {
    // Remove any % symbol first
    const numericValue = parseFloat(value.replace("%", ""));

    if (isNaN(numericValue)) return DEFAULT_AUTO_SLIPPAGE;

    // Format to 2 decimal places and add % symbol
    return `${numericValue.toFixed(2)}%`;
  };

  // Wrap saveReceiveAddress in useCallback to prevent recreating on every render
  const saveReceiveAddress = useCallback(() => {
    if (
      receiveAddressInput &&
      /^0x[a-fA-F0-9]{40}$/.test(receiveAddressInput)
    ) {
      setReceiveAddress(receiveAddressInput);
    } else if (!receiveAddressInput && activeWallet) {
      // If input is empty, revert to active wallet address
      setReceiveAddressInput(activeWallet.address);
    }
    setIsEditingReceiveAddress(false);
  }, [receiveAddressInput, activeWallet, setReceiveAddress]);

  // Initialize values from store - only run once on component mount
  useEffect(
    () => {
      // Set initial slippage mode based on store value
      const storeSlippage = transactionDetails.slippage;

      if (storeSlippage === "auto" || !storeSlippage) {
        // If auto or missing, set mode to auto
        setSlippageMode("auto");
        // Ensure store has the auto value
        if (storeSlippage !== "auto") {
          setSlippageValue("auto");
        }
      } else {
        // If anything else, set mode to custom
        setSlippageMode("custom");
        setCustomSlippage(storeSlippage.replace("%", ""));
      }

      // Set initial receive address
      if (transactionDetails.receiveAddress) {
        setReceiveAddressInput(transactionDetails.receiveAddress);
      } else if (activeWallet) {
        setReceiveAddressInput(activeWallet.address);
      }
    },
    [
      /* empty dependency array to run only once */
    ],
  );

  // Handle click outside for receive address editing
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

  // Update local state when prop changes
  useEffect(() => {
    if (isOpen !== undefined) {
      setIsDetailsExpanded(isOpen);
    }
  }, [isOpen]);

  const toggleDetails = () => {
    const newState = !isDetailsExpanded;
    setIsDetailsExpanded(newState);
    if (onToggle) {
      onToggle();
    }
  };

  const formatEstimatedTime = (
    estimatedTime?: string | number | null,
  ): string => {
    // If not provided or invalid, return a default value
    if (estimatedTime === null || estimatedTime === undefined) return "~";

    // If it's already a formatted string (like "20s"), return it
    if (typeof estimatedTime === "string" && isNaN(Number(estimatedTime))) {
      return estimatedTime;
    }

    // Convert to number (handle both numeric strings and numbers)
    const seconds =
      typeof estimatedTime === "string"
        ? parseInt(estimatedTime, 10)
        : estimatedTime;

    // Format based on duration
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.round(seconds / 60);
      return `${minutes}m`;
    } else {
      const hours = Math.round((seconds / 3600) * 10) / 10; // Round to 1 decimal place
      return `${hours}h`;
    }
  };

  const handleSlippageModeChange = (mode: "auto" | "custom") => {
    setSlippageMode(mode);
    setSlippageError(null);

    if (mode === "auto") {
      // When switching to auto, use "auto" as the slippage value
      setSlippageValue(DEFAULT_AUTO_SLIPPAGE);
    } else if (mode === "custom") {
      // When switching to custom, preserve the current input value if valid, otherwise use default 3.00%
      if (customSlippage && !isNaN(parseFloat(customSlippage))) {
        // Only update store if the custom value is already valid
        const numericValue = parseFloat(customSlippage);
        if (numericValue > 0 && numericValue <= MAX_SLIPPAGE) {
          setSlippageValue(formatSlippageValue(customSlippage));
        } else {
          // If invalid, reset to default custom value
          setCustomSlippage(DEFAULT_CUSTOM_SLIPPAGE.replace("%", ""));
          setSlippageValue(DEFAULT_CUSTOM_SLIPPAGE);
        }
      } else {
        // If no custom value exists, initialize with the default custom value
        setCustomSlippage(DEFAULT_CUSTOM_SLIPPAGE.replace("%", ""));
        setSlippageValue(DEFAULT_CUSTOM_SLIPPAGE);
      }
    }
  };

  const handleCustomSlippageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;

    // Only allow numbers and up to 2 decimal places
    if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
      setCustomSlippage(value);

      // Validate the value - just set error messages but don't update the store yet
      const numericValue = parseFloat(value);
      if (value && !isNaN(numericValue)) {
        if (numericValue > MAX_SLIPPAGE) {
          setSlippageError(`Maximum slippage is ${MAX_SLIPPAGE}%`);
        } else if (numericValue <= 0) {
          setSlippageError("Slippage must be greater than 0%");
        } else {
          setSlippageError(null);
        }
      } else {
        setSlippageError(null);
      }
    }
  };

  // Handle custom slippage input blur
  const handleCustomSlippageBlur = () => {
    // Only update the store when the input loses focus and is valid
    if (customSlippage && !slippageError) {
      const numericValue = parseFloat(customSlippage);
      if (
        !isNaN(numericValue) &&
        numericValue > 0 &&
        numericValue <= MAX_SLIPPAGE
      ) {
        // Format consistently and update the store
        const formattedValue = formatSlippageValue(customSlippage);
        setSlippageValue(formattedValue);
      }
    } else if (customSlippage === "") {
      // If empty, revert to auto mode
      handleSlippageModeChange("auto");
    }
  };

  const startEditingReceiveAddress = useCallback(() => {
    setIsEditingReceiveAddress(true);
  }, []);

  const handleReceiveAddressChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setReceiveAddressInput(e.target.value);
  };

  // Get current receiving address
  const receivingAddress =
    transactionDetails.receiveAddress || activeWallet?.address || "0x000...000";

  return (
    <div className="mt-2 text-white border-zinc-900 border-[1px] rounded-[3px] px-2">
      {/* Summary Row (Always Visible) */}
      <div
        className="flex items-center justify-between cursor-pointer py-2 numeric-input text-zinc-400 sm:text-[12px] text-[9px]"
        onClick={toggleDetails}
      >
        <div className="text-left">
          {exchangeRate} ({exchangeValue})
        </div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <Fuel size={14} />
            <span>{gasFee}</span>
          </div>
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

      {/* Expanded Details with Animation */}
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

            <div className="text-left text-zinc-400">fee</div>
            <div className="text-right numeric-input text-zinc-200">$5.29</div>

            <div className="text-left text-zinc-400">relayer fees</div>
            <div className="text-right numeric-input text-zinc-200">$1.87</div>
          </div>

          <div className="mt-2">
            <div className="flex items-center justify-between">
              <div className="text-left text-amber-500 text-[12px]">
                receiving
              </div>

              {isEditingReceiveAddress ? (
                <div className="flex items-center w-full ml-4">
                  <button
                    className="ml-7 text-amber-500 hover:text-amber-400 flex-shrink-0"
                    onClick={saveReceiveAddress}
                  >
                    <Check size={14} />
                  </button>
                  <input
                    ref={receiveAddressInputRef}
                    type="text"
                    value={receiveAddressInput}
                    onChange={handleReceiveAddressChange}
                    className="numeric-input bg-transparent text-right text-zinc-200 sm:text-xs text-[9px] w-full outline-none"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="flex items-center w-full">
                  <span className="flex-grow"></span>
                  <button
                    className="text-amber-500 hover:text-amber-400 flex-shrink-0 mr-[5px]"
                    onClick={startEditingReceiveAddress}
                  >
                    <Edit2 size={14} />
                  </button>
                  <span className="text-zinc-200 sm:text-xs text-[9px] font-mono text-right">
                    {receivingAddress}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
