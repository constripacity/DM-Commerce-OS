"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { useSimulation } from "./SimulationProvider";

export function SimulationCompletionModal() {
  const { isRunning, currentStepIndex, totalSteps, start } = useSimulation();
  const [show, setShow] = React.useState(false);
  const prevRunning = React.useRef(false);

  React.useEffect(() => {
    // Show completion when simulation finishes (was running, now stopped, and completed all steps)
    if (prevRunning.current && !isRunning && currentStepIndex === 0) {
      setShow(true);
    }
    prevRunning.current = isRunning;
  }, [isRunning, currentStepIndex]);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="mx-4 w-full max-w-md rounded-2xl border border-border/50 bg-card p-8 text-center shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Simulation complete!</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            You just watched the full DM-to-checkout flow. Every step used real actions against
            your sandbox data.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => setShow(false)}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Got it
            </button>
            <button
              onClick={() => {
                setShow(false);
                setTimeout(start, 300);
              }}
              className="flex items-center gap-2 rounded-lg border border-border/50 px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Run again
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
