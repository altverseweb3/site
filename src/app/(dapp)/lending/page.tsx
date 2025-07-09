"use client";

import BorrowComponent from "@/components/ui/lending/BorrowComponent";
import PoweredByAave from "@/components/ui/lending/PoweredByAave";
import SupplyBorrowMetricsHeaders from "@/components/ui/lending/SupplyBorrowMetricsHeaders";
import SupplyComponent from "@/components/ui/lending/SupplyComponent";
import React, { useState, useEffect } from "react";
import { useSetActiveSwapSection } from "@/store/web3Store";

const BorrowLendComponent: React.FC = () => {
  const [activeTab, setActiveTab] = useState("borrow");
  const setActiveSwapSection = useSetActiveSwapSection();

  useEffect(() => {
    setActiveSwapSection("lend");
  }, [setActiveSwapSection]);

  return (
    <div className="flex h-full w-full items-start justify-center sm:pt-[6vh] pt-[2vh] min-h-[500px]">
      <div className="w-full">
        <SupplyBorrowMetricsHeaders
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
        {activeTab === "supply" ? <SupplyComponent /> : <BorrowComponent />}

        <PoweredByAave />
      </div>
    </div>
  );
};

export default BorrowLendComponent;
