import {
  useUserWallets as useDynamicUserWallets,
  Wallet,
} from "@dynamic-labs/sdk-react-core";
import type { InternalWalletConnector } from "@dynamic-labs/wallet-connector-core";
import { isSolanaWallet } from "@dynamic-labs/solana";
import { isEthereumWallet } from "@dynamic-labs/ethereum";
import { isSuiWallet } from "@dynamic-labs/sui";
import { ethers } from "ethers";
import { Transaction, VersionedTransaction } from "@solana/web3.js";
import { SuiClient } from "@mysten/sui/client";

export const useDynamicAccounts = () => {
  return useDynamicUserWallets();
};

export const useDynamicAccountByAddress = (address: string): Wallet | null => {
  const wallets = useDynamicUserWallets();
  return (
    wallets.find(
      (wallet) => wallet.address.toLowerCase() === address.toLowerCase(),
    ) || null
  );
};

/**
 * Helper function to get EVM provider and signer for a given wallet
 * Similar to Reown implementation but adapted for Dynamic
 */
export const useDynamicEvmProvider = (wallet: Wallet | null) => {
  if (!wallet || !isEthereumWallet(wallet)) {
    return {
      getPublicClient: async () => undefined,
      getEvmSigner: async () => undefined,
    };
  }

  // Cast to InternalWalletConnector to access connector methods
  const connector = wallet.connector as InternalWalletConnector;

  return {
    getPublicClient: async () => {
      try {
        return await connector.getPublicClient();
      } catch (error) {
        console.error("Error getting public client:", error);
        return undefined;
      }
    },
    getEvmSigner: async () => {
      try {
        // Get the wallet client from Dynamic
        const walletClient = await connector.getWalletClient();

        if (!walletClient) {
          console.error("No wallet client available from Dynamic");
          return undefined;
        }

        // Convert to ethers signer similar to Reown implementation
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ethersProvider = new ethers.BrowserProvider(walletClient as any);
        return await ethersProvider.getSigner();
      } catch (error) {
        console.error("Error getting EVM signer:", error);
        return undefined;
      }
    },
  };
};

/**
 * Helper function to get Solana provider and signer for a given wallet
 * Similar to Reown implementation but adapted for Dynamic
 */
export const useDynamicSolanaProvider = (wallet: Wallet | null) => {
  if (!wallet || !isSolanaWallet(wallet)) {
    return {
      getSolanaConnection: async () => undefined,
      getSolanaSigner: async () => undefined,
    };
  }

  return {
    getSolanaConnection: async () => {
      try {
        return await wallet.getConnection();
      } catch (error) {
        console.error("Error getting Solana connection:", error);
        return undefined;
      }
    },
    getSolanaSigner: async () => {
      try {
        // Get the signer from Dynamic's Solana wallet
        const dynamicSigner = await wallet.getSigner();

        if (!dynamicSigner) {
          console.error("No Solana signer available from Dynamic");
          return undefined;
        }

        // Extract public key as string (similar to Reown approach)
        let publicKey: string;
        if (dynamicSigner.publicKey) {
          // Dynamic's publicKey can be an object with toString or toBase58
          publicKey =
            typeof dynamicSigner.publicKey.toString === "function"
              ? dynamicSigner.publicKey.toString()
              : (dynamicSigner.publicKey as unknown as string);
        } else {
          throw new Error(
            "Could not get Solana public key from Dynamic wallet",
          );
        }

        // Return signer interface matching our SolanaSigner type
        return {
          publicKey,
          signTransaction: async (
            transaction: Transaction | VersionedTransaction,
          ) => {
            if (typeof dynamicSigner.signTransaction !== "function") {
              throw new Error("Solana wallet does not support signTransaction");
            }
            return dynamicSigner.signTransaction(transaction);
          },
          signAllTransactions: dynamicSigner.signAllTransactions
            ? async (transactions: (Transaction | VersionedTransaction)[]) => {
                if (typeof dynamicSigner.signAllTransactions !== "function") {
                  throw new Error(
                    "Solana wallet does not support signAllTransactions",
                  );
                }
                return dynamicSigner.signAllTransactions(transactions);
              }
            : undefined,
          signMessage: dynamicSigner.signMessage
            ? async (message: Uint8Array) => {
                if (typeof dynamicSigner.signMessage !== "function") {
                  throw new Error("Solana wallet does not support signMessage");
                }
                return dynamicSigner.signMessage(message);
              }
            : undefined,
        };
      } catch (error) {
        console.error("Error getting Solana signer:", error);
        return undefined;
      }
    },
  };
};

/**
 * Helper function to get Sui client and signer for a given wallet
 * Adapted for Dynamic's Sui wallet integration
 */
export const useDynamicSuiProvider = (wallet: Wallet | null) => {
  if (!wallet || !isSuiWallet(wallet)) {
    return {
      getSuiClient: async () => undefined,
      getSuiSigner: async () => undefined,
    };
  }

  return {
    getSuiClient: async (): Promise<SuiClient | undefined> => {
      try {
        // Get the Sui client from Dynamic wallet
        const suiClient = await wallet.getSuiClient();

        if (!suiClient) {
          console.error("No Sui client available from Dynamic");
          return undefined;
        }

        return suiClient;
      } catch (error) {
        console.error("Error getting Sui client:", error);
        return undefined;
      }
    },
  };
};
