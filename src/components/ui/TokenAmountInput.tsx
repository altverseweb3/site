import React, { useMemo, useState, useEffect } from "react";
import { Wallet } from "lucide-react";
import PersistentAmountDisplay from "@/components/ui/PersistentAmountDisplay";
import useWeb3Store, {
  useSourceToken,
  useSourceChain,
} from "@/store/web3Store";
import { formatBalance } from "@/utils/formatters";
import { useWalletByType } from "@/hooks/dynamic/useUserWallets";

interface TokenAmountInputProps {
  amount: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  dollarValue?: number;
  readOnly?: boolean;
  placeholder?: string;
  isLoadingQuote?: boolean;
  variant?: "source" | "destination";
  onContainerClick: () => void; // Add this prop
  disableWalletBalance?: boolean;
}

export function TokenAmountInput({
  amount,
  onChange,
  dollarValue = 0,
  readOnly = false,
  placeholder = "0",
  isLoadingQuote = false,
  variant = "source",
  onContainerClick, // Add this parameter
  disableWalletBalance = false,
}: TokenAmountInputProps) {
  const isLoading = isLoadingQuote && readOnly;
  const sourceToken = useSourceToken();
  const sourceChain = useSourceChain();
  const [displayedAmountUsd, setDisplayedAmountUsd] = useState("$~");

  // Check if source token is selected
  const isSourceTokenSelected = sourceToken && sourceToken.address;

  // Create a more specific subscription to track token balance changes
  const tokenAddress = sourceToken?.address?.toLowerCase();
  const chainId = sourceToken?.chainId;

  // Get the required wallet separately to use for conditional rendering
  const requiredWallet = useWalletByType(sourceChain.walletType);

  // This will re-render when the specific token balance changes
  const tokenBalance = useWeb3Store((state) => {
    if (!tokenAddress || !chainId || !requiredWallet) return null;

    const walletKey = `${chainId}-${requiredWallet.address.toLowerCase()}`;
    const balances = state.tokenBalancesByWallet[walletKey];

    return balances?.[tokenAddress] || null;
  });

  // Use the balance from the direct subscription if available, otherwise fall back to sourceToken
  const currentBalance = useMemo(() => {
    return tokenBalance || sourceToken?.userBalance || "0";
  }, [tokenBalance, sourceToken?.userBalance]);

  useEffect(() => {
    // Update the displayed amount in USD when the amount changes
    setDisplayedAmountUsd(
      dollarValue > 0 ? `$${dollarValue.toFixed(2)}` : "$-",
    );
  }, [dollarValue]);

  // Determine if input should be readonly:
  // - For source variant: readonly when no token is selected OR when explicitly set to readonly
  // - For destination variant: use the original readOnly logic
  const shouldBeReadOnly =
    variant === "source" ? !isSourceTokenSelected || readOnly : readOnly;

  // Apply faded style for:
  // - Disabled source inputs (readOnly source)
  // - Destination inputs when showing default/null value (0 or empty)
  const shouldApplyDisabledStyle =
    shouldBeReadOnly &&
    (variant === "source" ||
      (variant === "destination" && (Number(amount) === 0 || !amount)));

  return (
    <div
      className="flex-1 flex flex-col items-end"
      onClick={() => {
        onContainerClick();
      }}
    >
      <PersistentAmountDisplay
        isLoading={isLoading}
        amount={amount}
        variant={variant}
        onChange={onChange || (() => {})}
        placeholder={placeholder}
        shouldApplyDisabledStyle={shouldApplyDisabledStyle}
        readOnly={shouldBeReadOnly}
        allowContainerClick={variant === "source" && !isSourceTokenSelected}
      />
      <div className="w-full flex flex-col">
        {dollarValue > 0 && (
          <span className="text-zinc-400 text-sm numeric-input">
            {displayedAmountUsd}
          </span>
        )}
        {variant === "source" && requiredWallet && !disableWalletBalance && (
          <div className="flex justify-end w-full mt-2 gap-2">
            {/* Balance display */}
            <div className="flex items-center px-1 py-0.5 rounded-md bg-amber-500 bg-opacity-25">
              <Wallet size={14} className="text-amber-500 mr-1" />
              <span className="text-amber-500 text-xs numeric-input">
                {currentBalance ? formatBalance(currentBalance) : "0.000"}
              </span>
            </div>

            {/* Max button */}
            <button
              className="px-1 py-0.5 rounded-md bg-amber-500 bg-opacity-25 text-amber-500 text-xs cursor-pointer"
              onClick={(e) => {
                e.stopPropagation(); // Prevent container click
                if (currentBalance && onChange) {
                  // Create a synthetic event object that mimics React.ChangeEvent<HTMLInputElement>
                  const syntheticEvent = {
                    target: { value: currentBalance },
                    preventDefault: () => {},
                    stopPropagation: () => {},
                  } as React.ChangeEvent<HTMLInputElement>;

                  onChange(syntheticEvent);
                }
              }}
            >
              max
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default TokenAmountInput;
