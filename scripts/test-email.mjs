#!/usr/bin/env node
// Quick smoke-test for Resend.
// Usage: node scripts/test-email.mjs your@email.com

const to = process.argv[2];
if (!to) {
  console.error("Usage: node scripts/test-email.mjs your@email.com");
  process.exit(1);
}

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
  console.error("RESEND_API_KEY is not set");
  process.exit(1);
}

const appUrl = process.env.APP_URL ?? "https://oche.cloud";
const domain = process.env.RESEND_FROM_DOMAIN ?? new URL(appUrl).hostname;

console.log(`Sending test email to ${to} via Resend (from noreply@${domain})…`);

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: `OCHE <noreply@${domain}>`,
    to,
    subject: "OCHE email test",
    html: "<p>If you see this, Resend is working.</p>",
  }),
});

const body = await res.json();
if (res.ok) {
  console.log("✓ Email queued — Resend id:", body.id);
  console.log("  Check the Resend dashboard → Emails for delivery status.");
} else {
  console.error("✗ Resend error", res.status, JSON.stringify(body, null, 2));
}
