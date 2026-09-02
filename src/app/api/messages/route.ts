import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { messageSchema } from "@/lib/validators";
import { requireAuthCookie } from "@/lib/auth";
import { commerceEventTypes, encodeEventProperties } from "@/lib/events";
import { parseStageFromText } from "@/lib/stateMachines/dmFlow";
import { isTrustedMutationRequest } from "@/lib/security/request";

export async function GET(request: Request) {
  if (!requireAuthCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const messages = await prisma.message.findMany({
    where: { sessionId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(messages);
}

export async function POST(request: Request) {
  if (!requireAuthCookie(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isTrustedMutationRequest(request)) {
    return NextResponse.json({ error: "Cross-origin mutation rejected" }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  if (!payload) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = messageSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { campaignId, productId, ...messageData } = parsed.data;
  const [campaign, product] = await Promise.all([
    campaignId ? prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true } }) : null,
    productId ? prisma.product.findUnique({ where: { id: productId }, select: { id: true } }) : null,
  ]);
  if ((campaignId && !campaign) || (productId && !product)) {
    return NextResponse.json({ error: "Conversation attribution is invalid" }, { status: 400 });
  }
  const parsedStage =
    messageData.role === "assistant" ? parseStageFromText(messageData.text).stage : undefined;

  const message = await prisma.$transaction(async (transaction) => {
    const existingMessages = await transaction.message.count({
      where: { sessionId: messageData.sessionId },
    });
    const created = await transaction.message.create({ data: messageData });
    const events = [];
    if (messageData.role === "user") {
      if (existingMessages === 0) {
        events.push({
          type: commerceEventTypes.conversationStarted,
          propertiesJson: encodeEventProperties({ channel: "local-simulator" }),
        });
      }
      events.push({
        type: commerceEventTypes.messageReceived,
        propertiesJson: encodeEventProperties({ role: "user" }),
      });
    }
    if (parsedStage) {
      events.push({
        type: commerceEventTypes.flowStageReached,
        propertiesJson: encodeEventProperties({ stage: parsedStage }),
      });
      if (parsedStage === "objection") {
        events.push({
          type: commerceEventTypes.objectionRaised,
          propertiesJson: encodeEventProperties({ stage: parsedStage }),
        });
      }
    }
    if (events.length) {
      await transaction.commerceEvent.createMany({
        data: events.map((event) => ({
          ...event,
          sessionId: messageData.sessionId,
          campaignId: campaignId ?? null,
          productId: productId ?? null,
        })),
      });
    }
    return created;
  });
  return NextResponse.json(message, { status: 201 });
}
