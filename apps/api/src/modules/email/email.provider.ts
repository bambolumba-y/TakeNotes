import { env } from '../../config/env'

export interface EmailPayload {
  toEmail: string
  subject: string
  html: string
  text?: string
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send transactional email via Resend.
 */
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  if (!env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set — skipping email send')
    return { success: false, error: 'Email not configured' }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [payload.toEmail],
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { message?: string }
    return { success: false, error: err.message ?? `Resend API error ${response.status}` }
  }

  const data = await response.json() as { id: string }
  return { success: true, messageId: data.id }
}

export function buildReminderEmailHtml(opts: {
  title: string
  dueAt: string
  description?: string | null
  deepLink: string
}): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${opts.title}</title></head>
<body style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#f5f7fb;">
  <div style="background:#ffffff;border-radius:16px;padding:24px;border:1px solid #e4e7ec;">
    <h2 style="color:#111827;margin:0 0 8px">🔔 ${opts.title}</h2>
    <p style="color:#667085;font-size:14px;margin:0 0 16px">
      Due: ${new Date(opts.dueAt).toLocaleString()}
    </p>
    ${opts.description ? `<p style="color:#374151;font-size:15px;margin:0 0 16px">${opts.description}</p>` : ''}
    <a href="${opts.deepLink}" style="display:inline-block;background:#5B7CFA;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">
      Open Reminder
    </a>
  </div>
  <p style="color:#98a2b3;font-size:12px;text-align:center;margin-top:16px;">
    TakeNotes · Manage your notification settings in the app.
  </p>
</body>
</html>`
}
