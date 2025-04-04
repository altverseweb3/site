import React from "react";
import { SelectTokenButton } from "@/components/ui/SelectTokenButton";
import { TokenAmountInput } from "@/components/ui/TokenAmountInput";

interface TokenInputGroupProps {
  variant: "source" | "destination";
  amount: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showSelectToken: boolean;
  dollarValue?: string;
  readOnly?: boolean;
  isLoadingQuote?: boolean;
}

export function TokenInputGroup({
  variant,
  amount,
  onChange,
  showSelectToken,
  dollarValue = "$0.00",
  readOnly = false,
  isLoadingQuote = false,
}: TokenInputGroupProps) {
  return (
    <div className="flex justify-between items-start gap-2 sm:gap-4 w-full">
      {showSelectToken && <SelectTokenButton variant={variant} />}
      <TokenAmountInput
        amount={amount}
        onChange={onChange}
        dollarValue={dollarValue}
        readOnly={readOnly}
        isLoadingQuote={isLoadingQuote && variant === "destination"}
      />
    </div>
  );
}

export default TokenInputGroup;
