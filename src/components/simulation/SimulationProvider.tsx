"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { generateFlowSteps, type SimulationStep } from "./steps/fullFlowSteps";

export interface SimulationContextType {
  isRunning: boolean;
  isPaused: boolean;
  currentStep: SimulationStep | null;
  currentStepIndex: number;
  totalSteps: number;
  currentPhase: string;
  cursorPos: { x: number; y: number };
  targetRect: DOMRect | null;
  start: () => void;
  pause: () => void;
  resume: () => void;
  skip: () => void;
  exit: () => void;
}

const SimulationContext = React.createContext<SimulationContextType | null>(null);

export function useSimulation() {
  const ctx = React.useContext(SimulationContext);
  if (!ctx) throw new Error("useSimulation must be used within SimulationProvider");
  return ctx;
}

function resolveTarget(target: string): HTMLElement | null {
  let el = document.querySelector(`[data-sim="${target}"]`);
  if (el) return el as HTMLElement;
  el = document.querySelector(target);
  return el as HTMLElement | null;
}

async function waitForTarget(target: string, maxRetries = 20): Promise<HTMLElement | null> {
  for (let i = 0; i < maxRetries; i++) {
    const el = resolveTarget(target);
    if (el) return el;
    await new Promise((r) => setTimeout(r, 200));
  }
  return null;
}

function getElementCenter(el: HTMLElement): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isRunning, setIsRunning] = React.useState(false);
  const [isPaused, setIsPaused] = React.useState(false);
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const [cursorPos, setCursorPos] = React.useState({ x: -100, y: -100 });
  const [targetRect, setTargetRect] = React.useState<DOMRect | null>(null);

  const abortRef = React.useRef<AbortController | null>(null);
  const pauseRef = React.useRef(false);
  const skipRef = React.useRef(false);
  const cursorPosRef = React.useRef({ x: -100, y: -100 });
  const lastTypedTextRef = React.useRef("");
  const stepsRef = React.useRef<SimulationStep[]>(generateFlowSteps());

  const steps = stepsRef.current;
  const currentStep = isRunning ? steps[currentStepIndex] ?? null : null;
  const currentPhase = currentStep?.phase ?? "";

  const sleep = React.useCallback(
    (ms: number, signal: AbortSignal) =>
      new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, ms);
        signal.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new DOMException("Aborted", "AbortError"));
        });
      }),
    []
  );

  const waitWhilePaused = React.useCallback(
    async (signal: AbortSignal) => {
      while (pauseRef.current) {
        await sleep(100, signal);
      }
    },
    [sleep]
  );

  const typeIntoElement = React.useCallback(
    async (el: HTMLElement, text: string, speed: number, signal: AbortSignal) => {
      const input = el as HTMLInputElement | HTMLTextAreaElement;
      input.focus();

      const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const nativeSet = Object.getOwnPropertyDescriptor(proto, "value")?.set;

      const setVal = (val: string) => {
        const tracker = (input as unknown as Record<string, unknown>)._valueTracker as
          | { setValue: (v: string) => void }
          | undefined;
        if (tracker) tracker.setValue("");
        nativeSet?.call(input, val);
        input.dispatchEvent(new Event("input", { bubbles: true }));
      };

      setVal("");

      for (let i = 0; i < text.length; i++) {
        if (signal.aborted) return;
        await waitWhilePaused(signal);
        if (skipRef.current) {
          setVal(text);
          skipRef.current = false;
          lastTypedTextRef.current = text;
          return;
        }
        setVal(text.slice(0, i + 1));
        await sleep(speed, signal);
      }
      lastTypedTextRef.current = text;
    },
    [sleep, waitWhilePaused]
  );

  const runSimulation = React.useCallback(async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;
    const simSteps = stepsRef.current;

    // Map nav targets to routes
    const navRoutes: Record<string, string> = {
      "nav-overview": "/dashboard",
      "nav-dm-studio": "/dashboard/dm-studio",
      "nav-campaigns": "/dashboard/campaigns",
      "nav-products": "/dashboard/products",
      "nav-orders": "/dashboard/orders",
      "nav-scripts": "/dashboard/scripts",
      "nav-analytics": "/dashboard/analytics",
      "nav-settings": "/dashboard/settings",
    };

    try {
      // Start on dashboard
      router.push("/dashboard");
      await sleep(600, signal);

      for (let i = 0; i < simSteps.length; i++) {
        if (signal.aborted) return;
        await waitWhilePaused(signal);

        const step = simSteps[i];
        setCurrentStepIndex(i);

        await sleep(step.delayBefore ?? 600, signal);
        await waitWhilePaused(signal);

        // === NAV LINK CLICKS: use router.push for reliable navigation ===
        if (step.action.type === "click" && step.target.startsWith("nav-")) {
          const navEl = await waitForTarget(step.target);
          if (navEl) {
            const center = getElementCenter(navEl);
            const dist = Math.hypot(center.x - cursorPosRef.current.x, center.y - cursorPosRef.current.y);
            if (dist > 150) setTargetRect(null);
            setCursorPos(center);
            cursorPosRef.current = center;
            await sleep(dist > 150 ? 350 : 100, signal);
            setTargetRect(navEl.getBoundingClientRect());
            await sleep(400, signal);

            const route = navRoutes[step.target];
            if (route) {
              setTargetRect(null);
              router.push(route);
              await sleep(1000, signal);
            }
          }
          await sleep(step.delayAfter ?? 400, signal);
          continue;
        }

        // === RESOLVE TARGET ===
        const el = await waitForTarget(step.target);
        if (!el) {
          console.warn(`[Sim] Target not found: ${step.target}, skipping ${step.id}`);
          continue;
        }

        // === MOVE CURSOR ===
        let center = getElementCenter(el);
        const dist = Math.hypot(center.x - cursorPosRef.current.x, center.y - cursorPosRef.current.y);
        if (dist > 150) setTargetRect(null);
        setCursorPos(center);
        cursorPosRef.current = center;
        await sleep(dist > 150 ? 350 : 100, signal);

        // Re-read position after animations settle
        center = getElementCenter(el);
        setCursorPos(center);
        cursorPosRef.current = center;
        setTargetRect(el.getBoundingClientRect());

        await sleep(300, signal);
        await waitWhilePaused(signal);

        // === EXECUTE ACTION ===
        switch (step.action.type) {
          case "click":
            await sleep(150, signal);
            if (step.target === "dm-send-btn") {
              // Dispatch custom event so DM Studio sends + triggers auto-reply
              window.dispatchEvent(
                new CustomEvent("sim-send-message", {
                  detail: { text: lastTypedTextRef.current },
                })
              );
              lastTypedTextRef.current = "";
            } else {
              el.click();
            }
            break;
          case "type":
            await typeIntoElement(el, step.action.text, step.action.speed ?? 50, signal);
            break;
          case "hover":
            break;
          case "wait":
            await sleep(step.action.ms, signal);
            break;
          case "scroll":
            el.scrollBy({
              top: step.action.direction === "down" ? step.action.amount : -step.action.amount,
              behavior: "smooth",
            });
            break;
          case "select": {
            el.click();
            await sleep(300, signal);
            const option = document.querySelector(
              `[role="option"][data-value="${step.action.value}"], [role="option"]:has(> :first-child)`
            ) as HTMLElement | null;
            if (option) option.click();
            break;
          }
          case "navigate":
            router.push(step.action.path);
            await sleep(500, signal);
            break;
        }

        await sleep(step.delayAfter ?? 400, signal);
      }

      await sleep(500, signal);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      console.error("[Sim] Error:", err);
    } finally {
      setIsRunning(false);
      setIsPaused(false);
      setCurrentStepIndex(0);
      setCursorPos({ x: -100, y: -100 });
      cursorPosRef.current = { x: -100, y: -100 };
      setTargetRect(null);
      abortRef.current = null;
      pauseRef.current = false;
      skipRef.current = false;
    }
  }, [sleep, pathname, router, typeIntoElement, waitWhilePaused]);

  const start = React.useCallback(() => {
    if (isRunning) return;
    stepsRef.current = generateFlowSteps();
    setIsRunning(true);
    setIsPaused(false);
    setCurrentStepIndex(0);
  }, [isRunning]);

  React.useEffect(() => {
    if (isRunning && !abortRef.current) {
      runSimulation();
    }
  }, [isRunning, runSimulation]);

  const pause = React.useCallback(() => { setIsPaused(true); pauseRef.current = true; }, []);
  const resume = React.useCallback(() => { setIsPaused(false); pauseRef.current = false; }, []);
  const skip = React.useCallback(() => { skipRef.current = true; }, []);

  const exit = React.useCallback(() => {
    abortRef.current?.abort();
    setIsRunning(false);
    setIsPaused(false);
    setCurrentStepIndex(0);
    setCursorPos({ x: -100, y: -100 });
    cursorPosRef.current = { x: -100, y: -100 };
    setTargetRect(null);
    pauseRef.current = false;
    skipRef.current = false;
  }, []);

  React.useEffect(() => {
    if (!isRunning) return;
    const recalc = () => {
      const step = stepsRef.current[currentStepIndex];
      if (!step) return;
      const el = resolveTarget(step.target);
      if (el) {
        const center = getElementCenter(el);
        setCursorPos(center);
        cursorPosRef.current = center;
        setTargetRect(el.getBoundingClientRect());
      }
    };
    const debounced = debounce(recalc, 100);
    window.addEventListener("resize", debounced);
    window.addEventListener("scroll", debounced, true);
    return () => {
      window.removeEventListener("resize", debounced);
      window.removeEventListener("scroll", debounced, true);
    };
  }, [isRunning, currentStepIndex]);

  const value = React.useMemo<SimulationContextType>(
    () => ({
      isRunning, isPaused, currentStep, currentStepIndex,
      totalSteps: steps.length, currentPhase, cursorPos, targetRect,
      start, pause, resume, skip, exit,
    }),
    [isRunning, isPaused, currentStep, currentStepIndex, currentPhase, cursorPos, targetRect, start, pause, resume, skip, exit]
  );

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
