import { UnifiedReserveData } from "@/types/aave";
import { Token } from "@/types/web3";
import { getChainByChainId } from "@/config/chains";
import { getCompositeKey } from "../tokens/tokenMethods";

/*
    Returns either an existing token from the tokensByCompositeKey map or a new token object.
*/
export const getLendingToken = (
  market: UnifiedReserveData,
  tokensByCompositeKey: Record<string, Token>,
): Token => {
  const lowercaseTokenAddress = market.underlyingToken.address.toLowerCase();
  const numericChainId = Number(market.underlyingToken.chainId);
  const chain = getChainByChainId(numericChainId);
  const compositeKey = getCompositeKey(chain.id, lowercaseTokenAddress);
  const matchingToken = tokensByCompositeKey[compositeKey];
  if (matchingToken) {
    return matchingToken;
  }
  const token: Token = {
    id: compositeKey,
    address: lowercaseTokenAddress,
    chainId: numericChainId,
    ticker: market.underlyingToken.symbol,
    name: market.underlyingToken.name,
    decimals: market.underlyingToken.decimals,
    icon: market.underlyingToken.imageUrl,
    stringChainId: chain.id.toString(),
    userBalance: market.userState?.balance.amount.value.toString(),
    userBalanceUsd: market.userState?.balance.usd.toString(),
    customToken: true,
  };
  return token;
};
