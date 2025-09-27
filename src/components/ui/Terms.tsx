"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/StyledDialog";
import BrandedButton from "@/components/ui/BrandedButton";

interface ToSProps {
  children: React.ReactNode;
}

const ToS: React.FC<ToSProps> = ({ children }) => {
  const [open, setOpen] = React.useState(false);

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden bg-[#18181B] border border-[#27272A] text-white flex flex-col">
        <DialogHeader className="border-b border-[#27272A] pb-4 flex-shrink-0">
          <DialogTitle className="text-xl font-semibold text-[#FAFAFA] text-left ml-2">
            terms of service
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose prose-invert max-w-none text-sm leading-relaxed">
            <h2 className="text-lg font-semibold text-[#FAFAFA] mb-4">
              altverse - terms of service
            </h2>

            <p className="text-[#A1A1AA] mb-6">
              welcome to altverse. by accessing or using our website,
              applications, or services (collectively,{" "}
              <strong>&quot;altverse&quot;</strong>), you agree to these terms
              of service.
            </p>

            <h3 className="text-base font-medium text-[#FAFAFA] mb-3">
              1. nature of service
            </h3>
            <p className="text-[#A1A1AA] mb-6">
              altverse provides an{" "}
              <strong>interface to third-party blockchain protocols</strong> for
              swapping, bridging, lending, borrowing, and related activities.{" "}
              <strong>altverse does not create, custody, or control</strong> any
              digital assets, smart contracts, or blockchains accessed through
              the interface.
            </p>

            <h3 className="text-base font-medium text-[#FAFAFA] mb-3">
              2. experimental technology
            </h3>
            <p className="text-[#A1A1AA] mb-6">
              altverse is <strong>software provided &quot;as is&quot;</strong>{" "}
              and <strong>without warranties</strong> of any kind. blockchain
              transactions are <strong>irreversible</strong> and may be
              vulnerable to bugs, exploits, or loss of funds.{" "}
              <strong>you use altverse entirely at your own risk.</strong>
            </p>

            <h3 className="text-base font-medium text-[#FAFAFA] mb-3">
              3. user responsibilities
            </h3>
            <p className="text-[#A1A1AA] mb-2">
              you are solely responsible for:
            </p>
            <ul className="list-disc list-inside text-[#A1A1AA] space-y-1 mb-6 ml-4">
              <li>
                your wallet security, private keys, and blockchain transactions.
              </li>
              <li>
                complying with all applicable laws, regulations, and tax
                obligations in your jurisdiction.
              </li>
              <li>
                reviewing, understanding, and complying with the terms of
                service, privacy policies, and other rules of any third-party
                protocol or service you access through altverse, such as aave,
                etherfi, or similar platforms.
              </li>
              <li>
                verifying the trustworthiness of any third-party protocol you
                choose to interact with.
              </li>
            </ul>

            <h3 className="text-base font-medium text-[#FAFAFA] mb-3">
              4. no financial or investment advice
            </h3>
            <p className="text-[#A1A1AA] mb-6">
              nothing on altverse constitutes investment, financial, or legal
              advice. altverse does <strong>not</strong> broker trades, execute
              orders, or provide fiduciary services.
            </p>

            <h3 className="text-base font-medium text-[#FAFAFA] mb-3">
              5. limitation of liability
            </h3>
            <p className="text-[#A1A1AA] mb-6">
              to the fullest extent permitted by law, altverse and its
              contributors <strong>disclaim all liability</strong> for any loss,
              damage, or claim arising from your use of the site, including
              interactions with third-party protocols.
            </p>

            <h3 className="text-base font-medium text-[#FAFAFA] mb-3">
              6. changes
            </h3>
            <p className="text-[#A1A1AA] mb-6">
              we may update these terms at any time. continued use of altverse
              after changes means you accept the revised terms.
            </p>

            <div className="border-t border-[#27272A] pt-6 mt-8">
              <h3 className="text-base font-medium text-[#FAFAFA] mb-3">
                acknowledgement
              </h3>
              <p className="text-[#A1A1AA]">
                by connecting a wallet or using altverse,{" "}
                <strong>
                  you confirm that you have read, understood, and agree to these
                  terms.
                </strong>
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-[#27272A] pt-4 pb-2 px-6 flex-shrink-0">
          <div className="flex justify-center">
            <BrandedButton
              buttonText="close"
              onClick={handleClose}
              className="px-8"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ToS;
