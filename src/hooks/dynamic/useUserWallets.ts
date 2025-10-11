import {
  useUserWallets as useDynamicUserWallets,
  Wallet,
} from "@dynamic-labs/sdk-react-core";
import { useSourceChain, useDestinationChain } from "@/store/web3Store";
import { WalletType } from "@/types/web3";

export const useConnectedRequiredWallet = (): boolean => {
  const userWallets = useDynamicUserWallets();
  const requiredWalletType = useSourceChain().walletType;
  if (
    requiredWalletType === WalletType.EVM &&
    userWallets.some((wallet) => wallet.chain === "EVM")
  )
    return true;
  if (
    requiredWalletType === WalletType.SOLANA &&
    userWallets.some((wallet) => wallet.chain === "SOL")
  )
    return true;
  if (
    requiredWalletType === WalletType.SUI &&
    userWallets.some((wallet) => wallet.chain === "SUI")
  )
    return true;
  return false;
};

export const useSourceWallet = (): Wallet | null => {
  const userWallets = useDynamicUserWallets();
  const requiredWalletType = useSourceChain().walletType;
  if (requiredWalletType === WalletType.EVM)
    return userWallets.find((wallet) => wallet.chain === "EVM") || null;
  if (
    requiredWalletType === WalletType.SOLANA &&
    userWallets.some((wallet) => wallet.chain === "SOL")
  )
    return userWallets.find((wallet) => wallet.chain === "SOL") || null;
  if (
    requiredWalletType === WalletType.SUI &&
    userWallets.some((wallet) => wallet.chain === "SUI")
  )
    return userWallets.find((wallet) => wallet.chain === "SUI") || null;
  return null;
};

export const useDestinationWallet = (): Wallet | null => {
  const userWallets = useDynamicUserWallets();
  const requiredWalletType = useDestinationChain().walletType;
  if (requiredWalletType === WalletType.EVM)
    return userWallets.find((wallet) => wallet.chain === "EVM") || null;

  if (
    requiredWalletType === WalletType.SOLANA &&
    userWallets.some((wallet) => wallet.chain === "SOL")
  )
    return userWallets.find((wallet) => wallet.chain === "SOL") || null;

  if (
    requiredWalletType === WalletType.SUI &&
    userWallets.some((wallet) => wallet.chain === "SUI")
  )
    return userWallets.find((wallet) => wallet.chain === "SUI") || null;

  return null;
};
