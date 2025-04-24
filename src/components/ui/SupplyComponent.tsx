import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/Accordion";
import SupplyOwnedCard from "./SupplyOwnedCard";
import SupplyYourPositionsHeader from "./SupplyYourPositionsHeader";
import SupplyUnOwnedCard from "./SupplyUnownedCard";

const SupplyComponent: React.FC = () => {
  return (
    <div className="w-full space-y-4">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="positions" className="border-0">
          <AccordionTrigger className="p-0 hover:no-underline data-[state=open]:bg-transparent">
            <SupplyYourPositionsHeader />
          </AccordionTrigger>
          <AccordionContent>
            <SupplyOwnedCard />
            <SupplyUnOwnedCard />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default SupplyComponent;
