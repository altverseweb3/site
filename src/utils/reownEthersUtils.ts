// utils/reownEthersUtils.ts

import { ethers } from "ethers";
import { useAppKitProvider } from "@reown/appkit/react";
import { getSafeProvider, getSafeSolanaProvider } from "@/utils/providerUtils";
import { Transaction } from "@solana/web3.js";

/**
 * Enhanced hook for accessing wallet providers and signers for both EVM and Solana
 * Returns appropriate providers and signing functions based on current wallet type
 */
export function useWalletProviderAndSigner() {
  // Get providers for both EVM and Solana namespaces
  const { walletProvider: evmProvider } = useAppKitProvider("eip155");
  const { walletProvider: solanaProvider } = useAppKitProvider("solana");

  /**
   * Get EVM signer from wallet provider
   */
  const getEvmSigner = async () => {
    if (!evmProvider) {
      console.error("No EVM wallet provider available from Reown");
      throw new Error("No EVM wallet provider available");
    }

    try {
      const safeProvider = getSafeProvider(evmProvider);

      // Create ethers provider and signer
      const ethersProvider = new ethers.BrowserProvider(safeProvider);
      return await ethersProvider.getSigner();
    } catch (error) {
      console.error("Error getting EVM signer from wallet provider:", error);
      throw error;
    }
  };

  /**
   * Get Solana wallet interface for signing
   * Returns an object with methods for signing Solana transactions
   */
  const getSolanaSigner = async () => {
    if (!solanaProvider) {
      console.error("No Solana wallet provider available from Reown");
      throw new Error("No Solana wallet provider available");
    }

    try {
      const safeProvider = getSafeSolanaProvider(solanaProvider);

      if (!safeProvider) {
        throw new Error("Failed to get safe Solana provider");
      }

      // If we have a public key property on the provider, use it
      // Otherwise try to call a connect method to get it
      let publicKey: string;
      if (safeProvider.publicKey) {
        // Get public key from provider
        publicKey =
          typeof safeProvider.publicKey.toString === "function"
            ? safeProvider.publicKey.toString()
            : (safeProvider.publicKey as string);
      } else if (typeof safeProvider.connect === "function") {
        // Try to connect and get public key
        const connectResult = await safeProvider.connect();
        publicKey = connectResult.publicKey.toString();
      } else {
        throw new Error("Could not get Solana public key from provider");
      }

      return {
        publicKey,
        signTransaction: async (transaction: Transaction) => {
          // Use provider's signTransaction method to sign
          if (typeof safeProvider.signTransaction !== "function") {
            throw new Error("Solana provider does not support signTransaction");
          }

          return safeProvider.signTransaction(
            transaction,
          ) as Promise<Transaction>;
        },
        signAllTransactions: async (transactions: Transaction[]) => {
          // Use provider's signAllTransactions method to sign multiple
          if (typeof safeProvider.signAllTransactions !== "function") {
            throw new Error(
              "Solana provider does not support signAllTransactions",
            );
          }

          return safeProvider.signAllTransactions(transactions) as Promise<
            Transaction[]
          >;
        },
        signMessage: async (message: Uint8Array) => {
          // Use provider's signMessage method
          if (typeof safeProvider.signMessage !== "function") {
            throw new Error("Solana provider does not support signMessage");
          }

          return safeProvider.signMessage(message, "utf8");
        },
      };
    } catch (error) {
      console.error("Error getting Solana signer from wallet provider:", error);
      throw error;
    }
  };

  /**
   * Get appropriate signer based on active wallet type
   * This is the main function to use for getting a signer for transactions
   */

  return {
    evmProvider,
    solanaProvider,
    getEvmSigner, // Direct access to EVM signer if needed
    getSolanaSigner, // Direct access to Solana signer if needed
  };
}
