import React, { ReactNode } from "react";
import { SelectChainButton } from "@/components/ui/SelectChainButton";
import { Chain } from "@/types/web3";
import useUIStore from "@/store/uiStore";
import useWeb3Store from "@/store/web3Store";

interface AssetBoxProps {
  title: string;
  children: ReactNode;
  showSettings?: boolean;
  settingsComponent?: ReactNode;
  showChainSelector?: boolean;
  className?: string;
  displayChainName?: boolean;
  availableChains?: Chain[];
  boxType: "source" | "destination";
}

export function AssetBox({
  title,
  children,
  showSettings = false,
  settingsComponent = null,
  showChainSelector = true,
  className = "",
  displayChainName = false,
  availableChains,
  boxType,
}: AssetBoxProps) {
  const setSourceTokenSelectOpen = useUIStore(
    (state) => state.setSourceTokenSelectOpen,
  );
  const setDestinationTokenSelectOpen = useUIStore(
    (state) => state.setDestinationTokenSelectOpen,
  );
  const sourceToken = useWeb3Store((state) => state.sourceToken);
  const destinationToken = useWeb3Store((state) => state.destinationToken);

  const setIsOpen =
    boxType === "source"
      ? setSourceTokenSelectOpen
      : setDestinationTokenSelectOpen;
  const allowClick = boxType === "source" ? sourceToken : destinationToken;

  return (
    <div
      id="asset-box"
      className={`bg-zinc-900 rounded-[6px] pt-[10px] px-[1.5rem] pb-[1.5rem] w-full min-h-[100px] sm:min-h-[120px] md:min-h-[140px] flex flex-col ${
        !allowClick ? "hover:bg-zinc-800/60 cursor-pointer" : ""
      } ${className}`}
      onClick={(e) => {
        // Check if the clicked element or its parents have a "no-click" class
        const target = e.target as Element;
        if (
          (target && target.closest("button, [data-no-click]")) ||
          target.id !== "asset-box"
        ) {
          return;
        }

        // Only allow click if no token is selected
        // debugger;
        if (!allowClick) {
          setIsOpen(true);
        }
        console.log("TokenInputGroup clicked", e.target);
      }}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-zinc-50/50 text-[1.2rem]">{title}</span>
        <div className="flex items-center gap-2 sm:gap-3">
          {showSettings && settingsComponent}
          {showChainSelector && (
            <SelectChainButton
              displayName={displayChainName}
              chainsToShow={availableChains}
              storeType={boxType}
            />
          )}
        </div>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

export default AssetBox;
