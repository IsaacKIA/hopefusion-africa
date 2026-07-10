/**
 * HopeFusion Africa — Email Service
 *
 * Priority chain:
 *  1. Resend API  (if RESEND_API_KEY is set)           — recommended, no SMTP config needed
 *  2. Nodemailer SMTP (if SMTP_PASS is a real value)   — Gmail, Zoho, custom SMTP
 *  3. Console fallback                                  — dev/staging, logs OTP to terminal
 */

import nodemailer from 'nodemailer';

/* ─── Resend (lazy-loaded only if key exists) ───────────────────────────── */
let _resend = null;
async function getResend() {
  if (_resend) return _resend;
  const { Resend } = await import('resend');
  _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

/* ─── SMTP transporter (lazy, validated) ────────────────────────────────── */
function isSmtpConfigured() {
  const pass = process.env.SMTP_PASS || '';
  return (
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    pass.length > 0 &&
    pass !== 'your_app_password' &&
    !pass.startsWith('your_')
  );
}

function createSmtpTransport() {
  return nodemailer.createTransport({
    host:    process.env.SMTP_HOST,
    port:    parseInt(process.env.SMTP_PORT || '587'),
    secure:  parseInt(process.env.SMTP_PORT || '587') === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 8000,
    greetingTimeout:   5000,
    socketTimeout:     10000,
  });
}

/* ─── HTML email templates ──────────────────────────────────────────────── */
export function buildOTPEmail(firstName, code, type = 'verify') {
  const isReset   = type === 'reset';
  const heading   = isReset ? 'Password Reset Code' : 'Welcome to HopeFusion Africa!';
  const intro     = isReset
    ? 'Your password reset verification code is:'
    : 'Thank you for registering. Your verification code is:';
  const note      = isReset
    ? 'This code will expire in 30 minutes. If you did not request a password reset, you can safely ignore this email.'
    : 'This code will expire in 10 minutes. If you did not make this request, you can safely ignore this email.';

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#F4F5F7;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F5F7;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0f5233 0%,#2DB562 100%);padding:32px 40px;text-align:center;">
            <div style="font-size:11px;font-weight:600;letter-spacing:0.2em;color:rgba(255,255,255,0.7);margin-bottom:8px;text-transform:uppercase;">HopeFusion Africa</div>
            <div style="font-size:24px;font-weight:700;color:#ffffff;line-height:1.2;">${heading}</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="color:#3D3D3D;font-size:16px;line-height:1.7;margin:0 0 16px;">Hi ${firstName},</p>
            <p style="color:#3D3D3D;font-size:15px;line-height:1.7;margin:0 0 28px;">${intro}</p>

            <!-- OTP Box -->
            <div style="background:#E9F9EF;border:2px solid #2DB562;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
              <div style="font-size:42px;font-weight:800;letter-spacing:12px;color:#0f5233;font-family:'Courier New',monospace;">${code}</div>
            </div>

            <p style="color:#6b6b6b;font-size:13px;line-height:1.7;margin:0 0 28px;">${note}</p>

            <div style="border-top:1px solid #e4e4e4;padding-top:24px;text-align:center;">
              <p style="color:#2DB562;font-size:12px;font-weight:600;margin:0 0 4px;letter-spacing:0.05em;">EMPOWER. INNOVATE. THRIVE.</p>
              <p style="color:#aaa;font-size:11px;margin:0;">© ${new Date().getFullYear()} HopeFusion Africa · <a href="https://hopefusionafrica.com" style="color:#aaa;">hopefusionafrica.com</a></p>
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();
}

/* ─── Core send function ────────────────────────────────────────────────── */
/**
 * Send a transactional email.
 * @param {string} to      - recipient email
 * @param {string} subject - email subject
 * @param {string} html    - HTML body
 * @returns {Promise<{provider: string, id?: string}>}
 */
export async function sendEmail(to, subject, html) {
  const from = process.env.RESEND_FROM || process.env.SMTP_FROM || 'HopeFusion Africa <info@hopefusionafrica.com>';

  if (process.env.NODE_ENV === 'test') {
    return { provider: 'mock' };
  }

  // Execute email sending in the background to avoid blocking the HTTP response
  (async () => {
    /* 1 ─ Resend API */
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = await getResend();
        const { data, error } = await resend.emails.send({ from, to, subject, html });
        if (error) throw new Error(error.message);
        console.log(`[Email] Sent via Resend → ${to} (id: ${data?.id})`);
        return;
      } catch (err) {
        console.error('[Email] Resend failed, trying SMTP fallback:', err.message);
      }
    }

    /* 2 ─ SMTP / nodemailer */
    if (isSmtpConfigured()) {
      try {
        const transport = createSmtpTransport();
        const info = await transport.sendMail({ from, to, subject, html });
        console.log(`[Email] Sent via SMTP → ${to} (msgId: ${info.messageId})`);
        return;
      } catch (err) {
        console.error('[Email] SMTP failed:', err.message);
      }
    }

    /* 3 ─ Console fallback (development / no credentials configured) */
    const otp = html.match(/\b(\d{6})\b/)?.[1] || '(see HTML)';
    console.log('\n' + '═'.repeat(60));
    console.log('📧  EMAIL NOT SENT — DEV CONSOLE FALLBACK');
    console.log('═'.repeat(60));
    console.log(`  To      : ${to}`);
    console.log(`  Subject : ${subject}`);
    console.log(`  OTP Code: ${otp}`);
    console.log('  Fix: Set RESEND_API_KEY in .env (https://resend.com)');
    console.log('═'.repeat(60) + '\n');
  })();

  // Return immediately to indicate asynchronous sending
  return { provider: 'async' };
}

