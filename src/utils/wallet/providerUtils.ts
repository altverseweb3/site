// utils/providerUtils.ts

import { Eip1193Provider } from "@/types/web3";

// Define possible wallet provider structures for EVM
interface DirectEVMProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  [key: string]: unknown;
}

interface NestedProviderContainer {
  provider: DirectEVMProvider;
  [key: string]: unknown;
}

interface EthereumContainer {
  ethereum: DirectEVMProvider;
  [key: string]: unknown;
}

// Define possible Solana provider structures
interface DirectSolanaProvider {
  connect?: () => Promise<{ publicKey: { toString: () => string } }>;
  disconnect?: () => Promise<void>;
  publicKey?: { toString: () => string } | string;
  signTransaction?: (transaction: unknown) => Promise<unknown>;
  signAllTransactions?: (transactions: unknown[]) => Promise<unknown[]>;
  signMessage?: (
    message: Uint8Array,
    encoding: string,
  ) => Promise<{ signature: Uint8Array }>;
  [key: string]: unknown;
}

interface NestedSolanaProviderContainer {
  provider: DirectSolanaProvider;
  [key: string]: unknown;
}

interface SolanaContainer {
  solana: DirectSolanaProvider;
  [key: string]: unknown;
}

interface PhantomContainer {
  phantom: DirectSolanaProvider;
  [key: string]: unknown;
}

// Union type for all possible provider structures
type PossibleWalletProvider =
  | DirectEVMProvider
  | NestedProviderContainer
  | EthereumContainer
  | DirectSolanaProvider
  | NestedSolanaProviderContainer
  | SolanaContainer
  | PhantomContainer
  | unknown;

/**
 * Function to safely check and use Reown wallet provider for EVM
 * Extracts a valid EIP-1193 compatible provider from various structures
 */
export function getSafeProvider(
  walletProvider: PossibleWalletProvider,
): Eip1193Provider {
  // Try different possible locations for the actual provider
  let validProvider: Eip1193Provider | null = null;

  // Direct check
  if (
    walletProvider &&
    typeof walletProvider === "object" &&
    "request" in walletProvider &&
    typeof (walletProvider as DirectEVMProvider).request === "function"
  ) {
    validProvider = walletProvider as unknown as Eip1193Provider;
  }
  // Nested in .provider
  else if (
    walletProvider &&
    typeof walletProvider === "object" &&
    "provider" in walletProvider &&
    typeof walletProvider.provider === "object" &&
    walletProvider.provider !== null &&
    "request" in walletProvider.provider &&
    typeof (walletProvider as NestedProviderContainer).provider.request ===
      "function"
  ) {
    validProvider = (walletProvider as NestedProviderContainer)
      .provider as unknown as Eip1193Provider;
  }
  // Nested in .ethereum
  else if (
    walletProvider &&
    typeof walletProvider === "object" &&
    "ethereum" in walletProvider &&
    typeof walletProvider.ethereum === "object" &&
    walletProvider.ethereum !== null &&
    "request" in walletProvider.ethereum &&
    typeof (walletProvider as EthereumContainer).ethereum.request === "function"
  ) {
    validProvider = (walletProvider as EthereumContainer)
      .ethereum as unknown as Eip1193Provider;
  }
  // Fallback to window.ethereum
  else if (
    typeof window !== "undefined" &&
    window.ethereum &&
    window.ethereum.request &&
    typeof window.ethereum.request === "function"
  ) {
    validProvider = window.ethereum as unknown as Eip1193Provider;
  }

  if (!validProvider) {
    throw new Error("No valid Ethereum provider found");
  }

  return validProvider;
}

/**
 * Function to safely check and use Reown wallet provider for Solana
 * Extracts a valid Solana wallet provider from various structures
 */
export function getSafeSolanaProvider(
  walletProvider: PossibleWalletProvider,
): DirectSolanaProvider | null {
  // Try different possible locations for the actual provider
  let validProvider: DirectSolanaProvider | null = null;

  // Direct check for Solana provider methods
  if (
    walletProvider &&
    typeof walletProvider === "object" &&
    ("publicKey" in walletProvider ||
      ("signTransaction" in walletProvider &&
        typeof (walletProvider as DirectSolanaProvider).signTransaction ===
          "function") ||
      ("connect" in walletProvider &&
        typeof (walletProvider as DirectSolanaProvider).connect === "function"))
  ) {
    validProvider = walletProvider as DirectSolanaProvider;
  }
  // Nested in .provider
  else if (
    walletProvider &&
    typeof walletProvider === "object" &&
    "provider" in walletProvider &&
    typeof walletProvider.provider === "object" &&
    walletProvider.provider !== null &&
    ("publicKey" in walletProvider.provider ||
      ("signTransaction" in walletProvider.provider &&
        typeof (walletProvider.provider as DirectSolanaProvider)
          .signTransaction === "function") ||
      ("connect" in walletProvider.provider &&
        typeof (walletProvider.provider as DirectSolanaProvider).connect ===
          "function"))
  ) {
    validProvider = (walletProvider as NestedSolanaProviderContainer).provider;
  }
  // Nested in .solana
  else if (
    walletProvider &&
    typeof walletProvider === "object" &&
    "solana" in walletProvider &&
    typeof walletProvider.solana === "object" &&
    walletProvider.solana !== null &&
    ("publicKey" in walletProvider.solana ||
      ("signTransaction" in walletProvider.solana &&
        typeof (walletProvider.solana as DirectSolanaProvider)
          .signTransaction === "function") ||
      ("connect" in walletProvider.solana &&
        typeof (walletProvider.solana as DirectSolanaProvider).connect ===
          "function"))
  ) {
    validProvider = (walletProvider as SolanaContainer).solana;
  }
  // Nested in .phantom
  else if (
    walletProvider &&
    typeof walletProvider === "object" &&
    "phantom" in walletProvider &&
    typeof walletProvider.phantom === "object" &&
    walletProvider.phantom !== null &&
    ("publicKey" in walletProvider.phantom ||
      ("signTransaction" in walletProvider.phantom &&
        typeof (walletProvider.phantom as DirectSolanaProvider)
          .signTransaction === "function") ||
      ("connect" in walletProvider.phantom &&
        typeof (walletProvider.phantom as DirectSolanaProvider).connect ===
          "function"))
  ) {
    validProvider = (walletProvider as PhantomContainer).phantom;
  }
  // Fallback to window.solana or window.phantom
  else if (typeof window !== "undefined") {
    if (
      window.solana &&
      (window.solana.publicKey ||
        (window.solana.signTransaction &&
          typeof window.solana.signTransaction === "function") ||
        (window.solana.connect && typeof window.solana.connect === "function"))
    ) {
      validProvider = window.solana as unknown as DirectSolanaProvider;
    } else if (
      window.phantom &&
      (window.phantom.publicKey ||
        (window.phantom.signTransaction &&
          typeof window.phantom.signTransaction === "function") ||
        (window.phantom.connect &&
          typeof window.phantom.connect === "function"))
    ) {
      validProvider = window.phantom as unknown as DirectSolanaProvider;
    }
  }

  return validProvider;
}

/**
 * Utility to check if a provider is a Solana provider
 */
export function isSolanaProvider(provider: unknown): boolean {
  return !!getSafeSolanaProvider(provider);
}

/**
 * Utility to check if a provider is an EVM provider
 */
export function isEvmProvider(provider: unknown): boolean {
  try {
    getSafeProvider(provider);
    return true;
  } catch {
    return false;
  }
}
