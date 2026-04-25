// lib/email.ts — sends the magic login link via Resend

export async function sendMagicLink(to: string, url: string): Promise<void> {
  // Always log the link — handy for local dev where email isn't wired up
  console.log(`[magic-link] ${to} → ${url}`);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // dev mode: link is in the logs, skip Resend

  const appUrl = process.env.APP_URL ?? "https://oche.cloud";
  // Sending domain must be verified in Resend — can differ from APP_URL's hostname
  const domain = process.env.RESEND_FROM_DOMAIN ?? new URL(appUrl).hostname;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your OCHE login link</title>
</head>
<body style="margin:0;padding:0;background:#0a0e0c;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0e0c;padding:48px 16px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#141a17;border:1px solid #2a332d;border-radius:8px;overflow:hidden;max-width:480px;width:100%;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px;border-bottom:1px solid #2a332d;">
              <div style="font-size:36px;font-weight:900;letter-spacing:-1px;color:#d4ff3a;text-transform:uppercase;">OCHE</div>
              <div style="font-size:13px;color:#6d736f;margin-top:4px;font-style:italic;">Three darts. Zero math.</div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 8px;font-size:15px;color:#f2e8d0;">Someone (hopefully you) requested a login link for</p>
              <p style="margin:0 0 28px;font-size:15px;color:#d4ff3a;font-weight:600;">${to}</p>
              <p style="margin:0 0 24px;font-size:15px;color:#d8cdaf;">Click the button below to sign in. The link expires in <strong style="color:#f2e8d0;">15 minutes</strong>.</p>
              <a href="${url}" style="display:inline-block;background:#d4ff3a;color:#0a0e0c;font-size:15px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:6px;letter-spacing:0.5px;">
                Enter the oche →
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;border-top:1px solid #2a332d;">
              <p style="margin:0;font-size:12px;color:#454b47;">If you didn't request this, you can safely ignore it. This link can only be used once.</p>
              <p style="margin:8px 0 0;font-size:12px;color:#454b47;">${domain}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `OCHE <noreply@${domain}>`,
      to,
      subject: "Your OCHE login link",
      html,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error ${res.status}: ${body}`);
  }
}
