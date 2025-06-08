export interface EarnTableRow {
  id: string | number;
  protocol: string;
  protocolIcon: string;
  marketVault: string;
  marketVaultIcon: string;
  assets: string[];
  assetIcons: string[];
  supportedChains: string[];
  supportedChainIcons: string[];
  tvl: number;
  apy: number;
  details?: unknown;
}

export interface DashboardTableRow {
  id: string | number;
  protocol: string;
  protocolIcon: string;
  marketVault: string;
  marketVaultIcon: string;
  assets: string[];
  assetIcons: string[];
  supportedChains: string[];
  supportedChainIcons: string[];
  position: string;
  balance: number;
  balanceUsd: number;
  apy: number;
  details?: unknown;
}

export type EarnTableType = "earn" | "dashboard";

export interface EarnFilters {
  chains: string[];
  protocols: string[];
  assetFilter: string;
}

export interface ProtocolOption {
  id: string;
  name: string;
  icon: string;
  checked: boolean;
  disabled?: boolean;
}
