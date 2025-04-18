import React, { ReactNode, useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { AssetBox } from "@/components/ui/AssetBox";
import { TokenInputGroup } from "@/components/ui/TokenInputGroup";
import { SwapInterface } from "@/components/ui/SwapInterface";
import { TokenSwitch } from "@/components/ui/TokenSwitch";
import { ConnectWalletModal } from "@/components/ui/ConnectWalletModal";
import { BrandedButton } from "@/components/ui/BrandedButton";
import { AvailableIconName } from "@/types/ui";

interface TokenTransferProps {
  amount: string;
  onAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isButtonDisabled?: boolean;
  hasActiveWallet?: boolean;
  onTransfer?: () => Promise<void>;
  transferType: "swap" | "bridge";
  actionText?: string;
  actionIcon?: AvailableIconName;
  showDestinationTokenSelector?: boolean;
  className?: string;
  settingsComponent?: ReactNode;
  receiveAmount?: string;
  isLoadingQuote?: boolean;
  // Transaction details props
  exchangeRate?: string;
  exchangeValue?: string;
  gasFee?: string;
  estimatedTimeSeconds?: number | null;
  // Token selection state
  hasSourceToken?: boolean;
  hasDestinationToken?: boolean;
}

export const TokenTransfer: React.FC<TokenTransferProps> = ({
  amount,
  onAmountChange,
  isButtonDisabled,
  hasActiveWallet = false,
  onTransfer,
  transferType,
  actionText,
  actionIcon,
  showDestinationTokenSelector = true,
  className = "",
  settingsComponent,
  receiveAmount = "",
  isLoadingQuote = false,
  // Transaction details props
  exchangeRate = "1 USDC = 0.000362352 ETH",
  exchangeValue = "$1.00",
  gasFee = "<$0.01",
  estimatedTimeSeconds = null,
  // Token selection state
  hasSourceToken = false,
  hasDestinationToken = false,
}) => {
  // State to track if the input should be enabled
  const [isInputEnabled, setIsInputEnabled] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const shouldBeEnabled =
      hasSourceToken &&
      (showDestinationTokenSelector ? hasDestinationToken : true);

    setIsInputEnabled(shouldBeEnabled);
  }, [hasSourceToken, hasDestinationToken, showDestinationTokenSelector]);

  const defaultSettingsButton = (
    <button onClick={() => setShowDetails(!showDetails)}>
      <Settings className="h-5 w-5 text-zinc-400 hover:text-zinc-50 transition-colors" />
    </button>
  );

  const settingsBtn = settingsComponent || defaultSettingsButton;

  const defaultButtonText = transferType === "swap" ? "swap" : "bridge";
  const defaultIconName: AvailableIconName =
    transferType === "swap" ? "Coins" : "Cable";

  const buttonText = hasActiveWallet
    ? actionText || defaultButtonText
    : "connect wallet";

  const iconName = hasActiveWallet ? actionIcon || defaultIconName : "Wallet";

  // Make sure button is disabled during quote loading
  const calculatedIsDisabled =
    isButtonDisabled ?? (isLoadingQuote || !amount || amount === "0");

  const actionButton = hasActiveWallet
    ? {
        text: buttonText,
        iconName: iconName as AvailableIconName,
        onClick: onTransfer,
        disabled: calculatedIsDisabled,
      }
    : {
        text: "connect wallet",
        iconName: "Wallet" as AvailableIconName,
        disabled: false,
      };

  const renderButtonOrModal = hasActiveWallet
    ? undefined
    : () => (
        <ConnectWalletModal
          trigger={
            <BrandedButton
              buttonText="connect wallet"
              iconName="Wallet"
              className="h-[40px] w-full"
            />
          }
        />
      );

  const transferContent = (
    <>
      <AssetBox
        title="send"
        showSettings={true}
        settingsComponent={settingsBtn}
        showChainSelector={true}
        boxType="source"
      >
        <TokenInputGroup
          variant="source"
          amount={amount}
          onChange={onAmountChange}
          showSelectToken={true}
          isEnabled={isInputEnabled}
        />
      </AssetBox>

      <TokenSwitch />

      <AssetBox
        title="receive"
        showSettings={false}
        showChainSelector={true}
        boxType="destination"
      >
        <TokenInputGroup
          variant="destination"
          amount={receiveAmount}
          readOnly={true}
          showSelectToken={showDestinationTokenSelector}
          isLoadingQuote={isLoadingQuote}
        />
      </AssetBox>
    </>
  );

  return (
    <div
      className={`flex h-full w-full items-start justify-center sm:pt-[6vh] pt-[2vh] min-h-[500px] ${className}`}
    >
      <div className="w-full max-w-md">
        <SwapInterface
          actionButton={actionButton}
          enforceSourceChain={hasActiveWallet}
          renderActionButton={renderButtonOrModal}
          // Pass transaction details props to SwapInterface
          exchangeRate={exchangeRate}
          exchangeValue={exchangeValue}
          gasFee={gasFee}
          estimatedTime={estimatedTimeSeconds} // Pass the ETA from quote
          detailsOpen={showDetails}
          onDetailsToggle={() => setShowDetails(!showDetails)}
        >
          {transferContent}
        </SwapInterface>
      </div>
    </div>
  );
};
