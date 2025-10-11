import {
  useUserWallets as useDynamicUserWallets,
  Wallet,
} from "@dynamic-labs/sdk-react-core";
import { useSourceChain, useDestinationChain } from "@/store/web3Store";
import { WalletType } from "@/types/web3";

export const useConnectedRequiredWallet = (): boolean => {
  const requiredWalletType = useSourceChain().walletType;
  return useWalletByType(requiredWalletType) !== null;
};

export const useSourceWallet = (): Wallet | null => {
  const requiredWalletType = useSourceChain().walletType;
  return useWalletByType(requiredWalletType);
};

export const useDestinationWallet = (): Wallet | null => {
  const requiredWalletType = useDestinationChain().walletType;
  return useWalletByType(requiredWalletType);
};

export const useWalletByType = (walletType: WalletType): Wallet | null => {
  const userWallets = useDynamicUserWallets();
  if (walletType === WalletType.EVM)
    return userWallets.find((wallet) => wallet.chain === "EVM") || null;
  if (walletType === WalletType.SOLANA)
    return userWallets.find((wallet) => wallet.chain === "SOL") || null;
  if (walletType === WalletType.SUI)
    return userWallets.find((wallet) => wallet.chain === "SUI") || null;
  return null;
};

export const useIsWalletTypeConnected = (walletType: WalletType): boolean => {
  return useWalletByType(walletType) !== null;
};
