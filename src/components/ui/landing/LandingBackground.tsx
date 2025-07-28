"use client";

import { Particles } from "@/components/ui/Particles";
import React, { useEffect, useState, useRef } from "react";

const LandingBackground = () => {
  const [opacity, setOpacity] = useState<number>(0);
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    let startTime: number | null = null;

    const animateFadeIn = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;

      // percentage for target opacity
      const targetOpacity = 32;
      // fade in duration in ms
      const duration = 1500;

      const newOpacity = Math.min(
        (progress / duration) * targetOpacity,
        targetOpacity,
      );
      setOpacity(newOpacity);

      if (newOpacity < targetOpacity) {
        animationFrameId.current = requestAnimationFrame(animateFadeIn);
      }
    };

    animationFrameId.current = requestAnimationFrame(animateFadeIn);

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  return (
    <div>
      <div
        className="pointer-events-none absolute fixed inset-0 transition-opacity duration-1000 ease-out"
        style={{ opacity: opacity / 100 }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-transparent via-amber-500/10 to-amber-500/5" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/10 to-amber-500/5" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-amber-500/20 to-transparent" />
        <div className="absolute inset-[10%] bg-amber-500/10 blur-3xl" />
      </div>
      <Particles
        className="absolute inset-0 pointer-events-none"
        quantity={300}
        staticity={60}
        ease={70}
        size={0.03}
        color="#fde68a"
      />
    </div>
  );
};

export { LandingBackground };
