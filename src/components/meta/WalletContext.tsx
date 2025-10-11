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
import { WalletProvider, useWallet } from "@suiet/wallet-kit";
import "@suiet/wallet-kit/style.css"; // Import Suiet CSS
import { useEffect } from "react";
import useWeb3Store from "@/store/web3Store";
import { WalletType } from "@/types/web3";

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

// SuiWalletSync component to handle Sui wallet state synchronization
const SuiWalletSync = () => {
  const { connected, address, name, disconnect } = useWallet();

  useEffect(() => {
    // Sync Sui wallet connection state with our store
    if (connected && address) {
      const store = useWeb3Store.getState();
      store.addWallet({
        type: WalletType.SUI,
        name: name || "Sui Wallet",
        address: address,
        chainId: 1, // Default to Sui mainnet
      });
    }
  }, [connected, address, name]);

  // Handle disconnection if our store state conflicts with wallet state
  useEffect(() => {
    const checkDisconnectState = () => {
      const store = useWeb3Store.getState();
      const suiWalletInStore = store.connectedWallets.some(
        (wallet) => wallet.type === WalletType.SUI,
      );

      // If Sui wallet is connected in provider but not in our store, disconnect it
      if (connected && !suiWalletInStore) {
        disconnect();
      }
    };

    // Check on mount and when connected state changes
    checkDisconnectState();
  }, [connected, disconnect]);

  return null; // This is a non-UI component
};

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
      <SuiWalletSync />
      {/*
        Reown AppKit's context is implicitly available to hooks like useAppKit
        because createAppKit was called in this module's scope.
      */}
      {children}
    </WalletProvider>
  );
}
