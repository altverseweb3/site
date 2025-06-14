import React, { ReactNode, useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { AssetBox } from "@/components/ui/AssetBox";
import { TokenInputGroup } from "@/components/ui/TokenInputGroup";
import { SwapInterface } from "@/components/ui/SwapInterface";
import { TokenSwitch } from "@/components/ui/TokenSwitch";
import { ConnectWalletModal } from "@/components/ui/ConnectWalletModal";
import { BrandedButton } from "@/components/ui/BrandedButton";
import { AvailableIconName } from "@/types/ui";
import { swapChains } from "@/utils/chainMethods";
import useWeb3Store from "@/store/web3Store";
import { Token } from "@/types/web3";

interface TokenTransferProps {
  amount: string;
  onAmountChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isButtonDisabled?: boolean;
  hasActiveWallet?: boolean;
  swapAmounts?: () => Promise<void>;
  onTransfer?: () => Promise<string | void>;
  transferType: "swap" | "bridge";
  actionText?: string;
  actionIcon?: AvailableIconName;
  showDestinationTokenSelector?: boolean;
  className?: string;
  settingsComponent?: ReactNode;
  receiveAmount?: string;
  isLoadingQuote?: boolean;
  estimatedTimeSeconds?: number | null;
  // Token selection state
  hasSourceToken?: boolean;
  hasDestinationToken?: boolean;
  protocolFeeUsd?: number;
  relayerFeeUsd?: number;
  totalFeeUsd?: number;
}

export const TokenTransfer: React.FC<TokenTransferProps> = ({
  amount,
  onAmountChange,
  isButtonDisabled,
  hasActiveWallet = false,
  swapAmounts,
  onTransfer,
  transferType,
  actionText,
  actionIcon,
  showDestinationTokenSelector = true,
  className = "",
  settingsComponent,
  receiveAmount = "",
  isLoadingQuote = false,
  estimatedTimeSeconds = null,
  // Token selection state
  hasSourceToken = false,
  hasDestinationToken = false,
  protocolFeeUsd = 0,
  relayerFeeUsd = 0,
  totalFeeUsd = 0,
}) => {
  // State to track if the input should be enabled
  const [isInputEnabled, setIsInputEnabled] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [sourceAmountValue, setSourceAmountValue] = useState(0);
  const [destinationAmountValue, setDestinationAmountValue] = useState(0);
  const tokensByCompositeKey = useWeb3Store(
    (state) => state.tokensByCompositeKey,
  );
  const destinationToken = useWeb3Store((state) => state.destinationToken);
  const sourceToken = useWeb3Store((state) => state.sourceToken);

  useEffect(() => {
    const shouldBeEnabled =
      hasSourceToken &&
      (showDestinationTokenSelector ? hasDestinationToken : true);

    setIsInputEnabled(shouldBeEnabled);
  }, [hasSourceToken, hasDestinationToken, showDestinationTokenSelector]);

  useEffect(() => {
    // Helper function to calculate USD value for a token and amount
    const calculateUsdValue = (token: Token | null, amount: string) => {
      if (!token?.chainId || !token?.address) return 0;

      const compositeKey = `${token.stringChainId}-${token.address}`;
      const tokenValue = tokensByCompositeKey[compositeKey];

      if (!tokenValue?.priceUsd) return 0;

      return Number(amount) * Number(tokenValue.priceUsd);
    };

    // Calculate and set values in one go
    setSourceAmountValue(calculateUsdValue(sourceToken, amount));
    setDestinationAmountValue(
      calculateUsdValue(destinationToken, receiveAmount),
    );
  }, [
    tokensByCompositeKey,
    sourceToken,
    destinationToken,
    amount,
    receiveAmount,
  ]);

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

  const calculatedIsDisabled = isButtonDisabled ?? (!amount || amount === "0");

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
          dollarValue={sourceAmountValue}
        />
      </AssetBox>

      <TokenSwitch
        onClick={() => {
          swapChains();
          if (swapAmounts) {
            swapAmounts();
          }
        }}
      />

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
          dollarValue={destinationAmountValue}
        />
      </AssetBox>
    </>
  );

  return (
    <div
      className={`flex h-full w-full items-start justify-center sm:pt-[10vh] pt-1 min-h-[500px] ${className}`}
    >
      <div className="w-full max-w-md">
        <SwapInterface
          actionButton={actionButton}
          enforceSourceChain={hasActiveWallet}
          renderActionButton={renderButtonOrModal}
          estimatedTime={estimatedTimeSeconds}
          protocolFeeUsd={protocolFeeUsd}
          relayerFeeUsd={relayerFeeUsd}
          totalFeeUsd={totalFeeUsd}
          detailsOpen={showDetails}
          onDetailsToggle={() => setShowDetails(!showDetails)}
          isLoadingQuote={isLoadingQuote} // Pass the loading state to SwapInterface
        >
          {transferContent}
        </SwapInterface>
      </div>
    </div>
  );
};
