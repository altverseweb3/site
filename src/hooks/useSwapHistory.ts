import { useState, useCallback } from 'react';
import { MayanSwapService } from '@/utils/swap/swapHistory';
import useWeb3Store, { useExtractUserWallets, useConnectedWalletSummary } from '@/store/web3Store';
import { SwapQueryResult, SwapData, UserWallets, WalletInfo} from '@/types/web3';

interface SwapHistoryState {
  isLoading: boolean;
  data: SwapQueryResult[];
  allSwaps: SwapData[];
  error: string | null;
  summary: {
    totalQueries: number;
    successfulQueries: number;
    totalSwaps: number;
    swapsByChain: Record<'EVM' | 'SOL' | 'SUI', number>;
  } | null;
}

interface UseSwapHistoryReturn extends SwapHistoryState {
  fetchSwapHistory: () => Promise<void>;
  clearHistory: () => void;
  walletSummary: {
    hasEVM: boolean;
    hasSolana: boolean;
    hasSUI: boolean;
    totalConnected: number;
    walletsByType: Record<string, string>;
  };
}

export const useSwapHistory = (): UseSwapHistoryReturn => {
  const { connectedWallets } = useWeb3Store();
  
  const [state, setState] = useState<SwapHistoryState>({
    isLoading: false,
    data: [],
    allSwaps: [],
    error: null,
    summary: null,
  });

  const walletSummary = useConnectedWalletSummary(connectedWallets);

  const clearHistory = useCallback(() => {
    setState({
      isLoading: false,
      data: [],
      allSwaps: [],
      error: null,
      summary: null,
    });
  }, []);

  const fetchSwapHistory = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Extract wallet addresses from store
      const userWallets = useExtractUserWallets(connectedWallets);

      console.log('Connected Wallets Summary:', walletSummary);
      console.log('Querying swap history for wallets:', userWallets);

      // Check if any wallets are connected
      if (connectedWallets.length === 0) {
        throw new Error('No wallets connected');
      }

      // Check if we have at least one valid address
      const hasValidAddress = Object.values(userWallets).some(address => address);
      if (!hasValidAddress) {
        throw new Error('No valid wallet addresses found');
      }

      // Fetch swap history
        const mayanSwapService = new MayanSwapService();
      const result = await mayanSwapService.getSwapsForUserWallets(userWallets);
      
      // Flatten all swaps from all results
      const allSwaps = result.results.flatMap(r => r.response.data);
      
      // Sort by initiation date (most recent first)
      allSwaps.sort((a, b) => new Date(b.initiatedAt).getTime() - new Date(a.initiatedAt).getTime());

      setState({
        isLoading: false,
        data: result.results,
        allSwaps,
        error: null,
        summary: result.summary,
      });

      console.log('✅ Swap history successfully loaded:', {
        connectedWallets: connectedWallets.length,
        totalQueries: result.summary.totalQueries,
        totalSwaps: allSwaps.length,
        swapsByChain: result.summary.swapsByChain,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch swap history';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      console.error('❌ Error fetching swap history:', error);
    }
  }, [connectedWallets, walletSummary]);

  return {
    ...state,
    fetchSwapHistory,
    clearHistory,
    walletSummary,
  };
};