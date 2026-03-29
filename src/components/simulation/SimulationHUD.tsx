"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSimulation } from "./SimulationProvider";

export function SimulationHUD() {
  const { isRunning, currentStepIndex, totalSteps, currentPhase } = useSimulation();

  const progress = totalSteps > 0 ? ((currentStepIndex + 1) / totalSteps) * 100 : 0;

  return (
    <AnimatePresence>
      {isRunning && (
        <motion.div
          className="fixed left-1/2 top-4 z-[9996] flex items-center gap-4 rounded-full border border-border/50 bg-card/95 px-6 py-3 shadow-xl backdrop-blur-md"
          style={{ transform: "translateX(-50%)" }}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
            Step {currentStepIndex + 1} of {totalSteps}
          </span>

          {/* Progress bar */}
          <div className="h-[3px] w-[120px] overflow-hidden rounded-full bg-muted/40">
            <motion.div
              className="h-full rounded-full bg-primary"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
              style={{ boxShadow: "0 0 8px hsl(var(--primary) / 0.4)" }}
            />
          </div>

          <span className="whitespace-nowrap text-sm font-medium text-foreground">
            {currentPhase}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
