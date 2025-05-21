import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/lending/Accordion";

const BorrowComponent: React.FC = () => {
  return (
    <div className="w-full space-y-4">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger>your borrow positions</AccordionTrigger>
          <AccordionContent>discover your positions</AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default BorrowComponent;
