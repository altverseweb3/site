"use client";

import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/AlertDialog";
import Terms from "@/components/ui/Terms";

interface DisclaimerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
  onDeny?: () => void;
}

const Disclaimer: React.FC<DisclaimerProps> = ({
  open,
  onOpenChange,
  onAccept,
  onDeny,
}) => {
  const handleContinue = () => {
    onAccept();
  };

  const handleCancel = () => {
    if (onDeny) {
      onDeny();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="w-[calc(100%-1rem)] sm:w-full sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="mb-2 text-xl text-left">
            important disclaimer
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base space-y-3 text-justify">
            by continuing, you acknowledge that you understand and accept the
            risks of interacting with blockchain protocols through altverse. you
            are solely responsible for your wallet security, on-chain
            transactions, and for reviewing and complying with the terms of any
            third-party protocols you choose to access (for example, aave or
            etherFi). please review our{" "}
            <Terms>
              <span className="cursor-pointer text-amber-500 hover:text-amber-400">
                terms&nbsp;of&nbsp;service
              </span>
            </Terms>{" "}
            before proceeding.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col-reverse gap-1 sm:flex-row sm:justify-end sm:space-x-2 sm:gap-0">
          <AlertDialogCancel
            className="border-[1px] rounded-lg leading-zero text-lg"
            onClick={handleCancel}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-amber-500/25 hover:bg-amber-500/50 hover:text-amber-400 text-amber-500 border-[#61410B] border-[1px] rounded-lg leading-zero text-lg"
            onClick={handleContinue}
          >
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default Disclaimer;
