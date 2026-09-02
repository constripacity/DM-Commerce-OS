import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, subDays } from "date-fns";
import { commerceEventTypes, encodeEventProperties } from "@/lib/events";
import { removeManagedLogoUpload } from "@/lib/security/managed-uploads";

type DemoDatabase = PrismaClient | Prisma.TransactionClient;

export async function runDemoSeed(prisma: DemoDatabase) {
  const password = bcrypt.hashSync("demo123", 12);

  await prisma.user.upsert({
    where: { email: "demo@local.test" },
    update: { password },
    create: {
      email: "demo@local.test",
      password,
    },
  });

  const productPayloads = [
    {
      title: "Creator DM Guide",
      description: "A step-by-step playbook for converting warm leads in the DMs without sounding salesy.",
      priceCents: 2900,
      filePath: "/files/creator-guide.pdf",
    },
    {
      title: "Launch Checklist",
      description: "A punchy pre-launch checklist covering content, DMs, and fulfillment so nothing slips through.",
      priceCents: 1900,
      filePath: "/files/checklist.pdf",
    },
  ];

  const products = [];
  for (const product of productPayloads) {
    products.push(
      await prisma.product.upsert({
        where: { title: product.title },
        update: product,
        create: product,
      }),
    );
  }

  const [guideProduct, checklistProduct] = products;

  const now = new Date();

  const guideCampaign = await prisma.campaign.upsert({
    where: { keyword: "GUIDE" },
    update: {
      name: "Creator Guide DM Push",
      platform: "instagram",
      startsOn: now,
      endsOn: addDays(now, 14),
    },
    create: {
      name: "Creator Guide DM Push",
      keyword: "GUIDE",
      platform: "instagram",
      startsOn: now,
      endsOn: addDays(now, 14),
    },
  });

  const checklistCampaign = await prisma.campaign.upsert({
    where: { keyword: "CHECKLIST" },
    update: {
      name: "Launch Checklist Sprint",
      platform: "tiktok",
      startsOn: subDays(now, 7),
      endsOn: addDays(now, 7),
    },
    create: {
      name: "Launch Checklist Sprint",
      keyword: "CHECKLIST",
      platform: "tiktok",
      startsOn: subDays(now, 7),
      endsOn: addDays(now, 7),
    },
  });

  const scripts = [
    {
      name: "Warm DM Pitch",
      category: "pitch",
      body:
        "Hey there! Appreciate you reaching out about the DM system. I put together a friendly walkthrough called {{product}}. Want me to send the quick overview?",
    },
    {
      name: "Qualify Interest",
      category: "qualify",
      body:
        "Love that energy! Before I send {{product}}, tell me about your launch goals so I can highlight the best section for you.",
    },
    {
      name: "Objection Helper",
      category: "objections",
      body:
        "Totally hear you. Most creators felt the same until they followed the 3 DM prompts in {{product}}—it keeps convos natural and still converts.",
    },
    {
      name: "Checkout Invite",
      category: "checkout",
      body:
        "Ready when you are! Grab {{product}} for {{price}} and I’ll DM the delivery instantly. Want the secure link?",
    },
    {
      name: "Delivery Cheer",
      category: "delivery",
      body:
        "Just sent the download 🎉 You’ll find the swipe copy and the DM triggers in chapter 2. Ping me if you want me to review your next post!",
    },
    {
      name: "Follow-up Nudge",
      category: "objections",
      body:
        "Quick nudge—slots for feedback on {{product}} buyers close tonight. Want me to hold one for you?",
    },
  ];

  for (const script of scripts) {
    await prisma.script.upsert({
        where: { name: script.name },
        update: script,
        create: script,
      });
  }

  await prisma.setting.upsert({
    where: { id: 1 },
    update: {
      brandName: "DM Commerce OS",
      primaryHex: "#6366F1",
      logoPath: null,
    },
    create: {
      brandName: "DM Commerce OS",
      primaryHex: "#6366F1",
      logoPath: null,
    },
  });

  await prisma.commerceEvent.deleteMany();
  await prisma.message.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();

  await prisma.coupon.upsert({
    where: { code: "LAUNCH20" },
    update: {
      kind: "percent",
      amount: 20,
      active: true,
      maxRedemptions: 100,
      redemptionCount: 1,
      startsAt: subDays(now, 30),
      endsAt: addDays(now, 30),
    },
    create: {
      code: "LAUNCH20",
      kind: "percent",
      amount: 20,
      active: true,
      maxRedemptions: 100,
      redemptionCount: 1,
      startsAt: subDays(now, 30),
      endsAt: addDays(now, 30),
    },
  });

  const scenarios = [
    { name: "Taylor Demo", email: "taylor@example.com", daysAgo: 6, product: guideProduct, campaign: guideCampaign, objection: false },
    { name: "Jordan Creator", email: "jordan@example.com", daysAgo: 5, product: guideProduct, campaign: guideCampaign, objection: true },
    { name: "Alex Launch", email: "alex@example.com", daysAgo: 3, product: guideProduct, campaign: guideCampaign, objection: false },
    { name: "Morgan Ops", email: "morgan@example.com", daysAgo: 2, product: checklistProduct, campaign: checklistCampaign, objection: false },
    { name: "Riley Sprint", email: "riley@example.com", daysAgo: 1, product: checklistProduct, campaign: checklistCampaign, objection: true },
    { name: "Casey Beta", email: "casey@example.com", daysAgo: 0, product: guideProduct, campaign: guideCampaign, objection: false, couponCode: "LAUNCH20" },
  ];

  for (const [index, scenario] of scenarios.entries()) {
    const createdAt = subDays(now, scenario.daysAgo);
    const sessionId = `demo-session-${String(index + 1).padStart(2, "0")}`;
    const customer = await prisma.customer.create({
      data: { name: scenario.name, email: scenario.email },
    });
    const discountCents = scenario.couponCode
      ? Math.round(scenario.product.priceCents * 0.2)
      : 0;
    const order = await prisma.order.create({
      data: {
        productId: scenario.product.id,
        customerId: customer.id,
        campaignId: scenario.campaign.id,
        sessionId,
        status: "delivered",
        buyerName: scenario.name,
        buyerEmail: scenario.email,
        subtotalCents: scenario.product.priceCents,
        discountCents,
        totalCents: scenario.product.priceCents - discountCents,
        couponCode: scenario.couponCode ?? null,
        deliveredAt: new Date(createdAt.getTime() + 12 * 60 * 1000),
        createdAt,
      },
    });

    const event = (
      type: string,
      minutes: number,
      properties: Record<string, string | number | boolean | null> = {},
    ) => ({
      type,
      sessionId,
      campaignId: scenario.campaign.id,
      productId: scenario.product.id,
      orderId: type.startsWith("checkout.") || type.startsWith("order.") || type.startsWith("delivery.") ? order.id : null,
      propertiesJson: encodeEventProperties(properties),
      createdAt: new Date(createdAt.getTime() + minutes * 60 * 1000),
    });

    await prisma.commerceEvent.createMany({
      data: [
        event(commerceEventTypes.conversationStarted, -18, { channel: "fixture" }),
        event(commerceEventTypes.messageReceived, -18, { role: "user" }),
        event(commerceEventTypes.flowStageReached, -17, { stage: "pitch" }),
        ...(scenario.objection
          ? [
              event(commerceEventTypes.objectionRaised, -14, { stage: "objection" }),
              event(commerceEventTypes.flowStageReached, -14, { stage: "objection" }),
            ]
          : []),
        event(commerceEventTypes.flowStageReached, -10, { stage: "qualify" }),
        event(commerceEventTypes.flowStageReached, -4, { stage: "checkout" }),
        event(commerceEventTypes.checkoutStarted, 0, { provider: "mock-payment" }),
        event(commerceEventTypes.orderCompleted, 1, { totalCents: scenario.product.priceCents - discountCents }),
        event(commerceEventTypes.deliveryCompleted, 2, { provider: "local-file" }),
      ],
    });
  }
}

export async function resetDemoData(
  prisma: PrismaClient,
  options: { projectRoot?: string } = {},
) {
  const previousSetting = await prisma.setting.findUnique({
    where: { id: 1 },
    select: { logoPath: true },
  });

  await prisma.$transaction(
    async (transaction) => {
      await transaction.commerceEvent.deleteMany();
      await transaction.message.deleteMany();
      await transaction.order.deleteMany();
      await transaction.customer.deleteMany();
      await transaction.product.deleteMany();
      await transaction.campaign.deleteMany();
      await transaction.coupon.deleteMany();
      await transaction.script.deleteMany();
      await transaction.setting.deleteMany();
      await runDemoSeed(transaction);
    },
    { timeout: 30_000 },
  );

  let managedLogoRemoved = false;
  let managedLogoCleanupFailed = false;
  try {
    managedLogoRemoved = await removeManagedLogoUpload(
      previousSetting?.logoPath,
      options.projectRoot,
    );
  } catch (error) {
    managedLogoCleanupFailed = true;
    console.error("Demo reset could not remove the previous managed logo", error);
  }

  return { managedLogoRemoved, managedLogoCleanupFailed };
}
