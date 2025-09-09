import React from "react";
import { SelectTokenButton } from "@/components/ui/SelectTokenButton";
import { TokenAmountInput } from "@/components/ui/TokenAmountInput";
import useUIStore from "@/store/uiStore";
import { useSourceToken, useDestinationToken } from "@/store/web3Store";
import { Token } from "@/types/web3";

interface TokenInputGroupProps {
  variant: "source" | "destination";
  amount: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showSelectToken: boolean;
  dollarValue?: number;
  readOnly?: boolean;
  isLoadingQuote?: boolean;
  isEnabled?: boolean; // New prop to control if input is enabled
  featuredTokens?: Token[];
  featuredTokensDescription?: string;
  disableTokenSelect?: boolean;
  disableWalletBalance?: boolean;
}

export function TokenInputGroup({
  variant,
  amount,
  onChange,
  showSelectToken,
  dollarValue = 0,
  readOnly = false,
  isLoadingQuote = false,
  isEnabled = true, // Default to true
  featuredTokens = [],
  featuredTokensDescription = "",
  disableTokenSelect = false,
  disableWalletBalance = false,
}: TokenInputGroupProps) {
  const setSourceTokenSelectOpen = useUIStore(
    (state) => state.setSourceTokenSelectOpen,
  );
  const setDestinationTokenSelectOpen = useUIStore(
    (state) => state.setDestinationTokenSelectOpen,
  );
  const sourceToken = useSourceToken();
  const destinationToken = useDestinationToken();

  const setIsOpen =
    variant === "source"
      ? setSourceTokenSelectOpen
      : setDestinationTokenSelectOpen;
  const allowClick = variant === "source" ? !sourceToken : !destinationToken;

  return (
    <div className="flex justify-between items-start gap-2 sm:gap-4 w-full">
      {showSelectToken && (
        <SelectTokenButton
          variant={variant}
          featuredTokens={featuredTokens}
          featuredTokensDescription={featuredTokensDescription}
          disableTokenSelect={disableTokenSelect}
        />
      )}
      <TokenAmountInput
        amount={amount}
        onChange={onChange}
        dollarValue={dollarValue}
        readOnly={!isEnabled || readOnly}
        disableWalletBalance={disableWalletBalance}
        isLoadingQuote={isLoadingQuote && variant === "destination"}
        variant={variant}
        onContainerClick={() => {
          if (allowClick) {
            setIsOpen(true);
          }
        }} // Open token selector on container click
      />
    </div>
  );
}

export default TokenInputGroup;
