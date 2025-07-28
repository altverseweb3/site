"use client";

import { Globe } from "@/components/ui/Globe";
import { COBEOptions } from "cobe";

const GLOBE_CONFIG: COBEOptions = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0.5,
  theta: 0.3,
  dark: 0.98,
  diffuse: 0.4,
  mapSamples: 10000,
  mapBrightness: 1.8,
  baseColor: [0.3, 0.3, 0.3],
  markerColor: [1, 0.6, 0.2],
  glowColor: [0.4, 0.3, 0.1],
  markers: [
    { location: [14.5995, 120.9842], size: 0.03 }, // Manila
    { location: [19.076, 72.8777], size: 0.04 }, // Mumbai
    { location: [23.8103, 90.4125], size: 0.05 }, // Dhaka
    { location: [30.0444, 31.2357], size: 0.04 }, // Cairo
    { location: [39.9042, 116.4074], size: 0.04 }, // Beijing
    { location: [-23.5505, -46.6333], size: 0.05 }, // São Paulo
    { location: [19.4326, -99.1332], size: 0.05 }, // Mexico City
    { location: [40.7128, -74.006], size: 0.04 }, // New York
    { location: [34.6937, 135.5022], size: 0.05 }, // Osaka
    { location: [41.0082, 28.9784], size: 0.05 }, // Istanbul
    { location: [51.5074, -0.1278], size: 0.04 }, // London
    { location: [-33.8688, 151.2093], size: 0.05 }, // Sydney
    { location: [55.7558, 37.6173], size: 0.04 }, // Moscow
    { location: [-1.2921, 36.8219], size: 0.03 }, // Nairobi
    { location: [-15.7801, -47.9292], size: 0.04 }, // Brasília
    { location: [-22.9068, -43.1729], size: 0.05 }, // Rio de Janeiro
    { location: [34.0522, -118.2437], size: 0.05 }, // Los Angeles
    { location: [25.2048, 55.2708], size: 0.04 }, // Dubai
    { location: [15.3229, 38.9251], size: 0.03 }, // Asmara (Northeast Africa)
  ],
};

export function GlobeCard() {
  return (
    <div className="absolute inset-0 w-full h-full mt-20 ml-20">
      <Globe config={GLOBE_CONFIG} />
    </div>
  );
}
