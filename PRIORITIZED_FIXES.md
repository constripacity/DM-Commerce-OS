# Prioritized fixes to reach parity and stabilize wiring

- [x] Confirm dev server and basic wiring (catalog, send-message, payment-link) — verified running at http://localhost:5174/
- [ ] Make "Start Simulation" deterministic/demo mode so each tick produces visible actions (use a deterministic toggle)
- [ ] Add appendLog calls across simulation and action points:
  - simulateIncomingMessage, sendMessage, sendPaymentLink, simulatePaymentEvent, exportOrdersCSV, forceMarkPaid
- [ ] Add polling or SSE to auto-sync /api/orders (e.g., poll every 10s) and update local orders/ordersPaid
- [ ] Improve error handling & user feedback (toasts or Event Log entries for API failures)
- [ ] Harden API contract handling (accept order vs orderId, fallback shapes, nulls)
- [ ] Wire force-mark-paid to backend with optimistic update + rollback on failure
- [ ] Replace mockThreads with backend threads (sync/merge strategy + incremental rollout)
- [ ] Reintroduce optional demo webhook/random-payment simulation mode for offline demos
- [ ] Fix TypeScript issues and tighten types (remove implicit anys, ensure DOM timers types, add missing type defs)
- [ ] Add integration/smoke tests and verify HMR/production build
- [ ] Polish UX: loading states, disabled buttons while actions pending, Event Log UI improvements

Notes
- Short-term priority: deterministic simulation, event logging, polling for orders, and error feedback — these make the app obviously functional for demos.
- Medium-term: backend thread sync, robust API shape handling, and force-mark-paid backend flow.
- Long-term: automated tests, production build validation, UI polish.
