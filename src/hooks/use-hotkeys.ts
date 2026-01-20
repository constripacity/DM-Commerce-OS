"use client";

import * as React from "react";

const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

export interface HotkeyConfig {
  combo: string;
  handler: (event: KeyboardEvent) => void;
  preventDefault?: boolean;
}

function matches(event: KeyboardEvent, combo: string) {
  const parts = combo.toLowerCase().split("+");
  let keyMatched = false;

  for (const part of parts) {
    switch (part) {
      case "mod":
        if (!(isMac ? event.metaKey : event.ctrlKey)) {
          return false;
        }
        break;
      case "ctrl":
        if (!event.ctrlKey) {
          return false;
        }
        break;
      case "cmd":
        if (!event.metaKey) {
          return false;
        }
        break;
      case "shift":
        if (!event.shiftKey) {
          return false;
        }
        break;
      case "alt":
      case "option":
        if (!event.altKey) {
          return false;
        }
        break;
      default: {
        const key = part.length === 1 ? part : part;
        if (event.key.toLowerCase() !== key) {
          return false;
        }
        keyMatched = true;
        break;
      }
    }
  }

  return keyMatched || parts.some((part) => part.length === 1);
}

export function useHotkeys(configs: HotkeyConfig[], deps: React.DependencyList = []) {
  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      for (const config of configs) {
        if (matches(event, config.combo)) {
          if (config.preventDefault ?? true) {
            event.preventDefault();
          }
          config.handler(event);
          break;
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
