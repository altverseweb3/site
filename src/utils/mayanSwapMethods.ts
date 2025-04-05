import { fetchQuote, Quote } from "@mayanfinance/swap-sdk";
import { Token, Chain } from "@/types/web3";

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
