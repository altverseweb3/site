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
  estimatedTime?: string;
  className?: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

export function TransactionDetails({
  exchangeRate = "1 USDC = 0.000362352 ETH",
  exchangeValue = "$1.00",
  gasFee = "<$0.01",
  estimatedTime = "20s",
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

  // Max slippage - 15% is generally a reasonable upper limit for cross-chain swaps
  const MAX_SLIPPAGE = 15;

  // Ref for address input to handle click outside
  const receiveAddressInputRef = useRef<HTMLInputElement>(null);

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

  // Initialize values from store
  useEffect(() => {
    // Set initial slippage value from store
    if (transactionDetails.slippage) {
      setCustomSlippage(transactionDetails.slippage.replace("%", ""));
    }

    // Set initial receive address
    if (transactionDetails.receiveAddress) {
      setReceiveAddressInput(transactionDetails.receiveAddress);
    } else if (activeWallet) {
      setReceiveAddressInput(activeWallet.address);
    }
  }, [transactionDetails, activeWallet]);

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

  const handleSlippageModeChange = (mode: "auto" | "custom") => {
    setSlippageMode(mode);
    setSlippageError(null);

    if (mode === "auto") {
      // When switching to auto, use the stored slippage value
      setSlippageValue("3.00");
    }
  };

  const handleCustomSlippageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;

    // Only allow numbers and up to 2 decimal places
    if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
      setCustomSlippage(value);

      // Validate the value
      const numericValue = parseFloat(value);
      if (value && !isNaN(numericValue)) {
        if (numericValue > MAX_SLIPPAGE) {
          setSlippageError(`Maximum slippage is ${MAX_SLIPPAGE}%`);
        } else if (numericValue <= 0) {
          setSlippageError("Slippage must be greater than 0%");
        } else {
          setSlippageError(null);
          // Save to zustand store
          setSlippageValue(`${value}%`);
        }
      } else {
        setSlippageError(null);
      }
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
            <span>{estimatedTime}</span>
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
                  transactionDetails.slippage
                ) : (
                  <div className="flex items-center justify-end">
                    <input
                      type="text"
                      value={customSlippage}
                      onChange={handleCustomSlippageChange}
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
