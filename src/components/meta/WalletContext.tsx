"use client";

import { createAppKit } from "@reown/appkit/react";
import { BaseWalletAdapter, SolanaAdapter } from "@reown/appkit-adapter-solana";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";
import { AppKitNetwork } from "@reown/appkit-common";
import { solana } from "@reown/appkit/networks";
import {
  mainnet,
  arbitrum,
  avalanche,
  base,
  optimism,
  polygon,
  bsc,
} from "@reown/appkit/networks";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";

// --- Suiet Imports ---
import { WalletProvider } from "@suiet/wallet-kit";
import "@suiet/wallet-kit/style.css"; // Import Suiet CSS

// --- Reown AppKit Configuration ---
const networks: [AppKitNetwork, ...AppKitNetwork[]] = [
  mainnet,
  arbitrum,
  avalanche,
  base,
  optimism,
  polygon,
  solana,
  bsc,
];

export const ethersAdapter = new EthersAdapter();

const solanaWeb3JsAdapter = new SolanaAdapter({
  wallets: [new PhantomWalletAdapter() as unknown as BaseWalletAdapter<string>],
});

const projectId = "7499f033392cb44c546b3c9de7550340";

const metadata = {
  name: "altverse",
  description: "AppKit Example",
  url: "https://example.com",
  icons: ["https://avatars.githubusercontent.com/u/179229932"],
};

createAppKit({
  adapters: [ethersAdapter, solanaWeb3JsAdapter],
  networks,
  metadata,
  projectId,
  features: {
    analytics: true,
    swaps: false,
    email: false,
    socials: false,
  },
  allWallets: "HIDE",
  enableWalletGuide: false,
  themeVariables: {
    "--w3m-color-mix": "#000000",
    "--w3m-color-mix-strength": 30,
    "--w3m-accent": "#F59E0B",
    "--w3m-font-family": "Urbanist",
    "--w3m-border-radius-master": "8px",
  },
  featuredWalletIds: [
    "c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96",
  ],
  enableWalletConnect: false,
});

// --- Combined Provider Component ---
// This new component will wrap children with the necessary providers
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CombinedWalletProvider({ children }: { children: any }) {
  // The createAppKit call above handles Reown setup.
  // We now wrap children with the Suiet WalletProvider.
  // Reown's context seems to be managed internally after createAppKit runs,
  // so we don't need an explicit Reown provider component here.
  return (
    <WalletProvider>
      {/* Include our state sync component */}
      {/*
        Reown AppKit's context is implicitly available to hooks like useAppKit
        because createAppKit was called in this module's scope.
      */}
      {children}
    </WalletProvider>
  );
}
