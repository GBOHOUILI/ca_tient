import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyFedaPaySignature } from "./fedapay-signature.js";

const SECRET = "wh_sandbox_secret";
const BODY = JSON.stringify({ name: "transaction.approved", entity: { id: 12345, status: "approved" } });
const NOW = 1_790_000_000;

function sign(body: string, timestamp: number, secret = SECRET): string {
  const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`, "utf8").digest("hex");
  return `t=${timestamp},s=${signature}`;
}

describe("verifyFedaPaySignature", () => {
  it("accepts a correctly signed body", () => {
    expect(verifyFedaPaySignature(BODY, sign(BODY, NOW), SECRET, NOW)).toBe(true);
  });

  it("accepts a Buffer body", () => {
    expect(verifyFedaPaySignature(Buffer.from(BODY, "utf8"), sign(BODY, NOW), SECRET, NOW)).toBe(true);
  });

  it("rejects a signature made with another secret", () => {
    expect(verifyFedaPaySignature(BODY, sign(BODY, NOW, "autre"), SECRET, NOW)).toBe(false);
  });

  it("rejects a body altered by one character", () => {
    expect(verifyFedaPaySignature(BODY.replace("12345", "12346"), sign(BODY, NOW), SECRET, NOW)).toBe(false);
  });

  it("rejects a missing or malformed header", () => {
    expect(verifyFedaPaySignature(BODY, undefined, SECRET, NOW)).toBe(false);
    expect(verifyFedaPaySignature(BODY, "n'importe quoi", SECRET, NOW)).toBe(false);
    expect(verifyFedaPaySignature(BODY, `t=${NOW}`, SECRET, NOW)).toBe(false);
  });

  it("accepts a timestamp at the 300 s limit and rejects one beyond it", () => {
    expect(verifyFedaPaySignature(BODY, sign(BODY, NOW - 300), SECRET, NOW)).toBe(true);
    expect(verifyFedaPaySignature(BODY, sign(BODY, NOW - 301), SECRET, NOW)).toBe(false);
  });

  it("accepts the header when one of several signatures is valid", () => {
    const header = `t=${NOW},s=${"0".repeat(64)},${sign(BODY, NOW).split(",")[1]}`;

    expect(verifyFedaPaySignature(BODY, header, SECRET, NOW)).toBe(true);
  });
});
