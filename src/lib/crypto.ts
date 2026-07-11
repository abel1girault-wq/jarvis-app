import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
function key() {
  const h = process.env.ENCRYPTION_KEY;
  if (!h || h.length !== 64) throw new Error("ENCRYPTION_KEY must be 64 hex chars. Run: openssl rand -hex 32");
  return Buffer.from(h, "hex");
}
export function encrypt(p: string) {
  const iv = randomBytes(12), k = key();
  const c = createCipheriv("aes-256-gcm", k, iv);
  const ct = Buffer.concat([c.update(p, "utf8"), c.final()]);
  return [iv.toString("hex"), c.getAuthTag().toString("hex"), ct.toString("hex")].join(".");
}
export function decrypt(payload: string) {
  const [iv, tag, ct] = payload.split(".");
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "hex"));
  d.setAuthTag(Buffer.from(tag, "hex"));
  return Buffer.concat([d.update(Buffer.from(ct, "hex")), d.final()]).toString("utf8");
}
export function last4(k: string) { return k.slice(-4); }
