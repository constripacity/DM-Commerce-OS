// DM Commerce OS — Sandbox (single-file React)
// ------------------------------------------------------------
// What this is:
// - A front-end sandbox that simulates a DM Commerce OS without any real APIs.
// - Fake WhatsApp chats, fake Stripe/PayPal payment events, basic catalog, carts, and metrics.
// - Use it to demo flows, refine copy, and validate UX before wiring real WhatsApp/Stripe/PayPal.
//
// How to use:
// - Click "Start Simulation" to stream fake chats and payment events.
// - Reply from the right panel (Quick Actions) or let Auto-Reply handle intents.
// - Build carts, generate (fake) payment links, and watch paid events roll in.
// - Export orders as CSV for a quick win with merchants.
//
// Next step to production:
// - Replace the SimulatedGateway with real webhooks (WhatsApp Cloud API) and Stripe/PayPal webhooks.
// - Swap CatalogStore for Google Sheets fetch + Postgres cache.
// - Replace createFakePaymentLink with Stripe Checkout Sessions.
// ------------------------------------------------------------

import React, { useEffect, useMemo, useRef, useState } from "react";

// ----------------------------- Utilities -----------------------------
const uid = () => Math.random().toString(36).slice(2);
const now = () => new Date().toISOString();
const currency = (n, c = "EUR") => new Intl.NumberFormat(undefined, { style: "currency", currency: c }).format(n);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.click();
  URL.revokeObjectURL(url);
}

// ----------------------------- Sample Data -----------------------------
const SAMPLE_CUSTOMERS = [
  { name: "Lena K.", phone: "+49176400123" },
  { name: "Marco V.", phone: "+3933388899" },
  { name: "Aisha B.", phone: "+447712345" },
  { name: "Jonas P.", phone: "+491575777" },
  { name: "Dritan M.", phone: "+35568222333" },
  { name: "Maya R.", phone: "+120255501" },
];

const SAMPLE_CATALOG = [
  { sku: "TSHIRT-BLK-M", title: "Black Tee — M", price: 29.9, currency: "EUR", stock: 18, image: "https://picsum.photos/seed/blktee/80/80" },
  { sku: "TSHIRT-BLK-L", title: "Black Tee — L", price: 29.9, currency: "EUR", stock: 8, image: "https://picsum.photos/seed/blkteeL/80/80" },
  { sku: "TSHIRT-WHT-M", title: "White Tee — M", price: 27.5, currency: "EUR", stock: 25, image: "https://picsum.photos/seed/whttee/80/80" },
  { sku: "HOODIE-GRY-M", title: "Hoodie Grey — M", price: 59, currency: "EUR", stock: 12, image: "https://picsum.photos/seed/hood/80/80" },
  { sku: "CAP-NVY-OS", title: "Cap Navy — OS", price: 19.5, currency: "EUR", stock: 40, image: "https://picsum.photos/seed/cap/80/80" },
  { sku: "SNEAK-42-BLK", title: "Sneakers Black — 42", price: 89, currency: "EUR", stock: 7, image: "https://picsum.photos/seed/sneak/80/80" },
  { sku: "BAG-TOTE-STD", title: "Tote Bag — Organic", price: 15, currency: "EUR", stock: 50, image: "https://picsum.photos/seed/tote/80/80" },
  { sku: "SUNGL-STD", title: "Sunglasses — Classic", price: 34, currency: "EUR", stock: 27, image: "https://picsum.photos/seed/sun/80/80" },
  { sku: "SOCK-6PACK", title: "Socks — 6 Pack", price: 17, currency: "EUR", stock: 60, image: "https://picsum.photos/seed/sock/80/80" },
  { sku: "BELT-LTHR", title: "Leather Belt", price: 24, currency: "EUR", stock: 14, image: "https://picsum.photos/seed/belt/80/80" },
];

const INTENTS = {
  PRICE: "price",
  AVAIL: "availability",
  DELIVERY: "delivery",
  RETURN: "return",
  BUY: "buy",
  OTHER: "other",
};

// ----------------------------- Simulated Stores -----------------------------
class CatalogStore {
  constructor(items) { this.items = items; }
  search(q) {
    const t = q.toLowerCase();
    return this.items.find((x) => x.title.toLowerCase().includes(t) || x.sku.toLowerCase() === t);
  }
  getBySku(sku) { return this.items.find((x) => x.sku.toLowerCase() === sku.toLowerCase()); }
}

function createFakePaymentLink(provider, item, qty) {
  const token = uid();
  const base = provider === "Stripe" ? "https://pay.stripe.com/test_" : "https://paypal.me/yourshop/";
  const amount = (item?.price || 0) * (qty || 1);
  return { url: `${base}${token}`, amount, currency: item?.currency || "EUR", provider };
}

// ----------------------------- Simulation Engine -----------------------------
function randomOf(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function randomIncomingMessage(catalog) {
  const patterns = [
    () => `price ${randomOf(["black tee", "hoodie", "cap", "socks"])}`,
    () => `do you have ${randomOf(["L", "M", "42"])}`,
    () => `buy ${randomOf(catalog).sku} ${1 + Math.floor(Math.random() * 2)}`,
    () => `how much is ${randomOf(["the hoodie", "the tote bag", "sunglasses"])}`,
    () => `delivery to ${randomOf(["Berlin", "Munich", "Hamburg"])}`,
    () => `return policy?`,
    () => `hello`,
  ];
  return randomOf(patterns)();
}

function classifyIntent(text) {
  const t = text.toLowerCase();
  if (t.startsWith("buy ")) return INTENTS.BUY;
  if (t.includes("price") || t.includes("how much")) return INTENTS.PRICE;
  if (t.includes("have ") || t.includes("available") || t.includes("stock")) return INTENTS.AVAIL;
  if (t.includes("deliver") || t.includes("shipping") || t.includes("ship")) return INTENTS.DELIVERY;
  if (t.includes("return")) return INTENTS.RETURN;
  return INTENTS.OTHER;
}

// ----------------------------- Main Component -----------------------------
export default function DMCommerceSandbox() {
  const [connected, setConnected] = useState({ whatsapp: true, stripe: true, paypal: true });
  const [autoReply, setAutoReply] = useState(true);
  const [simRunning, setSimRunning] = useState(false);
  const [threads, setThreads] = useState([]); // [{id, contact, messages:[{id,from,text,ts,meta}], cart, status}]
  const [orders, setOrders] = useState([]);   // [{id, threadId, items:[{sku,qty,price}], amount, currency, provider, status, ts}]
  const [log, setLog] = useState([]);         // webhook/system log
  const [search, setSearch] = useState("");
  const [deliveryInfo, setDeliveryInfo] = useState({ fee: 4.9, etaDays: 2 });
  const catalog = useMemo(() => new CatalogStore(SAMPLE_CATALOG), []);

  const [activeThreadId, setActiveThreadId] = useState(null);
  const activeThread = useMemo(() => threads.find(t => t.id === activeThreadId) || null, [threads, activeThreadId]);

  const metrics = useMemo(() => {
    const msgs = threads.reduce((a, t) => a + t.messages.length, 0);
    const sentLinks = log.filter(l => l.type === "payment_link").length;
    const paid = orders.filter(o => o.status === "paid").length;
    const conv = sentLinks ? Math.round((paid / sentLinks) * 100) : 0;
    return { messages: msgs, links: sentLinks, paid, conv };
  }, [threads, log, orders]);

  // Seed one thread on mount
  useEffect(() => {
    if (threads.length === 0) {
      const c = randomOf(SAMPLE_CUSTOMERS);
      const t = {
        id: uid(),
        contact: c,
        messages: [
          { id: uid(), from: "user", text: "hi, price black tee", ts: now() },
        ],
        cart: [],
        status: "open",
      };
      setThreads([t]);
      setActiveThreadId(t.id);
    }
    // eslint-disable-next-line
  }, []);

  // Simulation loop
  useEffect(() => {
    if (!simRunning) return;
    let alive = true;
    (async () => {
      while (alive) {
        const wait = clamp(1500 + Math.random() * 3500, 800, 5000);
        await sleep(wait);
        if (!alive) break;
        simulateTick();
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line
  }, [simRunning, threads, orders, connected, autoReply]);

  function appendLog(entry) {
    setLog((l) => [{ id: uid(), ts: now(), ...entry }, ...l].slice(0, 300));
  }

  function upsertThread(thread) {
    setThreads((prev) => {
      const i = prev.findIndex((x) => x.id === thread.id);
      if (i === -1) return [thread, ...prev];
      const next = [...prev];
      next[i] = thread;
      return next;
    });
  }

  function pushMessage(threadId, msg) {
    setThreads((prev) => prev.map(t => t.id === threadId ? { ...t, messages: [...t.messages, msg] } : t));
  }

  function ensureThreadForContact(contact) {
    const existing = threads.find(t => t.contact.phone === contact.phone);
    if (existing) return existing;
    const t = { id: uid(), contact, messages: [], cart: [], status: "open" };
    setThreads((prev) => [t, ...prev]);
    return t;
  }

  // ---------------- Simulation tick ----------------
  function simulateTick() {
    // 60%: incoming message, 25%: payment event (if pending), 15%: nothing
    const r = Math.random();
    if (r < 0.6) {
      const contact = randomOf(SAMPLE_CUSTOMERS);
      const t = ensureThreadForContact(contact);
      const text = randomIncomingMessage(SAMPLE_CATALOG);
      const msg = { id: uid(), from: "user", text, ts: now() };
      pushMessage(t.id, msg);
      appendLog({ type: "incoming", threadId: t.id, text });
      if (autoReply) handleAutoReply(t.id, text);
    } else if (r < 0.85) {
      // Try to pay a random outstanding order (status: link_sent)
      const pending = orders.filter(o => o.status === "link_sent");
      if (pending.length) {
        const o = randomOf(pending);
        const success = Math.random() > 0.2; // 80% success
        const status = success ? "paid" : "failed";
        setOrders(prev => prev.map(x => x.id === o.id ? { ...x, status } : x));
        appendLog({ type: "payment_webhook", provider: o.provider, status, amount: o.amount, currency: o.currency, orderId: o.id });
        const t = threads.find(x => x.id === o.threadId);
        if (t) pushMessage(t.id, { id: uid(), from: "system", text: success ? "✅ Payment received!" : "⚠️ Payment failed.", ts: now() });
      }
    }
  }

  // ---------------- Auto-reply routing ----------------
  function handleAutoReply(threadId, text) {
    const intent = classifyIntent(text);
    const t = threads.find(x => x.id === threadId);
    if (!t) return;

    if (intent === INTENTS.BUY) {
      const [, sku, qtyStr] = text.split(" ");
      const qty = parseInt(qtyStr || "1", 10);
      const item = catalog.getBySku(sku || "");
      if (!item) return pushMessage(threadId, { id: uid(), from: "agent", text: "Sorry, I couldn't find that SKU.", ts: now() });
      addToCart(threadId, item, qty);
      const link = createFakePaymentLink(connected.stripe ? "Stripe" : "PayPal", item, qty);
      createOrderAndSendLink(threadId, [{ item, qty }], link);
      return;
    }

    if (intent === INTENTS.PRICE || intent === INTENTS.AVAIL) {
      const item = catalog.search(text);
      if (item) {
        pushMessage(threadId, { id: uid(), from: "agent", text: `💬 ${item.title}\nPrice: ${currency(item.price, item.currency)}\nReply: \"buy ${item.sku} 1\" to get a payment link.`, ts: now() });
      } else {
        pushMessage(threadId, { id: uid(), from: "agent", text: "Can you share the product name or SKU?", ts: now() });
      }
      return;
    }
    if (intent === INTENTS.DELIVERY) {
      pushMessage(threadId, { id: uid(), from: "agent", text: `Delivery fee is ${currency(deliveryInfo.fee)}. ETA ${deliveryInfo.etaDays}–${deliveryInfo.etaDays+2} days.`, ts: now() });
      return;
    }
    if (intent === INTENTS.RETURN) {
      pushMessage(threadId, { id: uid(), from: "agent", text: "Returns accepted within 14 days in original condition. Reply 'buy SKU QTY' to continue.", ts: now() });
      return;
    }
    // Other: friendly nudge
    pushMessage(threadId, { id: uid(), from: "agent", text: "Hi! Tell me the product name or type 'buy SKU QTY'.", ts: now() });
  }

  function addToCart(threadId, item, qty) {
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, cart: [...(t.cart || []), { sku: item.sku, title: item.title, price: item.price, currency: item.currency, qty }] } : t));
  }

  function createOrderAndSendLink(threadId, cartItems, link) {
    const amount = cartItems.reduce((a, it) => a + it.item.price * it.qty, 0) + deliveryInfo.fee;
    const order = {
      id: uid(),
      threadId,
      items: cartItems.map(ci => ({ sku: ci.item.sku, qty: ci.qty, price: ci.item.price })),
      amount: Math.round((amount + Number.EPSILON) * 100) / 100,
      currency: cartItems[0].item.currency,
      provider: link.provider,
      status: "link_sent",
      ts: now(),
    };
    setOrders(prev => [order, ...prev]);
    appendLog({ type: "payment_link", provider: link.provider, url: link.url, orderId: order.id, amount: order.amount, currency: order.currency });
    pushMessage(threadId, { id: uid(), from: "agent", text: `✅ Order ready. Total: ${currency(order.amount, order.currency)} (incl. delivery).\nPay here: ${link.url}`, ts: now() });
  }

  function handleManualSendLink(threadId, item, qty, provider) {
    const link = createFakePaymentLink(provider, item, qty);
    createOrderAndSendLink(threadId, [{ item, qty }], link);
  }

  function exportOrdersCSV() {
    const header = ["id","customer","provider","status","amount","currency","items","created_at"]; 
    const rows = orders.map(o => {
      const t = threads.find(x => x.id === o.threadId);
      const cust = t ? `${t.contact.name} (${t.contact.phone})` : "";
      const items = o.items.map(i => `${i.sku} x${i.qty} @${i.price}`).join("; ");
      return [o.id, cust, o.provider, o.status, o.amount, o.currency, items, o.ts];
    });
    const csv = [header.join(","), ...rows.map(r => r.map(x => `"${String(x).replaceAll('"','""')}"`).join(","))].join("\n");
    downloadText(`orders_${Date.now()}.csv`, csv);
  }

  // UI helpers
  function ThreadItem({ t }) {
    const last = t.messages[t.messages.length - 1];
    return (
      <button
        className={`w-full text-left p-3 rounded-xl mb-2 border ${t.id===activeThreadId?"bg-gray-100 border-gray-300":"border-transparent hover:bg-gray-50"}`}
        onClick={() => setActiveThreadId(t.id)}
      >
        <div className="flex justify-between">
          <div className="font-semibold">{t.contact.name}</div>
          <div className="text-xs opacity-60">{new Date(last?.ts||Date.now()).toLocaleTimeString()}</div>
        </div>
        <div className="text-sm opacity-70 truncate">{last?.from === "user" ? "👤" : last?.from === "agent" ? "🤖" : "⚙️"} {last?.text}</div>
      </button>
    );
  }

  function MessageBubble({ m }) {
    const isUser = m.from === "user";
    const isAgent = m.from === "agent";
    const bg = isUser ? "bg-white border" : isAgent ? "bg-blue-50 border border-blue-200" : "bg-green-50 border border-green-200";
    return (
      <div className={`max-w-[80%] p-3 rounded-2xl my-1 ${bg}`}> 
        <div className="text-xs opacity-60 mb-1">{isUser?"Customer":"Agent"}{m.from === "system"?" (system)":""} • {new Date(m.ts).toLocaleTimeString()}</div>
        <div className="whitespace-pre-wrap">{m.text}</div>
      </div>
    );
  }

  const filteredCatalog = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return SAMPLE_CATALOG;
    return SAMPLE_CATALOG.filter(x => x.title.toLowerCase().includes(q) || x.sku.toLowerCase().includes(q));
  }, [search]);

  return (
    <div className="min-h-screen w-full bg-white">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-xl font-bold">DM Commerce OS — Sandbox</div>
            <div className="text-xs opacity-70">Fake chats • Fake payments • Real product thinking</div>
          </div>
          <div className="flex items-center gap-3">
            <Toggle label="WhatsApp" on={connected.whatsapp} onToggle={(v)=>setConnected(c=>({...c,whatsapp:v}))} />
            <Toggle label="Stripe" on={connected.stripe} onToggle={(v)=>setConnected(c=>({...c,stripe:v}))} />
            <Toggle label="PayPal" on={connected.paypal} onToggle={(v)=>setConnected(c=>({...c,paypal:v}))} />
            <div className="h-6 w-px bg-gray-200"/>
            <label className="text-sm flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={autoReply} onChange={e=>setAutoReply(e.target.checked)} /> Auto-Reply
            </label>
            <button className={`px-3 py-1.5 rounded-xl text-sm border ${simRunning?"bg-red-50 border-red-200":"bg-green-50 border-green-200"}`} onClick={()=>setSimRunning(v=>!v)}>
              {simRunning?"■ Stop Simulation":"▶ Start Simulation"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-12 gap-4">
        {/* Left: Threads */}
        <div className="col-span-3">
          <div className="mb-3">
            <div className="font-semibold mb-2">Inbox</div>
            <div className="text-xs opacity-70 mb-2">{threads.length} threads • {metrics.messages} messages</div>
          </div>
          <div className="max-h-[70vh] overflow-auto pr-2">
            {threads.map(t => <ThreadItem key={t.id} t={t} />)}
          </div>
          <div className="mt-3 flex gap-2">
            <button className="px-3 py-2 text-sm rounded-xl border" onClick={()=>{setThreads([]); setOrders([]); setLog([]); setActiveThreadId(null);}}>Clear</button>
            <button className="px-3 py-2 text-sm rounded-xl border" onClick={()=>simulateTick()}>Simulate Tick</button>
          </div>

          {/* Metrics Card */}
          <div className="mt-4 p-3 border rounded-xl">
            <div className="font-semibold mb-2">Metrics (live)</div>
            <div className="text-sm">Payment links sent: <b>{metrics.links}</b></div>
            <div className="text-sm">Orders paid: <b>{metrics.paid}</b></div>
            <div className="text-sm">Conversion (links → paid): <b>{metrics.conv}%</b></div>
            <button className="mt-2 px-3 py-2 text-sm rounded-xl border" onClick={exportOrdersCSV}>Export orders CSV</button>
          </div>
        </div>

        {/* Middle: Active Thread */}
        <div className="col-span-6">
          {activeThread ? (
            <div className="h-full flex flex-col">
              <div className="p-3 border rounded-xl mb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{activeThread.contact.name}</div>
                    <div className="text-xs opacity-70">{activeThread.contact.phone}</div>
                  </div>
                  <div className="text-xs opacity-60">Thread #{activeThread.id.slice(0,6)}</div>
                </div>
              </div>
              <div className="flex-1 border rounded-xl p-3 overflow-auto max-h-[60vh] bg-gray-50">
                <div className="flex flex-col gap-2">
                  {activeThread.messages.map(m => (
                    <div key={m.id} className={`flex ${m.from === "user"?"justify-start":"justify-end"}`}>
                      <MessageBubble m={m} />
                    </div>
                  ))}
                </div>
              </div>
              <ManualComposer onSend={(text)=>{ pushMessage(activeThread.id, { id: uid(), from: "agent", text, ts: now() }); }} />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border rounded-xl text-center p-10">
              <div className="text-lg font-semibold mb-2">No thread selected</div>
              <div className="opacity-70">Choose a conversation on the left or start the simulation.</div>
            </div>
          )}
        </div>

        {/* Right: Catalog / Actions */}
        <div className="col-span-3">
          {/* Catalog */}
          <div className="border rounded-xl p-3 mb-3">
            <div className="font-semibold mb-2">Catalog</div>
            <input className="w-full border rounded-xl px-3 py-2 text-sm mb-2" placeholder="Search title or SKU..." value={search} onChange={(e)=>setSearch(e.target.value)} />
            <div className="max-h-64 overflow-auto pr-2">
              {filteredCatalog.map(it => (
                <div key={it.sku} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50">
                  <img src={it.image} alt="" className="h-10 w-10 rounded-lg object-cover"/>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{it.title}</div>
                    <div className="text-xs opacity-70">{it.sku} • {currency(it.price, it.currency)} • stock {it.stock}</div>
                  </div>
                  {activeThread && (
                    <button className="text-xs px-2 py-1 border rounded-lg"
                      onClick={()=>handleManualSendLink(activeThread.id, it, 1, connected.stripe?"Stripe":"PayPal")}
                    >Send link</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="border rounded-xl p-3 mb-3">
            <div className="font-semibold mb-2">Quick Actions</div>
            {activeThread ? (
              <div className="flex flex-col gap-2">
                <button className="px-3 py-2 text-sm rounded-xl border" onClick={()=>{
                  const text = `Delivery fee is ${currency(deliveryInfo.fee)}. ETA ${deliveryInfo.etaDays}-${deliveryInfo.etaDays+2} days.`;
                  pushMessage(activeThread.id, { id: uid(), from: "agent", text, ts: now() });
                }}>Reply delivery info</button>
                <button className="px-3 py-2 text-sm rounded-xl border" onClick={()=>{
                  const it = catalog.search("hoodie") || SAMPLE_CATALOG[0];
                  handleManualSendLink(activeThread.id, it, 1, connected.stripe?"Stripe":"PayPal");
                }}>Build cart + send payment link</button>
                <button className="px-3 py-2 text-sm rounded-xl border" onClick={()=>{
                  const o = orders.find(x => x.threadId === activeThread.id && x.status === "link_sent");
                  if (!o) return;
                  setOrders(prev => prev.map(x => x.id === o.id ? { ...x, status: "paid" } : x));
                  pushMessage(activeThread.id, { id: uid(), from: "system", text: "✅ Payment received!", ts: now() });
                  appendLog({ type: "payment_webhook", provider: o.provider, status: "paid", amount: o.amount, currency: o.currency, orderId: o.id });
                }}>Force mark as paid</button>
              </div>
            ) : (
              <div className="text-sm opacity-70">Select a conversation first.</div>
            )}
          </div>

          {/* Settings */}
          <div className="border rounded-xl p-3">
            <div className="font-semibold mb-2">Settings</div>
            <div className="text-sm mb-2">Delivery fee</div>
            <input type="number" step="0.1" className="w-full border rounded-xl px-3 py-2 text-sm mb-2" value={deliveryInfo.fee} onChange={e=>setDeliveryInfo(d=>({...d, fee: parseFloat(e.target.value || 0)}))} />
            <div className="text-sm mb-2">ETA (days)</div>
            <input type="number" className="w-full border rounded-xl px-3 py-2 text-sm" value={deliveryInfo.etaDays} onChange={e=>setDeliveryInfo(d=>({...d, etaDays: parseInt(e.target.value||"2",10)}))} />
          </div>
        </div>
      </div>

      {/* Log */}
      <div className="max-w-7xl mx-auto px-4 pb-10">
        <div className="mt-6 p-3 border rounded-xl">
          <div className="font-semibold mb-2">Event Log (newest first)</div>
          <div className="max-h-64 overflow-auto text-sm">
            {log.map(e => (
              <div key={e.id} className="py-1 border-b last:border-b-0">
                <div className="opacity-60 text-xs">{new Date(e.ts).toLocaleTimeString()} • {e.type}</div>
                <div className="font-mono text-xs break-all">{JSON.stringify(e)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------- Small Components -----------------------------
function Toggle({ label, on, onToggle }) {
  return (
    <button onClick={()=>onToggle(!on)} className={`text-sm px-3 py-1.5 rounded-xl border ${on?"bg-emerald-50 border-emerald-200":"bg-gray-50 border-gray-200"}`}>
      {on ? "● " : "○ "}{label}
    </button>
  );
}

function ManualComposer({ onSend }) {
  const [value, setValue] = useState("");
  return (
    <div className="mt-2 flex gap-2">
      <input className="flex-1 border rounded-xl px-3 py-2 text-sm" placeholder="Type a reply..." value={value} onChange={e=>setValue(e.target.value)} onKeyDown={e=>{ if (e.key === 'Enter' && value.trim()) { onSend(value.trim()); setValue(""); } }} />
      <button className="px-3 py-2 text-sm rounded-xl border" onClick={()=>{ if (!value.trim()) return; onSend(value.trim()); setValue(""); }}>Send</button>
    </div>
  );
}
