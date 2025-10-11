"use client";

import {
  DynamicContextProvider,
  FilterChain,
} from "@dynamic-labs/sdk-react-core";

import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { SolanaWalletConnectors } from "@dynamic-labs/solana";
import { SuiWalletConnectors } from "@dynamic-labs/sui";
import { SolanaIcon, EthereumIcon, SuiIcon } from "@dynamic-labs/iconic";

import Terms from "@/components/ui/Terms";

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
        cssOverrides: `
          .connect-button:not(.custom-wallet-button) {
            font-family: inherit !important;
            font-weight: 500 !important;
            font-size: 0.875rem !important;
            line-height: 1.25rem !important;
            padding: 0 1rem !important;
            height: 30px !important;
            min-height: 30px !important;
            max-height: 30px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            white-space: nowrap !important;
            background: rgba(245, 158, 11, 0.25) !important;
            border: 1px solid #61410B !important;
            border-radius: 0.375rem !important;
            flex-wrap: nowrap !important;
            gap: 0.5rem !important;
          }
          .connect-button:not(.custom-wallet-button):hover {
            background: rgba(245, 158, 11, 0.5) !important;
            color: rgb(251, 191, 36) !important;
          }
          .connect-button:not(.custom-wallet-button) .typography-button__content {
            display: inline-flex !important;
            align-items: center !important;
            flex-wrap: nowrap !important;
            white-space: nowrap !important;
            gap: 0.5rem !important;
          }
          .connect-button:not(.custom-wallet-button) .typography {
            font-family: inherit !important;
            font-weight: inherit !important;
            font-size: inherit !important;
            line-height: inherit !important;
            color: inherit !important;
            white-space: nowrap !important;
            display: inline !important;
          }
          .connect-button:not(.custom-wallet-button) svg {
            flex-shrink: 0 !important;
            display: inline-block !important;
          }

          /* Custom wallet button styles */
          .custom-wallet-button {
            background: transparent !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .custom-wallet-button:hover {
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
            transform: none !important;
          }
          .custom-wallet-button .typography-button__content {
            display: inline-flex !important;
            align-items: center !important;
            flex-wrap: nowrap !important;
            white-space: nowrap !important;
          }
          .custom-wallet-button .typography {
            font-family: inherit !important;
            font-weight: inherit !important;
            font-size: inherit !important;
            line-height: inherit !important;
            color: inherit !important;
            white-space: nowrap !important;
            display: inline !important;
          }
          .custom-wallet-button:hover .typography {
            color: inherit !important;
          }
          .custom-wallet-button svg {
            flex-shrink: 0 !important;
            display: inline-block !important;
          }
        `,
        events: {
          onAuthFlowOpen: handleAuthFlowOpen,
        },
      }}
    >
      {children}
    </DynamicContextProvider>
  );
}
