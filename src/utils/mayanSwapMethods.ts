import {
  fetchQuote,
  Quote,
  swapFromEvm,
  addresses,
} from "@mayanfinance/swap-sdk";
import { Token, Chain } from "@/types/web3";
import { ethers, Overrides, JsonRpcSigner } from "ethers";

interface ReferrerAddresses {
  evm?: string;
  solana?: string;
}

/**
 * Approve token spending if needed
 * @returns A promise that resolves to true when the approval is successful
 */
export async function approveTokenSpending(
  tokenAddress: string,
  amount: string,
  spenderAddress: string,
  signer: JsonRpcSigner,
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
  try {
    // Check if the quote is valid
    if (!quote) {
      throw new Error("Invalid quote");
    }

    // Native tokens (ETH, AVAX, etc.) don't need approval
    const isNativeToken =
      !sourceToken ||
      sourceToken === "0x0000000000000000000000000000000000000000";

    // For non-native tokens, check and approve allowance
    if (!isNativeToken) {
      const forwarderAddress = addresses.MAYAN_FORWARDER_CONTRACT;
      console.log("Mayan Forwarder address:", forwarderAddress);

      // Ensure token is approved for spending
      await approveTokenSpending(
        sourceToken,
        amount,
        forwarderAddress,
        signer,
        tokenDecimals,
      );
    }

    console.log("Executing swap...");

    // Execute the swap with no permit
    const result = await swapFromEvm(
      quote,
      swapperAddress,
      destinationAddress,
      referrerAddresses,
      signer,
      null, // No permit - using traditional approval only
      overrides,
      payload,
    );

    // Handle result based on type
    if (typeof result === "string") {
      // For gasless transactions, result is the order hash
      return result;
    } else {
      // For normal transactions, result is the TransactionResponse object
      return result.hash;
    }
  } catch (error) {
    console.error("Error executing EVM swap:", error);
    throw error;
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

interface ReferrerAddresses {
  evm?: string;
  solana?: string;
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
