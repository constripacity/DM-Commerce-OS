# DM Commerce OS · Design Notes

## Design Tokens
- **Color palettes:** defined in `tailwind.config.ts` and `src/components/theme-provider.tsx`. Six curated palettes (Daybreak, Twilight, Midnight, Evergreen, Blush, Noir) expose primary/secondary swatches and toggle light/dark tokens via the `data-theme` attribute.
- **Radii & shadows:** base radius `0.75rem` for cards/drawers, `1.25rem` for dashboard shells. Subtle glassmorphism shadows (`shadow-subtle`) keep panels elevated without heavy contrast.
- **Spacing scale:** 4px baseline (`1` → `0.25rem`). Dashboard grids leverage `gap-6` (24px) for breathing room; micro-interactions use `gap-2` (8px).
- **Typography:** Inter for UI, Mono toggle for script editor. Font sizes follow Tailwind defaults; uppercase labels rely on `tracking-[0.08em]` for legibility.

## Motion Principles
- **Ease:** cubic-bezier(0.16, 1, 0.3, 1) for modal/drawer transitions. Consistent 180ms duration on palette changes, drawers, and toast presentations.
- **Micro-interactions:** framer-motion applies 12px slide/fade on chat bubbles, with spring damping 18. Command palette and TanStack tables use fade/scale combos to reinforce depth.
- **State feedback:** skeletons for loading, toasts on success/error, and badge color shifts on inspector intent updates.

## Accessibility
- **Contrast guard:** Settings tab warns when custom primary color <4.5:1 against theme background. Default palettes hit WCAG AA.
- **Keyboard support:**
  - Global command palette (`⌘/Ctrl + K`) for navigation and quick actions.
  - Slash commands in DM Studio (`/pitch`, `/qualify`, `/checkout`, `/objection`).
  - Drawer forms trap focus and expose close buttons with `sr-only` labels.
- **ARIA & semantics:** Tables reuse `@tanstack/react-table` header semantics; badges and SVGs include text alternatives.
- **Reduced motion:** `prefers-reduced-motion` honoured via Tailwind’s motion-safe classes where transitions occur.

## Layout Decisions
- **Dashboard shell:** sticky topbar and sidebar create familiar SaaS layout. Tabs render within cards for consistency and reuse of spacing tokens.
- **Calendar + data views:** Campaigns tab pairs TanStack table (left) with content calendar (right) to bridge data and schedule mental models.
- **Three-pane DM Studio:** script library, chat, and inspector panes keep context visible—variables surfaced in left rail, state machine insights on right.

## Responsiveness
- Breakpoints: small devices collapse grids into vertical stacks (`lg:grid-cols` fallback). Drawer-based editing keeps forms usable on mobile.
- Charts wrap with `ResponsiveContainer`; tables collapse to single column on narrow viewports with overflow scroll.

## Testing Checklist
- Contrast check passes for default palette.
- Keyboard navigation reaches all interactive elements.
- Analytics export verifies PNG download in Chromium/WebKit (fallback to canvas data URL when `toBlob` unavailable).
