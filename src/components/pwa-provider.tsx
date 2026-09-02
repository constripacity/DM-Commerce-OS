"use client";

import { useEffect, type ReactNode } from "react";

type PWAProviderProps = { children: ReactNode };

export function PWAProvider({ children }: PWAProviderProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          const scriptUrl =
            registration.active?.scriptURL ??
            registration.waiting?.scriptURL ??
            registration.installing?.scriptURL;
          if (scriptUrl && new URL(scriptUrl).pathname === "/sw.js") {
            void registration.unregister();
          }
        }
      }).catch((error) => {
        console.error("Legacy service worker cleanup failed:", error);
      });
    }

    if ("caches" in window) {
      window.caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith("dm-commerce-os-cache-"))
            .map((cacheName) => window.caches.delete(cacheName)),
        ),
      ).catch((error) => {
        console.error("Legacy application cache cleanup failed:", error);
      });
    }
  }, []);

  return children;
}
