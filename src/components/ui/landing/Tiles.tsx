"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import Marquee from "react-fast-marquee";
import { JSX, useEffect, useId, useMemo, useRef } from "react";
import {
  motion,
  useAnimation,
  useInView,
  useReducedMotion,
} from "framer-motion";
import React from "react";
import { getTokenGradient } from "@/utils/ui/uiHelpers";

type TokenName =
  | "1INCH"
  | "AAVE"
  | "ADA"
  | "ALT"
  | "ANKR"
  | "APT"
  | "ATOM"
  | "AVAX"
  | "AXS"
  | "BAND"
  | "BAT"
  | "BEAM"
  | "BNB"
  | "BTC"
  | "CAKE"
  | "CELO"
  | "CFX"
  | "CKB"
  | "COMP"
  | "CRV"
  | "DASH"
  | "DOT"
  | "EGLD"
  | "ENJ"
  | "ETH"
  | "FIL"
  | "FLOW"
  | "S"
  | "GLM"
  | "GRT"
  | "ICP"
  | "ICX"
  | "KAVA"
  | "KDA"
  | "LINK"
  | "LRC"
  | "MANA"
  | "MINA"
  | "MKR"
  | "NEAR"
  | "NEO"
  | "ONE"
  | "ONT"
  | "OP"
  | "QTUM"
  | "REEF"
  | "REN"
  | "ROSE"
  | "RUNE"
  | "SAND"
  | "SOL"
  | "SOLID"
  | "SRM"
  | "STORJ"
  | "STRAX"
  | "STX"
  | "SUI"
  | "SUSHI"
  | "THETA"
  | "TRX"
  | "UNI"
  | "USDC"
  | "USDT"
  | "WAVES"
  | "XMR"
  | "YFI"
  | "ZEC"
  | "ZIL";

const allTokens: TokenName[] = [
  "1INCH",
  "AAVE",
  "ADA",
  "ALT",
  "ANKR",
  "APT",
  "ATOM",
  "AVAX",
  "AXS",
  "BAND",
  "BAT",
  "BEAM",
  "BNB",
  "BTC",
  "CAKE",
  "CELO",
  "CFX",
  "CKB",
  "COMP",
  "CRV",
  "DASH",
  "DOT",
  "EGLD",
  "ENJ",
  "ETH",
  "FIL",
  "FLOW",
  "S",
  "GLM",
  "GRT",
  "ICP",
  "ICX",
  "KAVA",
  "KDA",
  "LINK",
  "LRC",
  "MANA",
  "MINA",
  "MKR",
  "NEAR",
  "NEO",
  "ONE",
  "ONT",
  "OP",
  "QTUM",
  "REEF",
  "REN",
  "ROSE",
  "RUNE",
  "SAND",
  "SOL",
  "SOLID",
  "SRM",
  "STORJ",
  "STRAX",
  "STX",
  "SUI",
  "SUSHI",
  "THETA",
  "TRX",
  "UNI",
  "USDC",
  "USDT",
  "WAVES",
  "XMR",
  "YFI",
  "ZEC",
  "ZIL",
];

const priorityTokens: TokenName[] = [
  "SOL",
  "ALT",
  "UNI",
  "LINK",
  "BTC",
  "CELO",
  "CRV",
  "AVAX",
  "S",
  "USDC",
  "ETH",
  "1INCH",
];

interface TokenCard {
  icon: JSX.Element;
  bg: JSX.Element;
}

const shuffleArray = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  let currentIndex = newArray.length,
    randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [newArray[currentIndex], newArray[randomIndex]] = [
      newArray[randomIndex],
      newArray[currentIndex],
    ];
  }
  return newArray;
};

const createTiles = (tokens: TokenName[]): TokenCard[] =>
  tokens.map((token) => ({
    icon: (
      <Image
        src={`/tokens/branded/${token}.svg`}
        className="size-full"
        alt={`${token} logo`}
        width={500}
        height={500}
        loading="lazy"
      />
    ),
    bg: (
      <div
        className={`pointer-events-none absolute left-1/2 top-1/2 h-1/2 w-1/2 -translate-x-1/2 -translate-y-1/2 overflow-visible rounded-full bg-gradient-to-r ${getTokenGradient(
          token,
        )} opacity-70 blur-[20px] filter`}
      ></div>
    ),
  }));

const remainingTokens = shuffleArray<TokenName>(
  allTokens.filter((token) => !priorityTokens.includes(token)),
);

const totalTokens = allTokens.length;
const tokensPerSet = Math.floor(totalTokens / 5);

interface CardProps {
  icon: JSX.Element;
  bg: JSX.Element;
}

const Card: React.FC<CardProps> = React.memo(({ icon, bg }) => {
  const id = useId();
  const controls = useAnimation();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (inView) {
      controls.start({
        opacity: 1,
        transition: {
          delay: reduceMotion ? 0 : Math.random() * 2,
          ease: "easeOut",
          duration: 1,
        },
      });
    }
  }, [controls, inView, reduceMotion]);
  return (
    <motion.div
      key={id}
      ref={ref}
      initial={{ opacity: 0 }}
      animate={controls}
      className={cn(
        "relative size-12 cursor-pointer overflow-hidden rounded-lg border p-2 mx-1",
        "bg-white",
        "transform-gpu dark:bg-transparent dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
      )}
    >
      {icon}
      {bg}
    </motion.div>
  );
});
Card.displayName = "Card";

export default function Tiles(): JSX.Element {
  const { tiles1, tiles2, tiles3, tiles4, tiles5 } = useMemo(() => {
    const t1 = createTiles([
      ...priorityTokens.slice(0, 7),
      ...remainingTokens.slice(0, tokensPerSet - 7),
    ]);
    const t2 = createTiles([
      ...priorityTokens.slice(7),
      ...remainingTokens.slice(tokensPerSet - 7, tokensPerSet * 2 - 12),
    ]);
    const t3 = createTiles(
      remainingTokens.slice(tokensPerSet * 2 - 12, tokensPerSet * 3 - 12),
    );
    const t4 = createTiles(
      remainingTokens.slice(tokensPerSet * 3 - 12, tokensPerSet * 4 - 12),
    );
    const t5 = createTiles(remainingTokens.slice(tokensPerSet * 4 - 12));
    return { tiles1: t1, tiles2: t2, tiles3: t3, tiles4: t4, tiles5: t5 };
  }, []);
  return (
    <div className="absolute inset-0 mt-1.5 overflow-hidden transition-all duration-200 ease-out [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)]">
      <Marquee direction="right" speed={18} gradient={false} className="p-1">
        {tiles1.map((tile, idx) => (
          <Card key={idx} {...tile} />
        ))}
      </Marquee>
      <Marquee speed={18} gradient={false} className="p-1">
        {tiles2.map((tile, idx) => (
          <Card key={idx} {...tile} />
        ))}
      </Marquee>
      <Marquee direction="right" speed={24} gradient={false} className="p-1">
        {tiles3.map((tile, idx) => (
          <Card key={idx} {...tile} />
        ))}
      </Marquee>
      <Marquee speed={16} gradient={false} className="p-1">
        {tiles4.map((tile, idx) => (
          <Card key={idx} {...tile} />
        ))}
      </Marquee>
      <Marquee direction="right" speed={20} gradient={false} className="p-1">
        {tiles5.map((tile, idx) => (
          <Card key={idx} {...tile} />
        ))}
      </Marquee>
    </div>
  );
}
