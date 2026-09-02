#!/usr/bin/env node

const baseUrl = process.env.DM_COMMERCE_BASE_URL ?? "http://127.0.0.1:3000";
const productionMode = process.argv.includes("--production");
const baseOrigin = new URL(baseUrl).origin;
const smokeLogo = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
  0xae, 0x42, 0x60, 0x82,
]);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function main() {
  const landing = await fetch(baseUrl);
  assert(landing.ok, `Landing page returned ${landing.status}`);

  const anonymous = await fetch(`${baseUrl}/api/products`);
  assert(anonymous.status === 401, "Products API must reject an anonymous request");

  const login = await fetch(`${baseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: baseOrigin },
    body: JSON.stringify({ email: "demo@local.test", password: "demo123" }),
  });
  assert(login.ok, `Demo login returned ${login.status}`);
  const setCookie = login.headers.getSetCookie?.()[0] ?? login.headers.get("set-cookie");
  assert(setCookie, "Demo login did not set a session cookie");
  const cookie = setCookie.split(";", 1)[0];
  const authenticatedHeaders = { Cookie: cookie };

  const [productsResponse, campaignsResponse, analyticsResponse, flowResponse] =
    await Promise.all([
      fetch(`${baseUrl}/api/products`, { headers: authenticatedHeaders }),
      fetch(`${baseUrl}/api/campaigns`, { headers: authenticatedHeaders }),
      fetch(`${baseUrl}/api/analytics`, { headers: authenticatedHeaders }),
      fetch(`${baseUrl}/api/flow-packs`, { headers: authenticatedHeaders }),
    ]);
  for (const response of [
    productsResponse,
    campaignsResponse,
    analyticsResponse,
    flowResponse,
  ]) {
    assert(response.ok, `${new URL(response.url).pathname} returned ${response.status}`);
  }

  const products = (await productsResponse.json()) as Array<{ filePath: string }>;
  const campaigns = (await campaignsResponse.json()) as unknown[];
  const analytics = (await analyticsResponse.json()) as {
    totals?: { orders?: number };
    funnel?: unknown[];
  };
  const flow = (await flowResponse.json()) as {
    schemaVersion?: number;
    steps?: unknown[];
  };
  assert(products.length >= 2, "Seeded product catalogue is incomplete");
  assert(campaigns.length >= 2, "Seeded campaign catalogue is incomplete");
  assert((analytics.totals?.orders ?? 0) >= 6, "Event-backed analytics did not load seeded orders");
  assert((analytics.funnel?.length ?? 0) >= 4, "Analytics funnel is incomplete");
  assert(flow.schemaVersion === 1, "Flow pack schema version is unexpected");
  assert((flow.steps?.length ?? 0) >= 4, "Exported flow pack is incomplete");

  const delivery = await fetch(`${baseUrl}${products[0].filePath}`);
  assert(delivery.ok, `Seeded delivery returned ${delivery.status}`);
  assert(
    delivery.headers.get("content-type")?.startsWith("application/pdf"),
    "Seeded delivery did not use the PDF content type",
  );
  assert(
    delivery.headers.get("content-disposition")?.startsWith("inline;"),
    "Seeded delivery did not declare an inline filename",
  );
  assert(
    Buffer.from(await delivery.arrayBuffer()).subarray(0, 5).toString("ascii") === "%PDF-",
    "Seeded delivery bytes are not a PDF",
  );

  const rejected = await fetch(`${baseUrl}/api/demo-reset`, {
    method: "POST",
    headers: {
      ...authenticatedHeaders,
      Origin: "https://attacker.example",
      "Sec-Fetch-Site": "cross-site",
    },
  });
  assert(rejected.status === 403, "Cross-origin mutation was not rejected");

  if (productionMode) {
    const settingsResponse = await fetch(`${baseUrl}/api/settings`, {
      headers: authenticatedHeaders,
    });
    assert(settingsResponse.ok, `Settings API returned ${settingsResponse.status}`);
    const settings = (await settingsResponse.json()) as {
      brandName: string;
      primaryHex: string;
    };
    const form = new FormData();
    form.set("brandName", settings.brandName);
    form.set("primaryHex", settings.primaryHex);
    form.set("logoFile", new Blob([smokeLogo], { type: "image/png" }), "smoke.png");
    const uploadResponse = await fetch(`${baseUrl}/api/settings`, {
      method: "PUT",
      headers: { ...authenticatedHeaders, Origin: baseOrigin },
      body: form,
    });
    assert(uploadResponse.ok, `Production logo upload returned ${uploadResponse.status}`);
    const uploadedSettings = (await uploadResponse.json()) as { logoPath?: string };
    const uploadedLogoPath = uploadedSettings.logoPath;
    assert(
      typeof uploadedLogoPath === "string" && uploadedLogoPath.startsWith("/api/uploads/"),
      "Logo did not persist an API-served managed path",
    );

    const anonymousLogo = await fetch(`${baseUrl}${uploadedLogoPath}`);
    assert(anonymousLogo.status === 401, "Managed logo route must require authentication");
    const servedLogo = await fetch(`${baseUrl}${uploadedLogoPath}`, {
      headers: authenticatedHeaders,
    });
    assert(servedLogo.ok, `Managed logo route returned ${servedLogo.status}`);
    assert(
      Buffer.from(await servedLogo.arrayBuffer()).equals(smokeLogo),
      "Managed logo bytes changed between upload and production delivery",
    );
    const publicBypass = await fetch(
      `${baseUrl}${uploadedLogoPath.replace("/api/uploads/", "/uploads/")}`,
      { headers: authenticatedHeaders },
    );
    assert(publicBypass.status === 404, "Managed logo was exposed through public static files");

    const mutationHeaders = {
      ...authenticatedHeaders,
      "Content-Type": "application/json",
      Origin: baseOrigin,
    };
    const [extraProduct, extraScript] = await Promise.all([
      fetch(`${baseUrl}/api/products`, {
        method: "POST",
        headers: mutationHeaders,
        body: JSON.stringify({
          title: "Production smoke extra product",
          description: "A temporary product that deterministic reset must remove.",
          priceCents: 1200,
          filePath: "/files/creator-guide.pdf",
        }),
      }),
      fetch(`${baseUrl}/api/scripts`, {
        method: "POST",
        headers: mutationHeaders,
        body: JSON.stringify({
          name: "Production smoke extra script",
          category: "pitch",
          body: "A temporary script that deterministic reset must remove completely.",
        }),
      }),
    ]);
    assert(extraProduct.status === 201, `Smoke product create returned ${extraProduct.status}`);
    assert(extraScript.status === 201, `Smoke script create returned ${extraScript.status}`);

    const reset = await fetch(`${baseUrl}/api/demo-reset`, {
      method: "POST",
      headers: { ...authenticatedHeaders, Origin: baseOrigin },
    });
    assert(reset.ok, `Deterministic demo reset returned ${reset.status}`);
    const [resetProducts, resetScripts, resetSettings, removedLogo] = await Promise.all([
      fetch(`${baseUrl}/api/products`, { headers: authenticatedHeaders }),
      fetch(`${baseUrl}/api/scripts`, { headers: authenticatedHeaders }),
      fetch(`${baseUrl}/api/settings`, { headers: authenticatedHeaders }),
      fetch(`${baseUrl}${uploadedLogoPath}`, { headers: authenticatedHeaders }),
    ]);
    const resetProductRows = (await resetProducts.json()) as unknown[];
    const resetScriptRows = (await resetScripts.json()) as unknown[];
    const resetSetting = (await resetSettings.json()) as { logoPath?: string | null };
    assert(resetProductRows.length === 2, "Reset did not restore exactly two golden products");
    assert(resetScriptRows.length === 6, "Reset did not restore exactly six golden scripts");
    assert(resetSetting.logoPath === null, "Reset did not restore default logo settings");
    assert(removedLogo.status === 404, "Reset left the old managed logo reachable");
  }

  console.log(
    `Smoke PASS${productionMode ? " (production mutations/reset)" : ""}: ${products.length} products, ${campaigns.length} campaigns, ${analytics.totals?.orders} orders, ${flow.steps?.length} flow steps.`,
  );
}

main().catch((error) => {
  console.error(`Smoke FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
