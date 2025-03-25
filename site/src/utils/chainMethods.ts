import { Chain, chains } from "@/config/chains";
import useWeb3Store from "@/store/web3Store";

/**
 * Handles chain selection for source or destination chains
 * Ensures no duplicate chains are selected
 * @param chain The chain being selected
 * @param type Either "source" or "destination"
 */
export function handleChainChange(
  chain: Chain,
  type: "source" | "destination",
): void {
  const store = useWeb3Store.getState();
  const isSource = type === "source";

  // Get current chains
  const sourceChain = store.sourceChain;
  const destinationChain = store.destinationChain;

  // Get the appropriate setters
  const setSourceChain = store.setSourceChain;
  const setDestinationChain = store.setDestinationChain;

  // Determine which chains we're working with
  const oppositeChain = isSource ? destinationChain : sourceChain;
  const setCurrentChain = isSource ? setSourceChain : setDestinationChain;
  const setOppositeChain = isSource ? setDestinationChain : setSourceChain;

  // Log the change
  console.log(
    `${isSource ? "Source" : "Destination"} chain changed to:`,
    chain.name,
  );

  // Update the current chain
  setCurrentChain(chain);

  // If same chain selected, find a different one for the opposite side
  if (chain.id === oppositeChain.id) {
    const differentChain = Object.values(chains).find((c) => c.id !== chain.id);
    if (differentChain) {
      setOppositeChain(differentChain);
    }
  }
}

/**
 * Swap source and destination chains
 */
export function swapChains(): void {
  const store = useWeb3Store.getState();
  store.swapChains();
}

/**
 * Format a chain pair for display
 * @param sourceChain The source chain
 * @param destinationChain The destination chain
 * @returns Formatted string like "Ethereum → Polygon"
 */
export function formatChainRoute(
  sourceChain: Chain,
  destinationChain: Chain,
): string {
  return `${sourceChain.name} → ${destinationChain.name}`;
}

/**
 * Get a different chain from the one provided
 * Useful for ensuring source and destination are different
 * @param currentChain The chain to avoid
 * @returns A different chain
 */
export function getDifferentChain(currentChain: Chain): Chain | undefined {
  return Object.values(chains).find((c) => c.id !== currentChain.id);
}
