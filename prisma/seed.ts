import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { addDays, subDays } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("demo123", 12);

  await prisma.user.upsert({
    where: { email: "demo@local.test" },
    update: {},
    create: {
      email: "demo@local.test",
      password,
    },
  });

  const products = await prisma.$transaction(
    [
      {
        title: "Creator DM Guide",
        description:
          "A step-by-step playbook for converting warm leads in the DMs without sounding salesy.",
        priceCents: 2900,
        filePath: "/files/creator-guide.pdf",
      },
      {
        title: "Launch Checklist",
        description:
          "A punchy pre-launch checklist covering content, DMs, and fulfillment so nothing slips through.",
        priceCents: 1900,
        filePath: "/files/checklist.pdf",
      },
    ].map((product) =>
      prisma.product.upsert({
        where: { title: product.title },
        update: product,
        create: product,
      })
    )
  );

  const [guideProduct] = products;

  await prisma.campaign.upsert({
    where: { keyword: "GUIDE" },
    update: {
      name: "Creator Guide DM Push",
      platform: "instagram",
      startsOn: new Date(),
      endsOn: addDays(new Date(), 14),
    },
    create: {
      name: "Creator Guide DM Push",
      keyword: "GUIDE",
      platform: "instagram",
      startsOn: new Date(),
      endsOn: addDays(new Date(), 14),
    },
  });

  const scripts = [
    {
      name: "Warm DM Pitch",
      category: "pitch",
      body:
        "Hey {{name}}! Appreciate you reaching out about the DM system. I put together a friendly walkthrough called {{product}}. Want me to send the quick overview?",
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

  await Promise.all(
    scripts.map((script) =>
      prisma.script.upsert({
        where: { name: script.name },
        update: script,
        create: script,
      })
    )
  );

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

  await prisma.order.deleteMany();

  const now = new Date();
  await prisma.order.createMany({
    data: [
      {
        productId: guideProduct.id,
        buyerName: "Taylor Demo",
        buyerEmail: "taylor@example.com",
        createdAt: subDays(now, 6),
      },
      {
        productId: guideProduct.id,
        buyerName: "Jordan Creator",
        buyerEmail: "jordan@example.com",
        createdAt: subDays(now, 5),
      },
      {
        productId: guideProduct.id,
        buyerName: "Alex Launch",
        buyerEmail: "alex@example.com",
        createdAt: subDays(now, 3),
      },
      {
        productId: products[1].id,
        buyerName: "Morgan Ops",
        buyerEmail: "morgan@example.com",
        createdAt: subDays(now, 2),
      },
      {
        productId: products[1].id,
        buyerName: "Riley Sprint",
        buyerEmail: "riley@example.com",
        createdAt: subDays(now, 1),
      },
      {
        productId: guideProduct.id,
        buyerName: "Casey Beta",
        buyerEmail: "casey@example.com",
        createdAt: now,
      },
    ],
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
