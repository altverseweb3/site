// utils/mayanSwapMethods.ts
import {
  fetchQuote,
  Quote,
  swapFromEvm,
  swapFromSolana,
  addresses,
  SolanaTransactionSigner,
  createSwapFromSuiMoveCalls,
} from "@mayanfinance/swap-sdk";
import { Token, Chain } from "@/types/web3";
import { ethers, Overrides, JsonRpcSigner } from "ethers";
import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Transaction as SuiTransaction } from "@mysten/sui/transactions";
import { SignedTransaction } from "@mysten/wallet-standard";

interface ReferrerAddresses {
  evm?: string;
  solana?: string;
  sui?: string;
}

export async function approveTokenSpending(
  tokenAddress: string,
  amount: string,
  spenderAddress: string,
  signer: ethers.JsonRpcSigner,
  tokenDecimals: number = 18,
): Promise<boolean> {
  try {
    console.log(`Checking allowance for token ${tokenAddress}`);

    const tokenInterface = new ethers.Interface([
      "function allowance(address owner, address spender) view returns (uint256)",
      "function approve(address spender, uint256 amount) returns (bool)",
    ]);

    const tokenContract = new ethers.Contract(
      tokenAddress,
      tokenInterface,
      signer,
    );
    const ownerAddress = await signer.getAddress();

    // Check current allowance
    const allowance = await tokenContract.allowance(
      ownerAddress,
      spenderAddress,
    );
    const amountWei = ethers.parseUnits(amount, tokenDecimals);

    if (allowance < amountWei) {
      console.log("Insufficient allowance, sending approval transaction...");

      // Try approving the max amount first (most efficient for future swaps)
      try {
        const tx = await tokenContract.approve(
          spenderAddress,
          ethers.MaxUint256,
        );
        console.log("Approval transaction sent:", tx.hash);
        await tx.wait();
        console.log("Approval successful");
        return true;
      } catch (error) {
        console.error(
          "Error with unlimited approval, trying exact amount:",
          error,
        );

        // Some tokens don't allow unlimited approvals, try the exact amount
        const tx = await tokenContract.approve(spenderAddress, amountWei);
        console.log("Exact amount approval transaction sent:", tx.hash);
        await tx.wait();
        console.log("Exact amount approval successful");
        return true;
      }
    }

    console.log("Token already approved");
    return true;
  } catch (error) {
    console.error("Error approving token:", error);
    throw error;
  }
}

/**
 * Execute an EVM to EVM swap with traditional approval flow
 */
export async function executeEvmSwap({
  quote,
  swapperAddress,
  destinationAddress,
  sourceToken,
  amount,
  referrerAddresses = null,
  signer,
  tokenDecimals = 18,
  overrides = null,
  payload = null,
}: {
  quote: Quote;
  swapperAddress: string;
  destinationAddress: string;
  sourceToken: string;
  amount: string;
  referrerAddresses?: ReferrerAddresses | null;
  signer: JsonRpcSigner;
  tokenDecimals?: number;
  overrides?: Overrides | null;
  payload?: Uint8Array | Buffer | null;
}): Promise<string> {
  // Simulate some delay like a real transaction
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Return a real swap ID for testing tracking
  const TEST_SWAP_IDS = [
    "0x9b162bb9b21433a926fc88b1c94686baa593ea382a95a46b9087406418abee3c",
    "0x26a3c6f7d46dc6cb1011f6f49c9e7da4217590d5305feca2c64b3995f605a4a6",
    "0x7d58dc0dc2555831149814dac5557f4fbfa0dc1ee65c97ed0d87cd85a01e45dc",
    "0x56ec01849d303794d4ff53a9f73f24019d6667efcfd5c78e0ec5b1fdbc953049",
    "0x2d6ff5bcd031279eb85abacc6b604fb39e48d559fb0f0b1100197cbec7c0ba83",
    "0x8b70ff7b7e10ab3a7d4d10d1f2e4e32bf00b0d42e9dd95e37c29fb35fbc20bae",
    "0x8c18ea99573501ba4cad134277b3bcca67c3e24ca21d21d6235484ec15b14c3f",
    "5qtRox5iQeGZRwXkkZ5Bs813XGANmSEziFbzQ4yR5mpNiWmCJ3cP7BdR34BPLN3pne2ybYxYRJqUshvQHJ3ub3H9",
    "0x95fe8ba3d794d15829eb675c1eb18e51c5d5d722bcacc7f88c43ad7ec1bfd74a",
    "0x42c04515a7137bd7c80c4c607682876c0111597f3c1abefbeca57a51e55f3ea5",
    "0xb460f92687a3f19b2391a405cebd1fa368ddde03883d8d9be0719c027eca6da8",
  ];
  return TEST_SWAP_IDS[Math.floor(Math.random() * TEST_SWAP_IDS.length)];
  // try {
  //   // Check if the quote is valid
  //   if (!quote) {
  //     throw new Error("Invalid quote");
  //   }

  //   // Native tokens (ETH, AVAX, etc.) don't need approval
  //   const isNativeToken =
  //     !sourceToken ||
  //     sourceToken === "0x0000000000000000000000000000000000000000";

  //   // For non-native tokens, check and approve allowance
  //   if (!isNativeToken) {
  //     const forwarderAddress = addresses.MAYAN_FORWARDER_CONTRACT;
  //     console.log("Mayan Forwarder address:", forwarderAddress);

  //     // Ensure token is approved for spending
  //     await approveTokenSpending(
  //       sourceToken,
  //       amount,
  //       forwarderAddress,
  //       signer,
  //       tokenDecimals,
  //     );
  //   }

  //   console.log("Executing EVM swap...");

  //   // Execute the swap with no permit
  //   const result = await swapFromEvm(
  //     quote,
  //     swapperAddress,
  //     destinationAddress,
  //     referrerAddresses,
  //     signer,
  //     null, // No permit - using traditional approval only
  //     overrides,
  //     payload,
  //   );

  //   // Handle result based on type
  //   if (typeof result === "string") {
  //     // For gasless transactions, result is the order hash
  //     return result;
  //   } else {
  //     // For normal transactions, result is the TransactionResponse object
  //     return result.hash;
  //   }
  // } catch (error) {
  //   console.error("Error executing EVM swap:", error);
  //   throw error;
  // }
}

/**
 * Execute a Solana swap
 */
export async function executeSolanaSwap({
  quote,
  swapperAddress,
  destinationAddress,
  referrerAddresses = null,
  solanaSigner,
  connection,
}: {
  quote: Quote;
  swapperAddress: string;
  destinationAddress: string;
  sourceToken: string;
  amount: string;
  referrerAddresses?: ReferrerAddresses | null;
  solanaSigner: {
    publicKey: string;
    signTransaction: (
      transaction: Transaction | VersionedTransaction,
    ) => Promise<Transaction | VersionedTransaction>;
    signAllTransactions?: (
      transactions: (Transaction | VersionedTransaction)[],
    ) => Promise<(Transaction | VersionedTransaction)[]>;
    signMessage?: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
  };
  connection: Connection;
}): Promise<string> {
  try {
    if (!quote) throw new Error("Invalid quote");

    console.log("Executing Solana swap with address:", swapperAddress);

    // This implements the function with proper overload signatures
    const transactionSigner = function (
      transaction: VersionedTransaction | Transaction,
    ) {
      console.log(
        "About to sign transaction:",
        transaction instanceof Transaction
          ? `Regular transaction with ${transaction.instructions.length} instructions`
          : `Versioned transaction with message version ${transaction.version}`,
      );

      // Log transaction details before signing
      if (transaction instanceof Transaction) {
        console.log("Transaction feePayer:", transaction.feePayer?.toBase58());
        console.log(
          "Transaction recent blockhash:",
          transaction.recentBlockhash,
        );
      }

      // Wrap in try/catch for better error logging
      try {
        return solanaSigner.signTransaction(transaction);
      } catch (error) {
        console.error("Error during transaction signing:", error);
        throw error;
      }
    } as SolanaTransactionSigner;

    const result = await swapFromSolana(
      quote,
      swapperAddress,
      destinationAddress,
      referrerAddresses,
      transactionSigner,
      connection,
    );

    console.log("Swap result:", result);

    return typeof result === "string" ? result : result.signature;
  } catch (error) {
    console.error("Error executing Solana swap:", error);

    // Enhance error logging for simulation failures
    if (
      error instanceof Error &&
      error.message.includes("Transaction simulation failed")
    ) {
      console.error("Simulation failure details:", error);

      // Extract and log any embedded error information
      const errorMatch = error.message.match(/Error: (.*?)(?:,|\n|$)/);
      if (errorMatch && errorMatch[1]) {
        console.error("Specific error:", errorMatch[1]);
      }
    }

    if (
      error instanceof AggregateError &&
      error.errors &&
      error.errors.length > 0
    ) {
      console.error("Detailed error:", JSON.stringify(error.errors[0]));
    }

    throw error;
  }
}

/**
 * Execute a Sui swap
 */
export async function executeSuiSwap({
  quote,
  swapperAddress,
  destinationAddress,
  referrerAddresses = null,
  signTransaction,
}: {
  quote: Quote;
  swapperAddress: string;
  destinationAddress: string;
  referrerAddresses?: {
    solana?: string;
    evm?: string;
    sui?: string;
  } | null;
  signTransaction: (input: {
    transaction: SuiTransaction;
  }) => Promise<SignedTransaction>;
}): Promise<string> {
  try {
    if (!quote) throw new Error("Invalid quote");

    const suiClient = new SuiClient({ url: getFullnodeUrl("mainnet") });

    // Get the transaction block from Mayan SDK
    const txBlock = await createSwapFromSuiMoveCalls(
      quote,
      swapperAddress,
      destinationAddress,
      referrerAddresses,
      null,
      suiClient,
    );
    if (!txBlock) {
      throw new Error(
        "createSwapFromSuiMoveCalls did not return a transaction block.",
      );
    }

    // Set the sender address
    txBlock.setSender(swapperAddress);

    // Configure gas
    const gasPrice = await suiClient.getReferenceGasPrice();
    txBlock.setGasBudget(100000000);
    txBlock.setGasPrice(gasPrice);

    // Build the transaction
    await txBlock.build({ client: suiClient });

    // Use 'transaction' instead of 'transactionBlock' to match Suiet wallet expectation
    const signedTx = await signTransaction({
      transaction: txBlock,
    });

    // Execute the transaction
    const executionResponse = await suiClient.executeTransactionBlock({
      transactionBlock: signedTx.bytes,
      signature: Array.isArray(signedTx.signature)
        ? signedTx.signature
        : [signedTx.signature],
      options: {
        showEffects: true,
        showEvents: true,
      },
      requestType: "WaitForEffectsCert",
    });

    // Rest of the function remains the same
    if (executionResponse.effects?.status?.status === "failure") {
      console.error(
        "Transaction execution failed on-chain:",
        executionResponse.effects.status.error,
      );
      throw new Error(
        `Sui transaction failed: ${executionResponse.effects.status.error}`,
      );
    }

    if (!executionResponse.digest) {
      throw new Error(
        "Transaction processed, but no digest was returned. Check effects.",
      );
    }

    console.log(
      "Sui swap transaction successful. Digest:",
      executionResponse.digest,
    );
    return executionResponse.digest;
  } catch (error) {
    console.error("Error executing Sui swap:", error);
    // Error handling as before
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(String(error));
    }
  }
}
interface GetMayanQuoteParams {
  amount: string;
  sourceToken: Token;
  destinationToken: Token;
  sourceChain: Chain;
  destinationChain: Chain;
  slippageBps?: "auto" | number;
  gasDrop?: number;
  referrer?: string;
  referrerBps?: number;
}

/**
 * Fetches a cross-chain swap quote from Mayan Finance
 * @param params Quote parameters
 * @returns A promise that resolves to an array of Quote objects
 */
export async function getMayanQuote(
  params: GetMayanQuoteParams,
): Promise<Quote[]> {
  const {
    amount,
    sourceToken,
    destinationToken,
    sourceChain,
    destinationChain,
    slippageBps = "auto", // Default to 'auto' instead of 300
    gasDrop,
    referrer,
    referrerBps,
  } = params;

  if (!amount || parseFloat(amount) <= 0) {
    throw new Error("Invalid amount");
  }

  try {
    const quoteParams = {
      amount: parseFloat(amount),
      fromToken: sourceToken.address,
      toToken: destinationToken.address,
      fromChain: sourceChain.mayanName,
      toChain: destinationChain.mayanName,
      slippageBps,
      gasDrop,
      referrer,
      referrerBps,
    };
    console.log("fetching quote with params:");
    console.log(quoteParams);

    const quotes = await fetchQuote({
      amount: parseFloat(amount),
      fromToken: sourceToken.address,
      toToken: destinationToken.address,
      fromChain: sourceChain.mayanName,
      toChain: destinationChain.mayanName,
      slippageBps,
      gasDrop,
      referrer,
      referrerBps,
    });

    console.log("Mayan quotes:", quotes);

    return quotes;
  } catch (error) {
    console.error("Error fetching Mayan quote:", error);
    throw error;
  }
}
