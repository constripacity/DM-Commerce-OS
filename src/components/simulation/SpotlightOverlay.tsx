"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSimulation } from "./SimulationProvider";

const INSTANT = { duration: 0 };

export function SpotlightOverlay() {
  const { isRunning, targetRect } = useSimulation();

  if (!isRunning || !targetRect) return null;

  const padding = 12;
  const x = targetRect.left - padding;
  const y = targetRect.top - padding;
  const w = targetRect.width + padding * 2;
  const h = targetRect.height + padding * 2;
  const r = 12;

  // Build clip path that cuts a rounded-rect hole in the overlay
  // Using a polygon with the viewport rect and an inset rect for the cutout
  const clipPath = `
    M 0 0
    H ${window.innerWidth}
    V ${window.innerHeight}
    H 0
    Z
    M ${x + r} ${y}
    H ${x + w - r}
    Q ${x + w} ${y} ${x + w} ${y + r}
    V ${y + h - r}
    Q ${x + w} ${y + h} ${x + w - r} ${y + h}
    H ${x + r}
    Q ${x} ${y + h} ${x} ${y + h - r}
    V ${y + r}
    Q ${x} ${y} ${x + r} ${y}
    Z
  `;

  return (
    <AnimatePresence>
      {isRunning && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[9997]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Dimmed overlay with cutout — no animation on the path, instant repositioning */}
          <svg
            className="h-full w-full"
            xmlns="http://www.w3.org/2000/svg"
            style={{ position: "fixed", inset: 0, width: "100%", height: "100%" }}
          >
            <path
              d={clipPath}
              fill="rgba(0,0,0,0.5)"
              fillRule="evenodd"
            />
          </svg>

          {/* Glow ring around target — snaps instantly to match cutout */}
          <motion.div
            className="pointer-events-none fixed rounded-xl"
            animate={{ left: x, top: y, width: w, height: h }}
            transition={INSTANT}
            style={{
              boxShadow:
                "0 0 0 2px hsl(var(--primary) / 0.3), 0 0 20px hsl(var(--primary) / 0.1)",
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
