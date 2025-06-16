import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { VaultDepositStoreState, VaultDepositProcess } from "@/types/earn";

const useVaultDepositStore = create<VaultDepositStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      processes: {},
      activeProcessId: null,
      isModalOpen: false,
      selectedVault: null,

      // Create new deposit process
      createProcess: (config) => {
        const processId = `vault-deposit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

        const process: VaultDepositProcess = {
          id: processId,
          state: "IDLE",
          type: config.type,
          userAddress: config.userAddress,
          vault: config.vault,
          targetAsset: config.targetAsset,
          depositAmount: config.depositAmount,
          createdAt: now,
          updatedAt: now,
          expiresAt,
          retryCount: 0,

          // Add swap details if cross-chain
          ...(config.type === "CROSS_CHAIN" && {
            sourceChain: config.sourceChain,
            sourceToken: config.sourceToken,
            sourceAmount: config.sourceAmount,
          }),
        };

        set((state) => ({
          processes: {
            ...state.processes,
            [processId]: process,
          },
          activeProcessId: processId,
        }));

        return processId;
      },

      // Update process state with optional data
      updateProcessState: (processId, newState, data = {}) => {
        set((state) => {
          const process = state.processes[processId];
          if (!process) return state;

          return {
            processes: {
              ...state.processes,
              [processId]: {
                ...process,
                ...data,
                state: newState,
                updatedAt: new Date(),
              },
            },
          };
        });
      },

      // Update process data without changing state
      updateProcessData: (processId, data) => {
        set((state) => {
          const process = state.processes[processId];
          if (!process) return state;

          return {
            processes: {
              ...state.processes,
              [processId]: {
                ...process,
                ...data,
                updatedAt: new Date(),
              },
            },
          };
        });
      },

      // Cancel process (transitions to CANCELLED state)
      cancelProcess: (processId) => {
        get().updateProcessState(processId, "CANCELLED", {
          errorMessage: "Process cancelled by user",
        });
      },

      // Completely remove process from store
      deleteProcess: (processId) => {
        set((state) => {
          const newProcesses = { ...state.processes };
          delete newProcesses[processId];
          return {
            processes: newProcesses,
            activeProcessId:
              state.activeProcessId === processId
                ? null
                : state.activeProcessId,
          };
        });
      },

      // Set active process for UI
      setActiveProcess: (processId) => {
        set({ activeProcessId: processId });
      },

      // Step 1 (Swap) actions
      startSwapStep: (processId, swapTrackingId) => {
        get().updateProcessState(processId, "STEP_1_PENDING", {
          swapTrackingId,
        });
      },

      completeSwapStep: (processId, swapResult) => {
        get().updateProcessState(processId, "STEP_1_COMPLETE", {
          swapTransactionHash: swapResult.transactionHash,
          actualTargetAmount: swapResult.actualAmount,
          swapCompletedAt: swapResult.completedAt,
        });
      },

      failSwapStep: (processId, error) => {
        get().updateProcessState(processId, "FAILED", {
          errorMessage: `Swap failed: ${error}`,
          retryCount: (get().processes[processId]?.retryCount || 0) + 1,
        });
      },

      // Step 2 (Deposit) actions
      startDepositStep: (processId) => {
        get().updateProcessState(processId, "STEP_2_PENDING");
      },

      completeDepositStep: (processId, depositResult) => {
        get().updateProcessState(processId, "COMPLETED", {
          depositTransactionHash: depositResult.transactionHash,
          vaultShares: depositResult.vaultShares,
          depositCompletedAt: depositResult.completedAt,
        });
      },

      failDepositStep: (processId, error) => {
        get().updateProcessState(processId, "FAILED", {
          errorMessage: `Deposit failed: ${error}`,
          retryCount: (get().processes[processId]?.retryCount || 0) + 1,
        });
      },

      // UI actions
      openModal: (vault) => {
        set({
          isModalOpen: true,
          selectedVault: vault,
        });
      },

      closeModal: () => {
        set({
          isModalOpen: false,
          selectedVault: null,
          // Keep activeProcessId for potential resume
        });
      },

      // Recovery and cleanup
      recoverActiveProcesses: () => {
        const { processes } = get();
        const now = new Date();

        // Check each process for recovery opportunities
        Object.values(processes).forEach((process) => {
          // Skip expired processes
          if (now > process.expiresAt) return;

          // TODO: Add on-chain verification logic here
          // For now, we'll just log recovery attempts
          if (
            process.state === "STEP_1_PENDING" ||
            process.state === "STEP_2_PENDING"
          ) {
            console.log(
              `Recovering process ${process.id} in state ${process.state}`,
            );
            // Would verify transaction status on-chain and update accordingly
          }
        });
      },

      cleanupExpiredProcesses: () => {
        const { processes } = get();
        const now = new Date();
        const validProcesses: Record<string, VaultDepositProcess> = {};

        Object.entries(processes).forEach(([id, process]) => {
          if (now <= process.expiresAt) {
            validProcesses[id] = process;
          } else {
            console.log(`Cleaning up expired process ${id}`);
          }
        });

        set({ processes: validProcesses });
      },

      // Helper queries
      getProcessesByUser: (userAddress) => {
        const { processes } = get();
        return Object.values(processes).filter(
          (process) =>
            process.userAddress.toLowerCase() === userAddress.toLowerCase(),
        );
      },

      getActiveProcessForVault: (vaultId, userAddress) => {
        const { processes } = get();
        return (
          Object.values(processes).find(
            (process) =>
              String(process.vault.id) === String(vaultId) &&
              process.userAddress.toLowerCase() === userAddress.toLowerCase() &&
              (process.state === "STEP_1_PENDING" ||
                process.state === "STEP_1_COMPLETE" ||
                process.state === "STEP_2_PENDING"),
          ) || null
        );
      },

      // Integration with swap tracking
      onSwapTrackingComplete: (swapStatus, processId) => {
        const process = get().processes[processId];
        if (!process) return;

        if (swapStatus.status === "COMPLETED") {
          get().completeSwapStep(processId, {
            transactionHash: swapStatus.txs?.[0]?.txHash || "",
            actualAmount:
              swapStatus.toAmount || process.actualTargetAmount || "0",
            completedAt: new Date(swapStatus.completedAt || Date.now()),
          });
        } else if (
          swapStatus.status === "FAILED" ||
          swapStatus.status === "REFUNDED"
        ) {
          get().failSwapStep(
            processId,
            `Swap ${swapStatus.status.toLowerCase()}`,
          );
        }
      },

      // Progress calculation
      getProcessProgress: (processId) => {
        const process = get().processes[processId];
        if (!process)
          return { current: 0, total: 2, description: "Process not found" };

        const totalSteps = process.type === "DIRECT" ? 1 : 2;

        switch (process.state) {
          case "IDLE":
            return {
              current: 0,
              total: totalSteps,
              description: "Ready to start",
            };
          case "STEP_1_PENDING":
            return {
              current: 0,
              total: totalSteps,
              description: "Swapping tokens...",
            };
          case "STEP_1_COMPLETE":
            return {
              current: 1,
              total: totalSteps,
              description: "Swap complete, ready to deposit",
            };
          case "STEP_2_PENDING":
            return {
              current: 1,
              total: totalSteps,
              description: "Depositing to vault...",
            };
          case "COMPLETED":
            return {
              current: totalSteps,
              total: totalSteps,
              description: "Deposit completed successfully",
            };
          case "CANCELLED":
            return {
              current: 1,
              total: totalSteps,
              description: "Process cancelled",
            };
          case "FAILED":
            return {
              current: 0,
              total: totalSteps,
              description: process.errorMessage || "Process failed",
            };
          default:
            return {
              current: 0,
              total: totalSteps,
              description: "Unknown state",
            };
        }
      },
    }),
    {
      name: "altverse-vault-deposits",
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          return {
            getItem: () => Promise.resolve(null),
            setItem: () => Promise.resolve(),
            removeItem: () => Promise.resolve(),
          };
        }
        return localStorage;
      }),
      partialize: (state) => ({
        // Persist processes and active process ID for recovery
        processes: state.processes,
        activeProcessId: state.activeProcessId,
        // Don't persist UI state (modal) to avoid hydration issues
      }),
      onRehydrateStorage: () => {
        return (state) => {
          // Auto-cleanup expired processes on app load
          if (state) {
            state.cleanupExpiredProcesses();
            // Attempt to recover active processes
            state.recoverActiveProcesses();
          }
        };
      },
    },
  ),
);

// Custom hooks for easier usage
export const useVaultDepositProcess = (processId: string | null) => {
  return useVaultDepositStore((state) =>
    processId ? state.processes[processId] || null : null,
  );
};

export const useActiveVaultDepositProcess = () => {
  return useVaultDepositStore((state) =>
    state.activeProcessId
      ? state.processes[state.activeProcessId] || null
      : null,
  );
};

export const useVaultDepositModal = () => {
  return useVaultDepositStore((state) => ({
    isOpen: state.isModalOpen,
    vault: state.selectedVault,
    openModal: state.openModal,
    closeModal: state.closeModal,
  }));
};

export const useUserVaultDeposits = (userAddress: string) => {
  return useVaultDepositStore((state) => state.getProcessesByUser(userAddress));
};

export default useVaultDepositStore;
