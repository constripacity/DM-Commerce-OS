export const commerceEventTypes = {
  conversationStarted: "conversation.started",
  messageReceived: "message.received",
  flowStageReached: "flow.stage_reached",
  objectionRaised: "flow.objection_raised",
  checkoutStarted: "checkout.started",
  orderCompleted: "order.completed",
  deliveryCompleted: "delivery.completed",
} as const;

export type CommerceEventType =
  (typeof commerceEventTypes)[keyof typeof commerceEventTypes];

export function encodeEventProperties(
  properties: Record<string, string | number | boolean | null | undefined>,
) {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(properties).filter(([, value]) => value !== undefined),
    ),
  );
}

export function decodeEventProperties(value: string | null) {
  if (!value) return {} as Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Corrupt optional metadata must not make analytics unavailable.
  }
  return {} as Record<string, unknown>;
}
