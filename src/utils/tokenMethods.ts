// src/utils/tokenMethods.ts
import chains from "@/config/chains";
import { Token } from "@/types/web3";
import { getChainById } from "@/config/chains";
import { FormattedNumberParts } from "@/types/ui";
import { DEPOSIT_ASSETS } from "@/config/etherFi";

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

    // Load standard tokens - filter out native tokens since they're handled separately
    const tokensForChain: Token[] = data
      .filter((item) => item.contract_address !== "native") // Skip native tokens
      .map((item) => {
        // All remaining tokens have real contract addresses
        const contractAddress = isSuiChain
          ? normalizeSuiAddressToShort(item.contract_address)
          : item.contract_address;

        return {
          id: item.id,
          name: item.name.toLowerCase(),
          ticker: item.symbol.toUpperCase(),
          icon: item.local_image,
          address: contractAddress,
          decimals: item.metadata.decimals,
          chainId: numericChainId,
          stringChainId: chainId,
          isWalletToken: false,
          isNativeGas: false,
          isNativeWrapped: false,
          isL2Token: false,
        };
      });

    // Load native assets (gas, wrapped, L2)
    const nativeResponse = await fetch(`/tokens/native/data.json`);

    if (!nativeResponse.ok) {
      console.warn(`No native token data found!`);
      return tokensForChain; // Return what we have so far
    }

    const nativeData = await nativeResponse.json();

    // Find the chain's native token data
    const chainNativeData = nativeData.find(
      (item: TokenDataItem) => item.id === fetchChainId,
    );

    if (!chainNativeData) {
      console.warn(`No native token data found for chain ${fetchChainId}`);
      return tokensForChain;
    }

    const nativeTokens: Token[] = [];

    // Helper function to create a native token
    const createNativeToken = (
      tokenData: TokenDataItem,
      isGas: boolean,
      isWrapped: boolean,
      isL2: boolean,
      suffix: string = "",
    ): Token => {
      let tokenAddress = tokenData.contract_address;

      // Normalize Sui addresses if needed
      if (isSuiChain && tokenAddress.startsWith("0x")) {
        tokenAddress = normalizeSuiAddressToShort(tokenAddress);
      }

      return {
        id: `${chainNativeData.id}${suffix}`,
        name: tokenData.name.toLowerCase(),
        ticker: tokenData.symbol.toUpperCase(),
        icon: tokenData.local_image,
        address: tokenAddress,
        decimals: tokenData.metadata.decimals,
        chainId: numericChainId,
        stringChainId: chainId,
        isWalletToken: false,
        isNativeGas: isGas,
        isNativeWrapped: isWrapped,
        isL2Token: isL2,
      };
    };

    // Add native gas token
    if (chainNativeData.native_gas) {
      nativeTokens.push(
        createNativeToken(
          chainNativeData.native_gas,
          true,
          false,
          false,
          "-gas",
        ),
      );
    }

    // Add native wrapped token
    if (chainNativeData.native_wrapped) {
      nativeTokens.push(
        createNativeToken(
          chainNativeData.native_wrapped,
          false,
          true,
          false,
          "-wrapped",
        ),
      );
    }

    // Add L2 token
    if (chainNativeData.l_two_token) {
      nativeTokens.push(
        createNativeToken(
          chainNativeData.l_two_token,
          false,
          false,
          true,
          "-l2",
        ),
      );
    }

    // Handle potential duplicates (especially for Sui)
    nativeTokens.forEach((nativeToken) => {
      const existingTokenIndex = tokensForChain.findIndex(
        (token) =>
          token.address.toLowerCase() === nativeToken.address.toLowerCase(),
      );

      if (existingTokenIndex !== -1) {
        // Update the existing token with the native flags
        tokensForChain[existingTokenIndex] = {
          ...tokensForChain[existingTokenIndex],
          isNativeGas: nativeToken.isNativeGas,
          isNativeWrapped: nativeToken.isNativeWrapped,
          isL2Token: nativeToken.isL2Token,
        };
      } else {
        // Add the native token
        tokensForChain.push(nativeToken);
      }
    });
    // Add deposit assets for this chain (can overwrite non-native tokens)
    const depositAssetsForChain = Object.entries(DEPOSIT_ASSETS)
      .filter(([, asset]) => asset.chain === fetchChainId)
      .filter(([, asset]) => {
        // Find existing token with same address
        const existingToken = tokensForChain.find(
          (token) =>
            token.address.toLowerCase() === asset.contractAddress.toLowerCase(),
        );

        // Skip if existing token is a native gas, wrapped, or L2 token
        if (
          existingToken &&
          (existingToken.isNativeGas ||
            existingToken.isNativeWrapped ||
            existingToken.isL2Token)
        ) {
          return false;
        }

        // Allow if no existing token, or existing token is a regular token
        return true;
      })
      .map(([key, asset]) => {
        // Create deposit asset token
        return {
          id: key,
          name: key.toLowerCase(),
          ticker: key.toUpperCase(),
          icon: asset.imagePath,
          address: asset.contractAddress,
          decimals: asset.decimals,
          chainId: numericChainId,
          stringChainId: chainId,
          isWalletToken: false,
          isNativeGas: false,
          isNativeWrapped: false,
          isL2Token: false,
          customToken: true, // Flag to indicate this is a special deposit asset
        };
      });

    // Merge deposit assets, replacing non-native tokens
    depositAssetsForChain.forEach((depositAsset) => {
      const existingIndex = tokensForChain.findIndex(
        (token) =>
          token.address.toLowerCase() === depositAsset.address.toLowerCase(),
      );

      if (existingIndex !== -1) {
        // Replace the existing non-native token
        tokensForChain[existingIndex] = depositAsset;
      } else {
        // Add the new deposit asset
        tokensForChain.push(depositAsset);
      }
    });
    return tokensForChain;
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
