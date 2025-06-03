"use client";

import {
  useAaveData,
  useTransformedAaveData,
} from "@/components/ui/lending/AaveDataContextHooks";
import BorrowComponent from "@/components/ui/lending/BorrowComponent";
import PoweredByAave from "@/components/ui/lending/PoweredByAave";
import SupplyBorrowMetricsHeaders from "@/components/ui/lending/SupplyBorrowMetricsHeaders";
import SupplyComponent from "@/components/ui/lending/SupplyComponent";

import React, { useState } from "react";

const BorrowLendComponent: React.FC = () => {
  const [activeTab, setActiveTab] = useState("borrow");

  // Get original Aave data for SupplyComponent
  const aaveData = useAaveData();

  // Get transformed data for SupplyBorrowMetricsHeaders
  const transformedAaveData = useTransformedAaveData();

  return (
    <div className="flex h-full w-full items-start justify-center sm:pt-[6vh] pt-[2vh] min-h-[500px]">
      <div className="w-full">
        <SupplyBorrowMetricsHeaders
          activeTab={activeTab}
          onTabChange={setActiveTab}
          aaveData={transformedAaveData}
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
