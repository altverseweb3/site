"use client";

import {
  useState,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  DynamicContextProvider,
  FilterChain,
  EvmNetwork,
  useDynamicContext,
} from "@dynamic-labs/sdk-react-core";

import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import { SuiWalletConnectors } from "@dynamic-labs/sui";
import { SolanaIcon, EthereumIcon, SuiIcon } from "@dynamic-labs/iconic";

import Terms from "@/components/ui/Terms";
import Disclaimer from "@/components/ui/Disclaimer";
import { chainList } from "@/config/chains";
import { WalletType } from "@/types/web3";
import useUIStore from "@/store/uiStore";

// Map our chain configuration to Dynamic's EvmNetwork format
const evmNetworks: EvmNetwork[] = chainList
  .filter((chain) => chain.walletType === WalletType.EVM)
  .map((chain) => ({
    blockExplorerUrls: chain.explorerUrl ? [chain.explorerUrl] : [],
    chainId: chain.chainId,
    chainName: chain.chainName,
    iconUrls: [`https://app.dynamic.xyz/assets/networks/${chain.id}.svg`],
    name: chain.name,
    nativeCurrency: {
      decimals: chain.nativeGasToken.decimals,
      name: chain.currency,
      symbol: chain.nativeGasToken.symbol,
      iconUrl: `https://app.dynamic.xyz/assets/networks/${chain.id}.svg`,
    },
    networkId: chain.chainId,
    rpcUrls: chain.rpcUrls || [],
    vanityName: chain.chainName,
  }));

// Inner component that has access to useDynamicContext
const DynamicWalletInner = forwardRef<
  { handleAuthFlowOpenCallback: () => void },
  { children: React.ReactNode }
>(({ children }, ref) => {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const hasAcceptedTerms = useUIStore((state) => state.hasAcceptedTerms);
  const setHasAcceptedTerms = useUIStore((state) => state.setHasAcceptedTerms);
  const { setShowAuthFlow } = useDynamicContext();
  const isHandlingAuthFlowRef = useRef(false);

  const handleAuthFlowOpenCallback = useCallback(() => {
    // Prevent multiple simultaneous calls
    if (isHandlingAuthFlowRef.current) return;

    // Check if terms have been accepted
    if (!hasAcceptedTerms) {
      isHandlingAuthFlowRef.current = true;

      // Use a small delay to ensure the auth flow is fully opened before we close it
      setTimeout(() => {
        // Close the Dynamic auth flow
        setShowAuthFlow(false);
        // Show our disclaimer instead
        setShowDisclaimer(true);
        isHandlingAuthFlowRef.current = false;
      }, 50);

      return;
    }

    // Terms accepted, proceed with normal scroll focus behavior
    setTimeout(() => {
      const scrollContainer = document.querySelector(
        ".wallet-list__scroll-container",
      );

      if (scrollContainer instanceof HTMLElement) {
        if (!scrollContainer.hasAttribute("tabindex")) {
          scrollContainer.setAttribute("tabindex", "-1");
        }
        scrollContainer.focus();

        scrollContainer.style.setProperty(
          "-webkit-overflow-scrolling",
          "touch",
        );
      }
    }, 150);
  }, [hasAcceptedTerms, setShowAuthFlow]);

  // Expose the callback to parent via ref
  useImperativeHandle(ref, () => ({
    handleAuthFlowOpenCallback,
  }));

  const handleDisclaimerAccept = () => {
    setHasAcceptedTerms(true);
    setShowDisclaimer(false);
    // Reopen the Dynamic auth flow
    setTimeout(() => {
      setShowAuthFlow(true);
    }, 500);
  };

  const handleDisclaimerDeny = () => {
    setShowDisclaimer(false);
  };

  return (
    <>
      {children}
      <Disclaimer
        open={showDisclaimer}
        onOpenChange={setShowDisclaimer}
        onAccept={handleDisclaimerAccept}
        onDeny={handleDisclaimerDeny}
      />
    </>
  );
});

DynamicWalletInner.displayName = "DynamicWalletInner";

export default function DynamicWalletContext({
  children,
}: {
  children: React.ReactNode;
}) {
  const innerRef = useRef<{ handleAuthFlowOpenCallback: () => void }>(null);

  const handleAuthFlowOpen = () => {
    if (innerRef.current) {
      innerRef.current.handleAuthFlowOpenCallback();
    }
  };

  return (
    <DynamicContextProvider
      theme="dark"
      settings={{
        environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID!,
        overrides: {
          evmNetworks,
          views: [
            {
              type: "wallet-list",
              tabs: {
                items: [
                  {
                    label: { icon: <EthereumIcon /> },
                    walletsFilter: FilterChain("EVM"),
                  },
                  {
                    label: { icon: <SolanaIcon /> },
                    walletsFilter: FilterChain("SOL"),
                  },
                  {
                    label: { icon: <SuiIcon /> },
                    walletsFilter: FilterChain("SUI"),
                  },
                ],
              },
            },
          ],
        },
        walletConnectors: [
          EthereumWalletConnectors,
          SolanaWalletConnectors,
          SuiWalletConnectors,
        ],
        appName: "altverse",
        appLogoUrl: "/tokens/branded/ALT.svg",
        customTermsOfServices: <Terms>terms of service</Terms>,
        shadowDOMEnabled: false,
        enableVisitTrackingOnConnectOnly: true,

        events: {
          onAuthFlowOpen: handleAuthFlowOpen,
        },
      }}
    >
      <DynamicWalletInner ref={innerRef}>{children}</DynamicWalletInner>
    </DynamicContextProvider>
  );
}
