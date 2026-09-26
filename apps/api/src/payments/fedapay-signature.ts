import { createHmac, timingSafeEqual } from "node:crypto";

export const FEDAPAY_SIGNATURE_TOLERANCE_SECONDS = 300;

// Same scheme as the official fedapay-node SDK (Webhook.constructEvent):
// header "t=<timestamp>,s=<hex>", hex = HMAC-SHA256(secret, "<timestamp>.<raw body>").
export function verifyFedaPaySignature(
  rawBody: string | Buffer,
  header: string | undefined,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!header) return false;

  let timestamp: string | undefined;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key === "t") timestamp = value;
    if (key === "s" && value) signatures.push(value);
  }

  if (!timestamp || !/^\d+$/.test(timestamp) || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - Number(timestamp)) > FEDAPAY_SIGNATURE_TOLERANCE_SECONDS) return false;

  const payload = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  const expected = Buffer.from(
    createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest("hex"),
    "utf8",
  );

  return signatures.some((signature) => {
    const actual = Buffer.from(signature, "utf8");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}
