"use client";

import {
  DynamicContextProvider,
  FilterChain,
  EvmNetwork,
} from "@dynamic-labs/sdk-react-core";

import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import { SuiWalletConnectors } from "@dynamic-labs/sui";
import { SolanaIcon, EthereumIcon, SuiIcon } from "@dynamic-labs/iconic";

import Terms from "@/components/ui/Terms";
import { chainList } from "@/config/chains";
import { WalletType } from "@/types/web3";

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

export default function DynamicWalletContext({
  children,
}: {
  children: React.ReactNode;
}) {
  const handleAuthFlowOpen = () => {
    // Focus the modal container after it opens to enable immediate scrolling
    setTimeout(() => {
      // Find the scrollable wallet list container
      const scrollContainer = document.querySelector(
        ".wallet-list__scroll-container",
      );

      if (scrollContainer instanceof HTMLElement) {
        // Make it focusable if it isn't already
        if (!scrollContainer.hasAttribute("tabindex")) {
          scrollContainer.setAttribute("tabindex", "-1");
        }
        scrollContainer.focus();

        // For mobile: ensure smooth scrolling on iOS
        scrollContainer.style.setProperty(
          "-webkit-overflow-scrolling",
          "touch",
        );
      }
    }, 150);
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
      {children}
    </DynamicContextProvider>
  );
}
