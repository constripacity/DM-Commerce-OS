"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSimulation } from "./SimulationProvider";

export function NarratorTooltip() {
  const { isRunning, currentStep, currentStepIndex, totalSteps, targetRect } = useSimulation();

  if (!isRunning || !currentStep || !targetRect) return null;

  // Position: prefer right of target, fallback to left, then bottom
  const gap = 16;
  const maxWidth = 280;
  const viewW = typeof window !== "undefined" ? window.innerWidth : 1200;
  const viewH = typeof window !== "undefined" ? window.innerHeight : 800;

  let left = targetRect.right + gap;
  let top = targetRect.top;
  let caretSide: "left" | "right" | "top" = "left";

  // If tooltip would overflow right edge, try left
  if (left + maxWidth > viewW - 20) {
    left = targetRect.left - maxWidth - gap;
    caretSide = "right";
  }

  // If tooltip would overflow left edge, place below target
  if (left < 20) {
    left = Math.max(20, targetRect.left);
    top = targetRect.bottom + gap;
    caretSide = "top";
  }

  // Keep within vertical bounds
  top = Math.max(20, Math.min(top, viewH - 160));

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentStep.id}
        className="pointer-events-none fixed z-[9999] rounded-xl border border-border/50 bg-card p-4 shadow-2xl"
        style={{ maxWidth, left, top }}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut", delay: 0.2 }}
      >
        {/* Caret */}
        {caretSide === "left" && (
          <div
            className="absolute -left-2 top-4 h-0 w-0"
            style={{
              borderTop: "6px solid transparent",
              borderBottom: "6px solid transparent",
              borderRight: "8px solid hsl(var(--card))",
            }}
          />
        )}
        {caretSide === "right" && (
          <div
            className="absolute -right-2 top-4 h-0 w-0"
            style={{
              borderTop: "6px solid transparent",
              borderBottom: "6px solid transparent",
              borderLeft: "8px solid hsl(var(--card))",
            }}
          />
        )}
        {caretSide === "top" && (
          <div
            className="absolute -top-2 left-6 h-0 w-0"
            style={{
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderBottom: "8px solid hsl(var(--card))",
            }}
          />
        )}

        <p className="text-sm leading-relaxed text-foreground">{currentStep.narration}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Step {currentStepIndex + 1} of {totalSteps}
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
