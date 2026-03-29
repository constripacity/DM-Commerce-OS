"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pause, Play, SkipForward, X } from "lucide-react";
import { useSimulation } from "./SimulationProvider";

export function FloatingSimButton() {
  const { isRunning, isPaused, start, pause, resume, skip, exit } = useSimulation();
  const [confirmExit, setConfirmExit] = React.useState(false);

  const handleExit = React.useCallback(() => {
    if (confirmExit) {
      exit();
      setConfirmExit(false);
    } else {
      setConfirmExit(true);
    }
  }, [confirmExit, exit]);

  // Auto-dismiss confirm after 3s
  React.useEffect(() => {
    if (!confirmExit) return;
    const timer = setTimeout(() => setConfirmExit(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmExit]);

  return (
    <div className="fixed bottom-6 right-6 z-50 hidden md:block">
      <AnimatePresence mode="wait">
        {!isRunning ? (
          <motion.button
            key="idle"
            onClick={start}
            className="group flex items-center gap-2.5 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-[1.03]"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            layout
          >
            <Play className="h-4 w-4" />
            <span>Run Simulation</span>
            {/* Subtle pulse glow */}
            <motion.div
              className="absolute inset-0 rounded-full bg-primary/20"
              animate={{ scale: [1, 1.08, 1], opacity: [0, 0.3, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              style={{ zIndex: -1 }}
            />
          </motion.button>
        ) : (
          <motion.div
            key="running"
            className="flex items-center gap-1 rounded-full border border-border/50 bg-card/95 p-1.5 shadow-xl backdrop-blur"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2 }}
            layout
          >
            {/* Play/Pause */}
            <button
              onClick={isPaused ? resume : pause}
              className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted/50"
              title={isPaused ? "Resume" : "Pause"}
            >
              {isPaused ? (
                <Play className="h-4 w-4 text-foreground" />
              ) : (
                <Pause className="h-4 w-4 text-foreground" />
              )}
            </button>

            {/* Skip */}
            <button
              onClick={skip}
              className="flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted/50"
              title="Skip step"
            >
              <SkipForward className="h-4 w-4 text-foreground" />
            </button>

            {/* Exit */}
            <button
              onClick={handleExit}
              className={`flex h-9 items-center justify-center rounded-full px-3 transition-colors ${
                confirmExit
                  ? "bg-destructive/10 text-destructive"
                  : "hover:bg-muted/50 text-foreground"
              }`}
              title="End simulation"
            >
              <X className="h-4 w-4" />
              {confirmExit && <span className="ml-1 text-xs font-medium">End?</span>}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
