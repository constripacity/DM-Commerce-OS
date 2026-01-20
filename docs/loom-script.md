# Loom Walkthrough Script (90 seconds)

**Hook (0:00 – 0:12)**
- "Welcome to DM Commerce OS — a fully offline sandbox that shows how a creator can sell a digital download straight from their DMs."
- "In the next minute you'll see the entire funnel: product setup, DM simulation, checkout, and delivery."

**Dashboard Overview (0:12 – 0:30)**
- "After logging in with the demo credentials, the dashboard highlights every step of the funnel in one place: products, DM studio, campaigns, orders, scripts, analytics, and settings."
- "Notice the seeded data so you can demo immediately, but everything is editable."

**Products + Checkout (0:30 – 0:48)**
- "Let's spin up a new product. The form validates title, price, and local file path. Saving it drops it into the catalog instantly."
- "From the table I can open a fake checkout modal, enter a name and email, and an order is created with a download link ready."

**DM Studio (0:48 – 1:08)**
- "The DM Studio simulates a real conversation. I pick the campaign keyword, select scripts, and send the trigger message." 
- "A state machine drives friendly auto-replies: pitch, qualify, checkout, and delivery. When I tap *Simulate checkout*, it records an order and sends the delivery message automatically."

**Campaigns, Analytics, Settings (1:08 – 1:22)**
- "Campaigns include CSV exports with 10 posts and stories to promote the keyword."
- "Analytics blend seeded funnel metrics with live orders, and settings let you brand the experience with your color and logo."

**Close (1:22 – 1:30)**
- "Everything runs offline on SQLite with Prisma seeds, so feel free to reset the demo anytime with `npm run demo:reset`."
- "Thanks for watching — this portfolio app proves the full DM-to-delivery story without touching a real API."
