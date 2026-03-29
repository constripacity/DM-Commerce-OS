"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSimulation } from "./SimulationProvider";

export function FakeCursor() {
  const { isRunning, cursorPos, currentStep } = useSimulation();
  const [clicks, setClicks] = React.useState<{ id: string; x: number; y: number }[]>([]);

  // Trigger click ripple on click actions
  React.useEffect(() => {
    if (!currentStep || currentStep.action.type !== "click") return;
    const timer = setTimeout(() => {
      setClicks((prev) => [
        ...prev,
        { id: `${currentStep.id}-${Date.now()}`, x: cursorPos.x, y: cursorPos.y },
      ]);
    }, 400);
    return () => clearTimeout(timer);
  }, [currentStep, cursorPos]);

  // Clean up old click ripples
  React.useEffect(() => {
    if (!clicks.length) return;
    const timer = setTimeout(() => {
      setClicks((prev) => prev.slice(1));
    }, 600);
    return () => clearTimeout(timer);
  }, [clicks]);

  if (!isRunning) return null;

  return (
    <>
      {/* Cursor */}
      <motion.div
        className="pointer-events-none fixed z-[9999]"
        animate={{ x: cursorPos.x - 4, y: cursorPos.y - 2 }}
        transition={{ type: "spring", stiffness: 120, damping: 25 }}
        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 0 1 .35-.15h6.87a.5.5 0 0 0 .35-.85L6.35 2.86a.5.5 0 0 0-.85.35Z"
            fill="white"
            stroke="black"
            strokeWidth="1.2"
          />
        </svg>
        {/* Trail dot — positioned right at the pointer tip */}
        <motion.div
          className="absolute left-[4px] top-[2px] h-1.5 w-1.5 rounded-full bg-primary opacity-60"
          style={{ filter: "blur(1px)" }}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      </motion.div>

      {/* Click Ripples */}
      <AnimatePresence>
        {clicks.map((click) => (
          <motion.div
            key={click.id}
            className="pointer-events-none fixed z-[9998] rounded-full border-2 border-primary"
            style={{
              width: 30,
              height: 30,
              left: click.x - 15,
              top: click.y - 15,
            }}
            initial={{ scale: 0, opacity: 0.4 }}
            animate={{ scale: 2, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        ))}
      </AnimatePresence>
    </>
  );
}
