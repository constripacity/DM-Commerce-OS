import { lstat } from "node:fs/promises";
import path from "node:path";

export interface PaymentRequest {
  amountCents: number;
  currency: "USD";
  customerEmail: string;
}

export interface PaymentAuthorization {
  provider: string;
  reference: string;
  status: "authorized";
}

export interface PaymentProvider {
  readonly id: string;
  authorize(request: PaymentRequest): Promise<PaymentAuthorization>;
}

export interface DeliveryRequest {
  filePath: string;
  customerEmail: string;
}

export interface DeliveryReceipt {
  provider: string;
  path: string;
  status: "ready";
}

export interface DeliveryProvider {
  readonly id: string;
  deliver(request: DeliveryRequest): Promise<DeliveryReceipt>;
}

/** Explicit sandbox adapter. It never contacts a payment network. */
export class MockPaymentProvider implements PaymentProvider {
  readonly id = "mock-payment";

  async authorize(request: PaymentRequest): Promise<PaymentAuthorization> {
    if (!Number.isSafeInteger(request.amountCents) || request.amountCents < 0) {
      throw new Error("Payment amount is invalid");
    }
    return {
      provider: this.id,
      reference: `mock_${crypto.randomUUID()}`,
      status: "authorized",
    };
  }
}

/** Local adapter that only exposes an existing regular file below public/files. */
export class LocalFileDeliveryProvider implements DeliveryProvider {
  readonly id = "local-file";

  async deliver(request: DeliveryRequest): Promise<DeliveryReceipt> {
    if (!/^\/files\/[A-Za-z0-9][A-Za-z0-9._-]*\.pdf$/.test(request.filePath)) {
      throw new Error("Delivery path is outside the local PDF library");
    }

    const filesRoot = path.resolve(process.cwd(), "public", "files");
    const absolute = path.resolve(
      process.cwd(),
      "public",
      request.filePath.replace(/^\//, ""),
    );
    if (!absolute.startsWith(`${filesRoot}${path.sep}`)) {
      throw new Error("Delivery path escaped the local file library");
    }

    const fileStat = await lstat(absolute);
    if (!fileStat.isFile()) throw new Error("Delivery asset is not a regular file");

    return { provider: this.id, path: request.filePath, status: "ready" };
  }
}

export const localCommerceProviders = {
  payment: new MockPaymentProvider(),
  delivery: new LocalFileDeliveryProvider(),
};
