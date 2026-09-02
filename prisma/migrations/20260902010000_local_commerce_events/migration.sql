-- Preserve product price and attribution at purchase time, normalize customers,
-- and add the event ledger that powers real local analytics.
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

INSERT INTO "Customer" ("id", "email", "name", "createdAt", "updatedAt")
SELECT lower(hex(randomblob(12))), lower("buyerEmail"), max("buyerName"), min("createdAt"), max("createdAt")
FROM "Order"
GROUP BY lower("buyerEmail");

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "campaignId" TEXT,
    "sessionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'delivered',
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "subtotalCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "couponCode" TEXT,
    "deliveredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Order_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Order" (
    "id", "productId", "customerId", "status", "buyerName", "buyerEmail",
    "subtotalCents", "discountCents", "totalCents", "deliveredAt", "createdAt", "updatedAt"
)
SELECT o."id", o."productId", c."id", 'delivered', o."buyerName", lower(o."buyerEmail"),
       p."priceCents", 0, p."priceCents", o."createdAt", o."createdAt", o."createdAt"
FROM "Order" o
JOIN "Product" p ON p."id" = o."productId"
JOIN "Customer" c ON c."email" = lower(o."buyerEmail");

DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE INDEX "Order_campaignId_idx" ON "Order"("campaignId");
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "maxRedemptions" INTEGER,
    "redemptionCount" INTEGER NOT NULL DEFAULT 0,
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

CREATE TABLE "CommerceEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "sessionId" TEXT,
    "campaignId" TEXT,
    "productId" TEXT,
    "orderId" TEXT,
    "propertiesJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommerceEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CommerceEvent_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CommerceEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "CommerceEvent_type_createdAt_idx" ON "CommerceEvent"("type", "createdAt");
CREATE INDEX "CommerceEvent_sessionId_createdAt_idx" ON "CommerceEvent"("sessionId", "createdAt");
CREATE INDEX "CommerceEvent_campaignId_createdAt_idx" ON "CommerceEvent"("campaignId", "createdAt");
