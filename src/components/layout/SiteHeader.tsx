"use client";

import { MainNav } from "@/components/layout/MainNav";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { useState, useEffect } from "react";
import useWeb3Store from "@/store/web3Store";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/Sheet";
import { Menu, History } from "lucide-react";
import BrandedButton from "@/components/ui/BrandedButton";
import { ConnectWalletModal } from "@/components/ui/ConnectWalletModal";
import Link from "next/link";
import { SwapHistorySheet } from "@/components/ui/SwapHistorySheet";

export function SiteHeader(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const requiredWallet = useWeb3Store((state) =>
    state.getWalletBySourceChain(),
  );

  const handleSheetClose = (): void => {
    setIsOpen(false);
  };

  // Get wallet button text based on connection status
  const getWalletButtonText = (): string => {
    if (!requiredWallet) return "connect wallet";
    return "wallet connected";
  };

  const handleMobileHistoryClick = (): void => {
    setIsOpen(false);
    setIsHistoryOpen(true);
  };

  useEffect((): (() => void) => {
    const handleResize = (): void => {
      // Check if window width is at or above the lg breakpoint
      if (window.innerWidth >= 1024 && isOpen) {
        setIsOpen(false);
      }
    };

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Cleanup function
    return (): void => {
      window.removeEventListener("resize", handleResize);
    };
  }, [isOpen]); // Only re-run if isOpen changes

  return (
    <header className="bg-background sticky top-0 z-40 w-full border-b">
      <div className="flex h-14 items-center px-4">
        {/* Logo and Nav Container */}
        <div className="flex items-center gap-8">
          <Link className="flex items-center gap-3" href="/">
            <Image
              src="/tokens/branded/ALT.svg"
              alt="Altverse Logo"
              width={32}
              height={32}
              className="h-8 w-8"
              priority
            />
            <span className="text-xl font-normal">altverse</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:block">
            <MainNav onNavigate={(): void => void 0} />
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="ml-auto flex items-center gap-4">
          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="sm" className="mr-0 px-2">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[300px] sm:w-[360px] [&_svg.lucide-x]:text-amber-500 [&_svg.lucide-x]:w-[1.5rem] [&_svg.lucide-x]:h-[1.5rem] [&_svg.lucide-x]:bg-[#442E0B] [&_svg.lucide-x]:rounded-[3px] [&_svg.lucide-x]:border-[#61410B] [&_svg.lucide-x]:border-[0.5px] [&_button]:focus:ring-0 [&_button]:focus:ring-offset-0 [&_button]:focus:outline-none"
            >
              <SheetHeader>
                <SheetTitle>
                  <div
                    className="flex items-center gap-3"
                    onClick={(): void => setIsOpen(false)}
                  >
                    <Image
                      src="/tokens/branded/ALT.svg"
                      alt="Altverse Logo"
                      width={24}
                      height={24}
                      className="h-6 w-6"
                      priority
                    />
                    <span className="text-lg font-normal">altverse</span>
                  </div>
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6 mt-6">
                <nav className="flex flex-col gap-2">
                  <MainNav onNavigate={(): void => setIsOpen(false)} />
                </nav>
                {/* transaction history Button for Mobile with enhanced styling */}

                {/* Always use ConnectWalletModal for mobile */}
                <ConnectWalletModal
                  onSuccess={handleSheetClose}
                  trigger={
                    <BrandedButton
                      className="md:inline-flex whitespace-nowrap text-sm h-[30px]"
                      iconClassName="h-4 w-4"
                      iconName="Wallet"
                      buttonText={getWalletButtonText()}
                    />
                  }
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMobileHistoryClick}
                  className="w-full flex items-center bg-amber-500/25 hover:bg-amber-500/50 hover:text-amber-400 text-amber-500 border-[#61410B] border-[1px] rounded-lg transition-all duration-300 h-[30px]"
                >
                  <History className="h-4 w-4 mr-2" />
                  transaction history
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop transaction history Sheet */}
          <SwapHistorySheet
            isOpen={isHistoryOpen}
            onOpenChange={setIsHistoryOpen}
          >
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="hidden lg:flex items-center gap-2 bg-amber-500/25 hover:bg-amber-500/50 hover:text-amber-400 text-amber-500 border-[#61410B] border-[1px] rounded-lg transition-all duration-300 h-[30px]"
              >
                <History className="h-4 w-4" />
                <span className="sr-only">transaction history</span>
              </Button>
            </SheetTrigger>
          </SwapHistorySheet>

          {/* Desktop Wallet Button - Always use ConnectWalletModal */}
          <ConnectWalletModal
            trigger={
              <BrandedButton
                className="hidden lg:inline-flex whitespace-nowrap text-sm h-[30px]"
                iconClassName="h-4 w-4"
                iconName="Wallet"
                buttonText={getWalletButtonText()}
              />
            }
          />
        </div>
      </div>
    </header>
  );
}
