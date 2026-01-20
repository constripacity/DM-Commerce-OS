"use client";

import { useEffect, type ReactNode } from "react";

type PWAProviderProps = { children: ReactNode };

export function PWAProvider({ children }: PWAProviderProps) {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("Service worker registration failed:", error);
      });
    };

    window.addEventListener("load", register);

    return () => {
      window.removeEventListener("load", register);
    };
  }, []);

  return children;
}
