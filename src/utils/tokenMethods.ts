// src/utils/tokenMethods.ts
import chains from "@/config/chains";
import { Token } from "@/types/web3";
import { getChainById } from "@/config/chains";

interface TokenDataItem {
  extract_time: number;
  id: string;
  symbol: string;
  name: string;
  contract_address: string;
  local_image: string;
  alchemy_metadata: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface StructuredTokenData {
  byCompositeKey: Record<string, Token>;
  byChainId: Record<number, Token[]>;
  byChainIdAndAddress: Record<number, Record<string, Token>>;
  allTokensList: Token[];
}

export const loadTokensForChain = async (
  fetchChainId: string,
): Promise<Token[]> => {
  try {
    const response = await fetch(`/tokens/${fetchChainId}/data.json`);

    if (!response.ok) {
      console.warn(`No token data found for chain ${fetchChainId}`);
      return [];
    }

    const chainConfig = getChainById(fetchChainId);

    if (!chainConfig) {
      console.warn(`Chain config not found for ${fetchChainId}`);
      return [];
    }

    const data: TokenDataItem[] = await response.json();

    const numericChainId = chainConfig.chainId;

    return data
      .filter((item) => item.contract_address !== "native")
      .map((item) => {
        return {
          id: item.id,
          name: item.name.toLowerCase(),
          ticker: item.symbol.toUpperCase(),
          icon: item.local_image,
          address: item.contract_address,
          decimals: item.alchemy_metadata.decimals,
          chainId: numericChainId,
          isWalletToken: false,
        };
      });
  } catch (error) {
    console.error(`Error loading tokens for chain ${fetchChainId}:`, error);
    return [];
  }
};

export const loadAllTokens = async (): Promise<StructuredTokenData> => {
  const tokensByCompositeKey: Record<string, Token> = {};
  const tokensByChainId: Record<number, Token[]> = {};
  const tokensByChainIdAndAddress: Record<number, Record<string, Token>> = {};
  const allTokensList: Token[] = [];

  const fetchChainIds = Object.values(chains).map((chain) => chain.id);

  await Promise.all(
    fetchChainIds.map(async (fetchChainId) => {
      const chainTokens = await loadTokensForChain(fetchChainId);

      if (chainTokens.length > 0) {
        const numericChainId = chainTokens[0].chainId;

        if (!tokensByChainId[numericChainId]) {
          tokensByChainId[numericChainId] = [];
        }
        if (!tokensByChainIdAndAddress[numericChainId]) {
          tokensByChainIdAndAddress[numericChainId] = {};
        }

        chainTokens.forEach((token) => {
          const compositeKey = `${token.chainId}-${token.address.toLowerCase()}`;

          tokensByCompositeKey[compositeKey] = token;

          tokensByChainId[numericChainId].push(token);

          tokensByChainIdAndAddress[numericChainId][
            token.address.toLowerCase()
          ] = token;

          allTokensList.push(token);
        });
      }
    }),
  );

  return {
    byCompositeKey: tokensByCompositeKey,
    byChainId: tokensByChainId,
    byChainIdAndAddress: tokensByChainIdAndAddress,
    allTokensList: allTokensList,
  };
};
