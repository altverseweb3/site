"use client";

import {
  useAaveData,
  useAaveHeaderData,
} from "@/components/ui/lending/AaveDataContextHooks";
import BorrowComponent from "@/components/ui/lending/BorrowComponent";
import PoweredByAave from "@/components/ui/lending/PoweredByAave";
import SupplyBorrowMetricsHeaders from "@/components/ui/lending/SupplyBorrowMetricsHeaders";
import SupplyComponent from "@/components/ui/lending/SupplyComponent";

import React, { useState } from "react";

const BorrowLendComponent: React.FC = () => {
  const [activeTab, setActiveTab] = useState("borrow");

  const aaveData = useAaveData();

  const aaveHeaderData = useAaveHeaderData();

  return (
    <div className="flex h-full w-full items-start justify-center sm:pt-[6vh] pt-[2vh] min-h-[500px]">
      <div className="w-full">
        <SupplyBorrowMetricsHeaders
          activeTab={activeTab}
          onTabChange={setActiveTab}
          aaveData={aaveHeaderData}
        />

        {activeTab === "supply" ? (
          <SupplyComponent aaveData={aaveData} />
        ) : (
          <BorrowComponent />
        )}

        <PoweredByAave />
      </div>
    </div>
  );
};

export default BorrowLendComponent;
