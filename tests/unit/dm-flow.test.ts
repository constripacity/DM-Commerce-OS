import { describe, expect, it } from "vitest";
import {
  classifyDMIntent,
  fillTemplate,
  getNextAutoReply,
  type DMFlowContext,
} from "@/lib/stateMachines/dmFlow";

const base: DMFlowContext = {
  messages: [],
  latestUserMessage: "GUIDE",
  keyword: "GUIDE",
  scripts: {
    pitch: "Pitch for {{product}}",
    qualify: "Qualify {{product}}",
    objection: "Handle objection for {{product}}",
    checkout: "Buy {{product}} for {{price}}",
    delivery: "Delivered {{product}}",
  },
  product: { title: "Creator Guide", priceCents: 2900 },
};

describe("deterministic DM flow", () => {
  it("matches signals on token boundaries rather than substrings", () => {
    expect(classifyDMIntent("GUIDE", "GUIDE")).toBe("keyword");
    expect(classifyDMIntent("I said yes", "GUIDE")).toBe("interest");
    expect(classifyDMIntent("yesterday was busy", "GUIDE")).toBe("neutral");
    expect(classifyDMIntent("somewhere else", "GUIDE")).toBe("neutral");
  });

  it("prioritizes an objection over generic interest", () => {
    expect(classifyDMIntent("Yes, but it is too expensive", "GUIDE")).toBe("objection");
  });

  it.each(["YES", "BUY", "PRICE", "LATER", "GUIDE"])(
    "starts an unstarted flow when the configured %s keyword overlaps intent vocabulary",
    (keyword) => {
      expect(
        getNextAutoReply({ ...base, keyword, latestUserMessage: keyword }),
      ).toMatchObject({ stage: "pitch", intent: "keyword" });
    },
  );

  it("restores ordinary intent priority after the pitch has started", () => {
    const started: DMFlowContext = {
      ...base,
      messages: [{ role: "assistant", text: "pitch", stage: "pitch" }],
    };
    expect(
      getNextAutoReply({ ...started, keyword: "YES", latestUserMessage: "YES" }),
    ).toMatchObject({ stage: "qualify", intent: "interest" });
    expect(
      getNextAutoReply({ ...started, keyword: "LATER", latestUserMessage: "LATER" }),
    ).toMatchObject({ stage: "objection", intent: "objection" });
    expect(
      getNextAutoReply({
        ...started,
        keyword: "BUY",
        latestUserMessage: "BUY",
        messages: [
          ...started.messages,
          { role: "assistant", text: "qualify", stage: "qualify" },
        ],
      }),
    ).toMatchObject({ stage: "checkout", intent: "checkout" });
  });

  it("moves through explicit stages and will not deliver prematurely", () => {
    expect(getNextAutoReply(base)).toMatchObject({ stage: "pitch", intent: "keyword" });
    expect(
      getNextAutoReply({ ...base, latestUserMessage: "I paid already" }),
    ).toBeNull();
    expect(
      getNextAutoReply({
        ...base,
        messages: [{ role: "assistant", text: "pitch", stage: "pitch" }],
        latestUserMessage: "Maybe later, too expensive",
      }),
    ).toMatchObject({ stage: "objection", intent: "objection" });
  });

  it("keeps unknown template variables visible for safe editing", () => {
    expect(fillTemplate("{{product}} for {{unknown}}", { product: "Guide" })).toBe(
      "Guide for {{unknown}}",
    );
  });
});
