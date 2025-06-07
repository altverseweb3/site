"use client";

import { useInView, useMotionValue, useSpring } from "motion/react";
import {
  ComponentPropsWithoutRef,
  useEffect,
  useRef,
  useCallback,
} from "react";

import { cn } from "@/lib/utils";

interface NumberTickerProps extends ComponentPropsWithoutRef<"span"> {
  value: number;
  startValue?: number;
  direction?: "up" | "down";
  delay?: number;
  decimalPlaces?: number;
  stiffness?: number;
  damping?: number;
}

export function NumberTicker({
  value,
  startValue = 0,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
  stiffness = 300,
  damping = 80,
  ...props
}: NumberTickerProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(direction === "down" ? value : startValue);
  const springValue = useSpring(motionValue, {
    damping: damping,
    stiffness: stiffness,
  });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  const formatNumber = useCallback(
    (num: number) => {
      return Intl.NumberFormat("en-US", {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
      }).format(Number(num.toFixed(decimalPlaces)));
    },
    [decimalPlaces],
  );

  useEffect(() => {
    if (isInView) {
      const timer = setTimeout(() => {
        motionValue.set(direction === "down" ? startValue : value);
      }, delay * 10);
      return () => clearTimeout(timer);
    }
  }, [motionValue, isInView, delay, value, direction, startValue]);

  useEffect(
    () =>
      springValue.on("change", (latest) => {
        if (ref.current) {
          ref.current.textContent = formatNumber(latest);
        }
      }),
    [springValue, formatNumber],
  );

  return (
    <span
      ref={ref}
      className={cn(
        `inline-block tabular-nums tracking-wider text-white`,
        className,
      )}
      {...props}
    >
      {formatNumber(startValue)}
    </span>
  );
}
