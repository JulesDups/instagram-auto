// Generates an HMAC-signed draft token using DRAFT_TOKEN_SECRET from process.env.
// Usage: DRAFT_TOKEN_SECRET=... node .scripts/gen-token.js <draftId> <publish|reject> [ttlSeconds]
const crypto = require("crypto");

const draftId = process.argv[2];
const action = process.argv[3];
const ttl = parseInt(process.argv[4] || "3600", 10);

if (!draftId || !action) {
  console.error("Usage: gen-token.js <draftId> <publish|reject> [ttlSeconds]");
  process.exit(1);
}

const secret = process.env.DRAFT_TOKEN_SECRET;
if (!secret) {
  console.error("DRAFT_TOKEN_SECRET env var is required");
  process.exit(1);
}

const b64url = (input) =>
  Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const payload = JSON.stringify({
  draftId,
  action,
  exp: Math.floor(Date.now() / 1000) + ttl,
});

const body = b64url(payload);
const sig = crypto
  .createHmac("sha256", secret)
  .update(body)
  .digest("base64")
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=+$/, "");

process.stdout.write(`${body}.${sig}`);
