import React, { useMemo, useState, useEffect } from "react";
import { Wallet } from "lucide-react";
import PersistentAmountDisplay from "@/components/ui/PersistentAmountDisplay";
import useWeb3Store, { useSourceToken } from "@/store/web3Store";

interface TokenAmountInputProps {
  amount: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  dollarValue?: number;
  readOnly?: boolean;
  placeholder?: string;
  isLoadingQuote?: boolean;
  variant?: "source" | "destination"; // Add variant to distinguish receive amount
}

export function TokenAmountInput({
  amount,
  onChange,
  dollarValue = 0,
  readOnly = false,
  placeholder = "0",
  isLoadingQuote = false,
  variant = "source",
}: TokenAmountInputProps) {
  const isLoading = isLoadingQuote && readOnly;
  const sourceToken = useSourceToken();
  const [displayedAmountUsd, setDisplayedAmountUsd] = useState("$~");

  // Create a more specific subscription to track token balance changes
  const tokenAddress = sourceToken?.address?.toLowerCase();
  const chainId = sourceToken?.chainId;

  // Get the required wallet separately to use for conditional rendering
  const requiredWallet = useWeb3Store((state) => {
    return state.getWalletBySourceChain();
  });

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

  // Helper function to format balance nicely with abbreviations for large numbers
  const formatBalance = (balance: string): string => {
    try {
      // Handle hex strings that start with "0x"
      let numericBalance = balance;
      if (typeof balance === "string" && balance.startsWith("0x")) {
        numericBalance = BigInt(balance).toString();
      }

      // Convert balance to a number
      const numBalance = Number(numericBalance);

      // Check if we have a valid number
      if (isNaN(numBalance)) {
        return "0.000000";
      }

      // We should NOT divide by 10^decimals here because the balance is already
      // in human-readable form. The decimals parameter is just for reference, but
      // not needed for displaying the current balance.

      // Handle abbreviations for large numbers
      if (numBalance >= 1_000_000_000_000) {
        // Trillion+
        return (numBalance / 1_000_000_000_000).toFixed(2) + "T";
      } else if (numBalance >= 1_000_000_000) {
        // Billion+
        return (numBalance / 1_000_000_000).toFixed(2) + "B";
      } else if (numBalance >= 1_000_000) {
        // Million+
        return (numBalance / 1_000_000).toFixed(2) + "M";
      } else if (numBalance >= 1_000) {
        // Thousand+
        return (numBalance / 1_000).toFixed(2) + "K";
      } else if (numBalance >= 1) {
        // Between 1 and 999
        return numBalance.toFixed(3);
      } else if (numBalance === 0) {
        // Exactly zero
        return "0.000";
      } else {
        // Small fractions - use more decimal places but cap at 6
        // For very small numbers, show up to 6 decimal places
        if (numBalance < 0.0001) {
          return numBalance.toFixed(6);
        } else if (numBalance < 0.01) {
          return numBalance.toFixed(5);
        } else {
          return numBalance.toFixed(4);
        }
      }
    } catch (e) {
      console.error("Error formatting balance:", e);
      return "0.000000";
    }
  };

  // Apply faded style for:
  // - Disabled source inputs (readOnly source)
  // - Destination inputs when showing default/null value (0 or empty)
  const shouldApplyDisabledStyle =
    readOnly &&
    (variant === "source" ||
      (variant === "destination" && (Number(amount) === 0 || !amount)));

  return (
    <div className="flex-1 flex flex-col items-end">
      <PersistentAmountDisplay
        isLoading={isLoading}
        amount={amount}
        variant={variant}
        onChange={onChange || (() => {})}
        placeholder={placeholder}
        shouldApplyDisabledStyle={shouldApplyDisabledStyle}
        readOnly={readOnly}
      />
      <div className="w-full flex flex-col">
        <span className="text-zinc-400 text-sm numeric-input">
          {displayedAmountUsd}
        </span>
        {variant === "source" && requiredWallet && (
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
              onClick={() => {
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
