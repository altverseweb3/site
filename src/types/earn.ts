import { Token, Chain, SwapStatus } from "@/types/web3";
import { EtherFiVault } from "@/config/etherFi";

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

// Process state machine
export type VaultDepositState =
  | "IDLE"
  | "STEP_1_PENDING" // Swap transaction submitted, waiting for completion
  | "STEP_1_COMPLETE" // Swap completed, user has target tokens, ready for deposit
  | "STEP_2_PENDING" // Vault deposit transaction submitted
  | "COMPLETED" // Both steps complete, funds in vault
  | "CANCELLED" // User cancelled after step 1
  | "FAILED"; // Process failed at any step

// Process type - direct deposit vs cross-chain swap
export type VaultDepositType = "DIRECT" | "CROSS_CHAIN";

// Individual vault deposit process
export interface VaultDepositProcess {
  id: string; // Unique process identifier
  state: VaultDepositState; // Current state from state machine
  type: VaultDepositType; // Direct deposit or cross-chain swap
  userAddress: string; // User's wallet address

  // Vault details
  vault: EtherFiVault; // Target vault information
  targetAsset: string; // Final asset for vault (e.g., "wETH")

  // Step 1 (Swap) - only for CROSS_CHAIN type
  sourceChain?: Chain; // Origin chain for swap
  sourceToken?: Token; // Origin token
  sourceAmount?: string; // Original input amount
  swapTransactionHash?: string; // Swap transaction hash
  swapCompletedAt?: Date; // When swap completed
  swapTrackingId?: string; // For integration with useSwapTracking
  actualTargetAmount?: string; // Actual amount received from swap

  // Step 2 (Deposit) - for both types
  depositAmount: string; // Amount to deposit into vault
  depositTransactionHash?: string; // Vault deposit transaction hash
  depositCompletedAt?: Date; // When deposit completed
  vaultShares?: string; // Vault tokens received

  // Process metadata
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date; // Auto-cleanup after 24 hours

  // Error handling
  errorMessage?: string; // Last error message
  retryCount?: number; // Number of retry attempts
}

// Store state interface
export interface VaultDepositStoreState {
  // Process management
  processes: Record<string, VaultDepositProcess>;
  activeProcessId: string | null; // Currently active process in UI

  // UI state
  isModalOpen: boolean;
  selectedVault: EtherFiVault | null;

  // Actions
  createProcess: (config: {
    userAddress: string;
    vault: EtherFiVault;
    type: VaultDepositType;
    targetAsset: string;
    depositAmount: string;
    sourceChain?: Chain;
    sourceToken?: Token;
    sourceAmount?: string;
  }) => string;

  updateProcessState: (
    processId: string,
    state: VaultDepositState,
    data?: Partial<VaultDepositProcess>,
  ) => void;
  updateProcessData: (
    processId: string,
    data: Partial<VaultDepositProcess>,
  ) => void;
  cancelProcess: (processId: string) => void;
  deleteProcess: (processId: string) => void;
  setActiveProcess: (processId: string | null) => void;

  // Step 1 (Swap) actions
  startSwapStep: (processId: string, swapTrackingId: string) => void;
  completeSwapStep: (
    processId: string,
    swapResult: {
      transactionHash: string;
      actualAmount: string;
      completedAt: Date;
    },
  ) => void;
  failSwapStep: (processId: string, error: string) => void;

  // Step 2 (Deposit) actions
  startDepositStep: (processId: string) => void;
  completeDepositStep: (
    processId: string,
    depositResult: {
      transactionHash: string;
      vaultShares: string;
      completedAt: Date;
    },
  ) => void;
  failDepositStep: (processId: string, error: string) => void;

  // UI actions
  openModal: (vault: EtherFiVault) => void;
  closeModal: () => void;

  // Recovery and cleanup
  recoverActiveProcesses: () => void;
  cleanupExpiredProcesses: () => void;
  getProcessesByUser: (userAddress: string) => VaultDepositProcess[];
  getActiveProcessForVault: (
    vaultId: string,
    userAddress: string,
  ) => VaultDepositProcess | null;

  // Integration helpers
  onSwapTrackingComplete: (swapStatus: SwapStatus, processId: string) => void;
  getProcessProgress: (processId: string) => {
    current: number;
    total: number;
    description: string;
  };
}
