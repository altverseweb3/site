import { WalletType, WalletOption } from "@/types/web3";
import { EthereumIcon, SolanaIcon, SuiIcon } from "@dynamic-labs/iconic";

export const walletOptions: WalletOption[] = [
  {
    value: "all",
    label: "all wallets",
    icons: [
      <EthereumIcon key="ethereum" />,
      <SolanaIcon key="solana" />,
      <SuiIcon key="sui" />,
    ],
  },
  {
    value: "evm",
    label: "evm",
    icon: <EthereumIcon />,
    walletType: WalletType.EVM,
  },
  {
    value: "solana",
    label: "solana",
    icon: <SolanaIcon />,
    walletType: WalletType.SOLANA,
  },
  {
    value: "sui",
    label: "sui",
    icon: <SuiIcon />,
    walletType: WalletType.SUI,
  },
];
