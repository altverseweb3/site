import { useState, useEffect, useCallback, useRef } from "react";
import { SwapTracker } from "@/utils/swapTracker";
import { SwapStatus, SwapTrackingOptions } from "@/types/web3";

export function useSwapTracking(
  swapId: string | null,
  options: SwapTrackingOptions = {},
) {
  const [status, setStatus] = useState<SwapStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hasCompletedRef = useRef(false);
  const trackerRef = useRef<SwapTracker | null>(null);

  // Store latest callbacks in refs to avoid dependency issues
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const startTracking = useCallback(async () => {
    if (!swapId) return;

    console.log("Starting tracking for:", swapId);
    setIsLoading(true);
    setError(null);
    setStatus(null);
    hasCompletedRef.current = false;

    // Clean up previous tracker
    if (trackerRef.current) {
      trackerRef.current.stopPolling();
    }

    const tracker = new SwapTracker(swapId, {
      pollInterval: optionsRef.current.pollInterval,
      maxRetries: optionsRef.current.maxRetries,
      onStatusUpdate: (newStatus: SwapStatus) => {
        setStatus(newStatus);
        optionsRef.current.onStatusUpdate?.(newStatus);
      },
      onComplete: (finalStatus: SwapStatus) => {
        console.log("Tracking completed:", finalStatus.clientStatus);

        // Prevent multiple completion calls
        if (hasCompletedRef.current) {
          console.log("Already completed, ignoring duplicate completion");
          return;
        }

        hasCompletedRef.current = true;
        setIsLoading(false);
        setStatus(finalStatus);

        // Call the original completion callback ONLY ONCE
        optionsRef.current.onComplete?.(finalStatus);
      },
      onError: (err: Error) => {
        console.log("Tracking error:", err.message);

        if (hasCompletedRef.current) {
          console.log("Already completed, ignoring error");
          return;
        }

        hasCompletedRef.current = true;
        setIsLoading(false);
        setError(err);
        optionsRef.current.onError?.(err);
      },
    });

    trackerRef.current = tracker;

    try {
      await tracker.startTracking();
    } catch (err) {
      if (!hasCompletedRef.current) {
        setError(err as Error);
        setIsLoading(false);
        hasCompletedRef.current = true;
      }
    }
  }, [swapId]); // Now only depends on swapId

  const stopTracking = useCallback(() => {
    console.log("Stopping tracking");
    if (trackerRef.current) {
      trackerRef.current.stopPolling();
      trackerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  // Auto-start tracking when swapId changes
  useEffect(() => {
    if (swapId) {
      startTracking();
    } else {
      // Reset state when swapId is cleared
      setStatus(null);
      setError(null);
      hasCompletedRef.current = false;
    }

    return () => {
      stopTracking();
    };
  }, [swapId, startTracking, stopTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (trackerRef.current) {
        trackerRef.current.stopPolling();
      }
    };
  }, []);

  return {
    status,
    isLoading,
    error,
    startTracking,
    stopTracking,
    progress: trackerRef.current?.getProgress(),
  };
}
