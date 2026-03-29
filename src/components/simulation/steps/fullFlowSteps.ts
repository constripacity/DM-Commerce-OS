export type SimulationAction =
  | { type: "navigate"; path: string }
  | { type: "click" }
  | { type: "type"; text: string; speed?: number }
  | { type: "hover" }
  | { type: "wait"; ms: number }
  | { type: "scroll"; direction: "down" | "up"; amount: number }
  | { type: "select"; value: string };

export type SimulationStep = {
  id: string;
  phase: string;
  narration: string;
  target: string;
  action: SimulationAction;
  delayBefore?: number;
  delayAfter?: number;
  spotlight?: boolean;
  skipSpotlightTransition?: boolean;
};

// Randomizers so each simulation run produces unique data
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const rand = () => Math.floor(Math.random() * 900 + 100); // 100-999
const campaignNames = ["Flash Sale", "Summer Drop", "VIP Launch", "Early Bird", "Weekend Blitz"];
const buyerFirstNames = ["Alex", "Jordan", "Sam", "Taylor", "Casey", "Morgan", "Riley"];
const buyerLastNames = ["Rivera", "Chen", "Patel", "Kim", "Santos", "Okafor", "Berg"];
const emailDomains = ["creator.io", "test.co", "sandbox.dev", "demo.run"];

export function generateFlowSteps(): SimulationStep[] {
  // Campaign gets a unique name + keyword each run
  const campaignName = `${pick(campaignNames)} ${rand()}`;
  const campaignKeyword = `${pick(["FLASH", "DROP", "VIP", "EARLY", "DEAL"])}${rand()}`;
  // DM keyword always matches the default seed campaign ("GUIDE") for auto-reply
  const dmKeyword = "GUIDE";
  const firstName = pick(buyerFirstNames);
  const lastName = pick(buyerLastNames);
  const buyerName = `${firstName} ${lastName}`;
  const buyerEmail = `${firstName.toLowerCase()}${rand()}@${pick(emailDomains)}`;
  const today = new Date().toISOString().split("T")[0];
  const twoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];

  return [
    // ═══════════════════════════════════════
    // PHASE 1: CAMPAIGN SETUP
    // ═══════════════════════════════════════
    {
      id: "nav-campaigns",
      phase: "Getting Started",
      narration:
        "Let's walk through a complete DM-to-checkout flow. First, we'll create a campaign.",
      target: "nav-campaigns",
      action: { type: "click" },
      delayBefore: 800,
      delayAfter: 800,
    },
    {
      id: "click-new-campaign",
      phase: "Campaign Setup",
      narration: "Creating a new campaign with a keyword trigger.",
      target: "new-campaign",
      action: { type: "click" },
      delayAfter: 1400,
    },
    {
      id: "type-campaign-name",
      phase: "Campaign Setup",
      narration:
        "Every campaign needs a name and a trigger keyword that starts the DM flow.",
      target: "campaign-name-input",
      action: { type: "type", text: campaignName, speed: 50 },
      delayAfter: 300,
    },
    {
      id: "type-keyword",
      phase: "Campaign Setup",
      narration:
        "When a follower DMs this keyword, the automation kicks in.",
      target: "campaign-keyword-input",
      action: { type: "type", text: campaignKeyword, speed: 50 },
      delayAfter: 300,
    },
    {
      id: "type-start-date",
      phase: "Campaign Setup",
      narration: "Setting the campaign window \u2014 start and end dates.",
      target: "campaign-starts-on",
      action: { type: "type", text: today, speed: 30 },
      delayAfter: 200,
    },
    {
      id: "type-end-date",
      phase: "Campaign Setup",
      narration: "The campaign will run for two weeks.",
      target: "campaign-ends-on",
      action: { type: "type", text: twoWeeks, speed: 30 },
      delayAfter: 300,
    },
    {
      id: "save-campaign",
      phase: "Campaign Setup",
      narration: "Campaign created! Now let's test it in the DM Studio.",
      target: "campaign-save-btn",
      action: { type: "click" },
      delayAfter: 1000,
    },

    // ═══════════════════════════════════════
    // PHASE 2: DM STUDIO CONVERSATION
    // ═══════════════════════════════════════
    {
      id: "nav-dm-studio",
      phase: "DM Conversation",
      narration:
        "Opening the DM Studio \u2014 this is where you simulate real conversations.",
      target: "nav-dm-studio",
      action: { type: "click" },
      delayAfter: 800,
    },
    {
      id: "type-keyword-message",
      phase: "DM Conversation",
      narration: "A customer sends the trigger keyword...",
      target: "dm-input",
      action: { type: "type", text: dmKeyword, speed: 80 },
      delayAfter: 300,
    },
    {
      id: "send-keyword",
      phase: "DM Conversation",
      narration: "Sending the keyword to trigger the automation.",
      target: "dm-send-btn",
      action: { type: "click" },
      delayAfter: 1200,
    },
    {
      id: "show-bot-response",
      phase: "DM Conversation",
      narration:
        "The bot responds with the pitch script automatically. Scripts are fully customizable.",
      target: "dm-latest-message",
      action: { type: "hover" },
      delayAfter: 1500,
    },
    {
      id: "type-interested",
      phase: "DM Conversation",
      narration: "The customer shows interest...",
      target: "dm-input",
      action: { type: "type", text: "Yes I'm interested! Tell me more", speed: 45 },
      delayAfter: 300,
    },
    {
      id: "send-interested",
      phase: "DM Conversation",
      narration: "Sending the reply \u2014 watch the state machine advance.",
      target: "dm-send-btn",
      action: { type: "click" },
      delayAfter: 1200,
    },
    {
      id: "show-state-change",
      phase: "DM Conversation",
      narration:
        "The intent detection recognized buying intent and moved to the checkout stage.",
      target: "dm-state-indicator",
      action: { type: "hover" },
      delayAfter: 1200,
    },

    // ═══════════════════════════════════════
    // PHASE 3: CHECKOUT (via Products page)
    // ═══════════════════════════════════════
    {
      id: "nav-products",
      phase: "Checkout",
      narration:
        "Now let's run a fake checkout. Heading to the Products page.",
      target: "nav-products",
      action: { type: "click" },
      delayAfter: 800,
    },
    {
      id: "click-checkout-btn",
      phase: "Checkout",
      narration:
        "Clicking the checkout button on this product to simulate a purchase.",
      target: "product-first-checkout",
      action: { type: "click" },
      delayAfter: 800,
    },
    {
      id: "show-checkout-modal",
      phase: "Checkout",
      narration:
        "This simulates the checkout experience. Product, price, and delivery \u2014 all previewed here.",
      target: "checkout-modal",
      action: { type: "hover" },
      delayAfter: 1500,
    },
    {
      id: "type-buyer-name",
      phase: "Checkout",
      narration: "Filling in the buyer details...",
      target: "checkout-buyer-name",
      action: { type: "type", text: buyerName, speed: 50 },
      delayAfter: 300,
    },
    {
      id: "type-buyer-email",
      phase: "Checkout",
      narration: "Adding the email for delivery.",
      target: "checkout-buyer-email",
      action: { type: "type", text: buyerEmail, speed: 40 },
      delayAfter: 300,
    },
    {
      id: "confirm-purchase",
      phase: "Checkout",
      narration: "Completing the purchase...",
      target: "checkout-confirm-btn",
      action: { type: "click" },
      delayAfter: 1000,
    },

    // ═══════════════════════════════════════
    // PHASE 4: ORDER CONFIRMATION
    // ═══════════════════════════════════════
    {
      id: "nav-orders",
      phase: "Order Complete",
      narration: "Now let's check the Orders page to see the new order.",
      target: "nav-orders",
      action: { type: "click" },
      delayAfter: 800,
    },
    {
      id: "show-new-order",
      phase: "Order Complete",
      narration:
        "There it is \u2014 the order from our simulated DM flow, with full checkout details.",
      target: "orders-latest-row",
      action: { type: "hover" },
      delayAfter: 1500,
    },
    {
      id: "click-order-detail",
      phase: "Order Complete",
      narration:
        "Click into any order to see the full trail \u2014 buyer info, product, and delivery status.",
      target: "orders-latest-row",
      action: { type: "click" },
      delayAfter: 1200,
    },
    {
      id: "show-order-drawer",
      phase: "Order Complete",
      narration:
        "The complete DM-to-checkout-to-delivery flow \u2014 tested entirely offline. That's DM Commerce OS.",
      target: "order-detail-drawer",
      action: { type: "hover" },
      delayAfter: 2000,
    },
  ];
}
