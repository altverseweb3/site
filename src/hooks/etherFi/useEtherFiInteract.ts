import { useReownWalletProviderAndSigner } from "@/hooks/useReownWalletProviderAndSigner";
import { approveToken, depositTokens } from "@/utils/etherFi/interact";

/**
 * React hook for etherFi interaction functions with wallet integration
 */
export function useEtherFiInteract() {
  const { getEvmSigner } = useReownWalletProviderAndSigner();

  return {
    approveToken: async (
      tokenSymbol: string,
      vaultId: number,
      amount: string,
    ) => {
      const signer = await getEvmSigner();
      return approveToken(tokenSymbol, vaultId, amount, signer);
    },

    depositTokens: async (
      tokenSymbol: string,
      vaultId: number,
      amount: string,
    ) => {
      const signer = await getEvmSigner();
      return depositTokens(tokenSymbol, vaultId, amount, signer);
    },
  };
}
