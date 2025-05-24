import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/lending/Accordion";
import SupplyOwnedCard from "./SupplyOwnedCard";
import SupplyYourPositionsHeader from "@/components/ui/lending/SupplyYourPositionsHeader";
import SupplyUnOwnedCard from "./SupplyUnownedCard";
import SupplyAvailablePositionsHeader from "./SupplyAvailablePositionsHeader";
import { ScrollBoxSupplyBorrowAssets } from "./ScrollBoxSupplyBorrowAssets";

const SupplyComponent: React.FC = () => {
  return (
    <div className="w-full space-y-4">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem
          value="positions"
          className="border-[1px] border-[#232326] rounded-md  overflow-hidden"
        >
          <AccordionTrigger className="p-0 hover:no-underline data-[state=open]:bg-transparent hover:bg-[#131313] rounded-t-md">
            <SupplyYourPositionsHeader />
          </AccordionTrigger>
          <AccordionContent>
            <ScrollBoxSupplyBorrowAssets>
              <SupplyOwnedCard />
              <SupplyOwnedCard />
              <SupplyOwnedCard />
              <SupplyOwnedCard />
              <SupplyOwnedCard />
              <SupplyOwnedCard />
              <SupplyOwnedCard />
              <SupplyOwnedCard />
              <SupplyOwnedCard />
              <SupplyOwnedCard />
              <SupplyOwnedCard />
              <SupplyOwnedCard />
              <SupplyOwnedCard />
              <SupplyOwnedCard />
              <SupplyOwnedCard />
              <SupplyOwnedCard />
            </ScrollBoxSupplyBorrowAssets>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem
          value="availablePositions"
          className="border-[1px] border-[#232326] rounded-md  overflow-hidden"
        >
          <AccordionTrigger className="p-0 hover:no-underline data-[state=open]:bg-transparent hover:bg-[#131313] rounded-t-md">
            <SupplyAvailablePositionsHeader />
          </AccordionTrigger>
          <AccordionContent>
            <ScrollBoxSupplyBorrowAssets>
              <SupplyUnOwnedCard />
              <SupplyUnOwnedCard />
              <SupplyUnOwnedCard />
              <SupplyUnOwnedCard />
              <SupplyUnOwnedCard />
              <SupplyUnOwnedCard />
              <SupplyUnOwnedCard />
              <SupplyUnOwnedCard />
              <SupplyUnOwnedCard />
              <SupplyUnOwnedCard />
              <SupplyUnOwnedCard />
              <SupplyUnOwnedCard />
            </ScrollBoxSupplyBorrowAssets>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default SupplyComponent;
