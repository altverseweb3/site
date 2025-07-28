import React, { useRef } from "react";
import { cn } from "@/lib/utils";
import { AnimatedBeam } from "@/components/ui/AnimatedBeam";
import Image from "next/image";

const Circle = React.forwardRef<
  HTMLDivElement,
  { className?: string; children?: React.ReactNode; imageSrc?: string }
>(({ className, children, imageSrc }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "z-10 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 p-1.5",
        className,
      )}
    >
      {imageSrc ? (
        <Image src={imageSrc} alt="Token" width={32} height={32} />
      ) : (
        children
      )}
    </div>
  );
});

Circle.displayName = "Circle";

export default function Spider({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const input1Ref = useRef<HTMLDivElement>(null);
  const input2Ref = useRef<HTMLDivElement>(null);
  const input3Ref = useRef<HTMLDivElement>(null);
  const leftBidirectionalRef = useRef<HTMLDivElement>(null);
  const rightBidirectionalRef = useRef<HTMLDivElement>(null);
  const output1Ref = useRef<HTMLDivElement>(null);
  const output2Ref = useRef<HTMLDivElement>(null);
  const output3Ref = useRef<HTMLDivElement>(null);

  const amberStart = "#F59E0B"; // amber 500
  const amberStop = "#D97706"; // amber 600

  const skyStart = "#0EA5E9"; // sky 500
  const skyStop = "#0284C7"; // sky 600

  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none",
        className,
      )}
      ref={containerRef}
    >
      <div
        className="grid w-full h-full grid-cols-4 
              lg:px-16 md:px-10 sm:px-6 px-4
              pt-6
              lg:pb-32
              md:pb-36
              sm:pb-40 
              max-sm:pb-44
          "
      >
        {/* Left column */}
        <div className="flex flex-col justify-between">
          <Circle
            ref={input1Ref}
            imageSrc="/tokens/branded/BNB.svg"
            className="shadow-[0_0_20px_-5px_rgba(245,158,11,0.8)]"
          />
          <Circle
            ref={input2Ref}
            imageSrc="/tokens/branded/BTC.svg"
            className="shadow-[0_0_20px_-5px_rgba(245,158,11,0.8)]"
          />
          <Circle
            ref={input3Ref}
            imageSrc="/tokens/branded/USDT.svg"
            className="shadow-[0_0_20px_-5px_rgba(245,158,11,0.8)]"
          />
        </div>

        {/* Left bidirectional column - align with the middle row */}
        <div className="flex items-center justify-center">
          <Circle
            ref={leftBidirectionalRef}
            imageSrc="/tokens/branded/ALT.svg"
            className="shadow-[0_0_20px_-5px_rgba(245,158,11,0.8)]"
          />
        </div>

        {/* Right bidirectional column - align with the middle row */}
        <div className="flex items-center justify-center">
          <Circle
            ref={rightBidirectionalRef}
            imageSrc="/tokens/branded/ALT2.svg"
            className="shadow-[0_0_20px_-5px_rgba(14,165,233,0.8)]"
          />
        </div>

        {/* Right column */}
        <div className="flex flex-col justify-between items-end">
          <Circle
            ref={output1Ref}
            imageSrc="/tokens/branded/LINK.svg"
            className="shadow-[0_0_20px_-5px_rgba(14,165,233,0.8)]"
          />
          <Circle
            ref={output2Ref}
            imageSrc="/tokens/branded/SUI.svg"
            className="shadow-[0_0_20px_-5px_rgba(14,165,233,0.8)]"
          />
          <Circle
            ref={output3Ref}
            imageSrc="/tokens/branded/USDT.svg"
            className="shadow-[0_0_20px_-5px_rgba(14,165,233,0.8)]"
          />
        </div>
      </div>

      {/* Input to Left Bidirectional Beams */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={input1Ref}
        toRef={leftBidirectionalRef}
        gradientStartColor={amberStart}
        gradientStopColor={amberStop}
        duration={7}
        delay={1}
        pathColor="rgba(64,64,64,1)"
        pathWidth={2}
        pathOpacity={0.4}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={input2Ref}
        toRef={leftBidirectionalRef}
        gradientStartColor={amberStart}
        gradientStopColor={amberStop}
        duration={7}
        delay={1.3}
        pathColor="rgba(64,64,64,1)"
        pathWidth={2}
        pathOpacity={0.4}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={input3Ref}
        toRef={leftBidirectionalRef}
        gradientStartColor={amberStart}
        gradientStopColor={amberStop}
        duration={7}
        delay={1.6}
        pathColor="rgba(64,64,64,1)"
        pathWidth={2}
        pathOpacity={0.4}
      />

      {/* Bidirectional to Bidirectional Beams */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={leftBidirectionalRef}
        toRef={rightBidirectionalRef}
        gradientStartColor={amberStart}
        gradientStopColor={amberStop}
        startYOffset={-10}
        endYOffset={-10}
        curvature={15}
        duration={7}
        delay={2.2}
        pathColor="rgba(64,64,64,1)"
        pathWidth={2}
        pathOpacity={0.4}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={leftBidirectionalRef}
        toRef={rightBidirectionalRef}
        gradientStartColor={skyStart}
        gradientStopColor={skyStop}
        startYOffset={10}
        endYOffset={10}
        curvature={-15}
        reverse
        duration={7}
        delay={2.5}
        pathColor="rgba(64,64,64,1)"
        pathWidth={2}
        pathOpacity={0.4}
      />

      {/* Right Bidirectional to Output Beams */}
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={output1Ref}
        toRef={rightBidirectionalRef}
        duration={7}
        gradientStartColor={skyStart}
        gradientStopColor={skyStop}
        startYOffset={-5}
        endYOffset={0}
        delay={3.1}
        pathColor="rgba(64,64,64,1)"
        pathWidth={2}
        pathOpacity={0.4}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={rightBidirectionalRef}
        toRef={output2Ref}
        duration={7}
        gradientStartColor={skyStart}
        gradientStopColor={skyStop}
        delay={3.4}
        pathColor="rgba(64,64,64,1)"
        pathWidth={2}
        pathOpacity={0.4}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={output3Ref}
        toRef={rightBidirectionalRef}
        duration={7}
        gradientStartColor={skyStart}
        gradientStopColor={skyStop}
        startYOffset={5}
        endYOffset={0}
        delay={3.7}
        pathColor="rgba(64,64,64,1)"
        pathWidth={2}
        pathOpacity={0.4}
      />
    </div>
  );
}
