// src/utils/tokenMethods.ts
import chains from "@/config/chains";
import { Token } from "@/types/web3";
import { getChainById } from "@/config/chains";
import { FormattedNumberParts } from "@/types/ui";

interface TokenDataItem {
  extract_time: number;
  id: string;
  symbol: string;
  name: string;
  contract_address: string;
  local_image: string;
  metadata: {
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

function normalizeSuiAddressToShort(address: string): string {
  if (!address.startsWith("0x")) return address;

  const parts = address.split("::");
  if (parts.length < 2) return address;

  try {
    const hexValue = BigInt(parts[0]);
    // Convert to short form (removes leading zeros)
    const shortHex = "0x" + hexValue.toString(16);
    return [shortHex, ...parts.slice(1)].join("::");
  } catch (error) {
    console.error("Error converting Sui address to short form:", error);
    return address;
  }
}

export const loadTokensForChain = async (
  fetchChainId: string,
): Promise<Token[]> => {
  try {
    const chainResponse = await fetch(`/tokens/${fetchChainId}/data.json`);

    if (!chainResponse.ok) {
      console.warn(`No token data found for chain ${fetchChainId}`);
      return [];
    }

    const chainConfig = getChainById(fetchChainId);

    if (!chainConfig) {
      console.warn(`Chain config not found for ${fetchChainId}`);
      return [];
    }

    const data: TokenDataItem[] = await chainResponse.json();

    const numericChainId = chainConfig.chainId;
    const isSuiChain = fetchChainId === "sui";
    const chainId = chainConfig.id;
    // load standard ERC20s (and Sui tokens)
    let tokensForChain: Token[] = [];
    tokensForChain = data.map((item) => {
      let contractAddress: string;
      let tokenDecimals: number;
      if (item.contract_address === "native") {
        // Handle native tokens for Solana and EVM (but not Sui)
        if (numericChainId === 101) {
          contractAddress = "11111111111111111111111111111111"; // Solana native
        } else {
          contractAddress = "0x0000000000000000000000000000000000000000"; // EVM native
        }
        tokenDecimals = 18;
      } else {
        // For all other tokens (including Sui tokens and Sui native)
        contractAddress = isSuiChain
          ? normalizeSuiAddressToShort(item.contract_address)
          : item.contract_address;
        tokenDecimals = item.metadata.decimals;
      }

      return {
        id: item.id,
        name: item.name.toLowerCase(),
        ticker: item.symbol.toUpperCase(),
        icon: item.local_image,
        address: contractAddress,
        decimals: tokenDecimals,
        chainId: numericChainId,
        stringChainId: chainId,
        isWalletToken: false,
        isNativeGas: false,
        isNativeWrapped: false,
        isL2Token: false,
      };
    });

    // load native asset (and filter existing native asset if already present)
    const nativeResponse = await fetch(`/tokens/native/data.json`);

    if (!nativeResponse.ok) {
      console.warn(`No native token data found!`);
      return tokensForChain; // Return what we have so far
    }

    const nativeData: TokenDataItem[] = await nativeResponse.json();

    const nativeToken = nativeData
      .filter((item) => item.id === fetchChainId)
      .map((item) => {
        // For Sui, the native token should already be included in the main token data
        // with the actual address, so we might not need to add it separately
        // But if it's here, normalize the address
        let nativeAddress = item.contract_address;
        if (isSuiChain && nativeAddress.startsWith("0x")) {
          nativeAddress = normalizeSuiAddressToShort(nativeAddress);
        }

        return {
          id: item.id,
          name: item.name.toLowerCase(),
          ticker: item.symbol.toUpperCase(),
          icon: item.local_image,
          address: nativeAddress,
          decimals: 18,
          chainId: numericChainId,
          stringChainId: chainId,
          isWalletToken: false,
          isNativeGas: true,
          isNativeWrapped: false,
          isL2Token: false,
        };
      });

    // For Sui, check if native token is already included in the main tokens
    // to avoid duplicates (since Sui native has an actual address, not "native")
    if (isSuiChain && nativeToken.length > 0) {
      const nativeTokenAddress = nativeToken[0].address;
      const alreadyExists = tokensForChain.some(
        (token) => token.address === nativeTokenAddress,
      );

      if (alreadyExists) {
        // Update the existing token to mark it as native
        tokensForChain = tokensForChain.map((token) =>
          token.address === nativeTokenAddress
            ? {
                ...token,
                isNativeGas: true,
                isNativeWrapped: false,
                isL2Token: false,
              }
            : token,
        );
        return tokensForChain;
      }
    }

    return tokensForChain.concat(nativeToken);
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
          const compositeKey = `${token.stringChainId}-${token.address.toLowerCase()}`;

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

export const parseDecimalNumber = (
  value: string | number,
): FormattedNumberParts => {
  const originalValue = value.toString();

  if (!value || isNaN(parseFloat(originalValue))) {
    return {
      hasSubscript: false,
      subscriptCount: 0,
      remainingDigits: originalValue,
      originalValue,
    };
  }

  const num = parseFloat(originalValue);

  // Return empty string for zero values
  if (num === 0) {
    return {
      hasSubscript: false,
      subscriptCount: 0,
      remainingDigits: "",
      originalValue,
    };
  }

  const numStr = num.toString();
  const match = numStr.match(/^0\.0+/);

  if (match) {
    const zeroCount = match[0].length - 2; // Subtract "0."

    // Only use subscript notation if more than 4 zeros
    if (zeroCount > 4) {
      let remainingDigits = numStr.slice(match[0].length);

      // Limit to 2 decimal places for subscripted numbers
      remainingDigits = remainingDigits.slice(0, 2);

      return {
        hasSubscript: true,
        subscriptCount: zeroCount,
        remainingDigits,
        originalValue,
      };
    }
  }

  // For regular numbers, limit to 4 decimal places
  const formattedNum = parseFloat(num.toFixed(4)).toString();

  return {
    hasSubscript: false,
    subscriptCount: 0,
    remainingDigits: formattedNum,
    originalValue,
  };
};

export const getCompositeKey = (
  chainName: string,
  tokenAddress: string,
): string => {
  return `${chains[chainName.toLowerCase()].id || "ethereum"}-${tokenAddress.toLowerCase()}`;
};
