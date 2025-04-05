import React from "react";

interface TokenAmountInputProps {
  amount: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  dollarValue?: string;
  readOnly?: boolean;
  placeholder?: string;
  isLoadingQuote?: boolean;
  variant?: "source" | "destination"; // Add variant to distinguish receive amount
}

export function TokenAmountInput({
  amount,
  onChange,
  dollarValue = "$0.00",
  readOnly = false,
  placeholder = "0",
  isLoadingQuote = false,
  variant = "source",
}: TokenAmountInputProps) {
  const isLoading = isLoadingQuote && readOnly;

  // Only apply the faded style for disabled source inputs
  // For destination/receive inputs, we want them to look normal even when readOnly
  const shouldApplyDisabledStyle = readOnly && variant === "source";

  return (
    <div className="flex-1 flex flex-col items-end">
      {isLoading ? (
        <div className="w-full animate-pulse text-3xl text-right text-zinc-400">
          loading...
        </div>
      ) : (
        <input
          type="number"
          value={amount}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full bg-transparent text-3xl focus:outline-none text-right numeric-input [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
            shouldApplyDisabledStyle ? "opacity-70" : ""
          }`}
          readOnly={readOnly}
          disabled={readOnly}
        />
      )}
      <span className="text-zinc-400 text-sm numeric-input">{dollarValue}</span>
    </div>
  );
}

export default TokenAmountInput;
