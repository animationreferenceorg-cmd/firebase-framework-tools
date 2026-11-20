/**
 * Zero-dependency Amazon SES v2 HTTP client using Node.js native crypto (AWS SigV4).
 *
 * Cost: ~$0.10 per 1,000 emails ($1.90 for 19,000 users), $0 monthly base fee.
 *
 * Required env vars:
 *   AWS_SES_ACCESS_KEY_ID
 *   AWS_SES_SECRET_ACCESS_KEY
 * Optional env vars:
 *   AWS_SES_REGION (default: us-east-1)
 *   SES_FROM_EMAIL (default: RESEND_FROM_EMAIL or "Animation Reference <team@animationreference.org>")
 *   AWS_SES_CONFIGURATION_SET (optional SES configuration set for bounce/open tracking)
 */

import crypto from 'crypto';

const SERVICE = 'ses';

export interface SesEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export interface SesSendResult {
  success: boolean;
  provider: 'amazon_ses';
  messageId?: string;
  error?: string;
}

export function isSesConfigured(): boolean {
  if (process.env.EMAIL_PROVIDER?.toLowerCase() === 'resend') {
    return false;
  }
  return Boolean(
    process.env.AWS_SES_ACCESS_KEY_ID?.trim() &&
    process.env.AWS_SES_SECRET_ACCESS_KEY?.trim()
  );
}

function sha256Hex(data: string): string {
  return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data, 'utf8').digest();
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<\/(p|div|h1|h2|h3|li|br|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function sendEmailViaSes(input: SesEmailInput): Promise<SesSendResult> {
  const accessKeyId = process.env.AWS_SES_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SES_SECRET_ACCESS_KEY?.trim();
  const region = (process.env.AWS_SES_REGION || 'us-east-1').trim();

  if (!accessKeyId || !secretAccessKey) {
    return { success: false, provider: 'amazon_ses', error: 'AWS SES credentials not configured.' };
  }

  const fromEmail =
    input.from ||
    process.env.SES_FROM_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    'Animation Reference <team@animationreference.org>';

  const toAddresses = Array.isArray(input.to) ? input.to : [input.to];
  const host = `email.${region}.amazonaws.com`;
  const path = '/v2/email/outbound-emails';
  const endpoint = `https://${host}${path}`;

  const payloadObj: Record<string, unknown> = {
    FromEmailAddress: fromEmail,
    Destination: {
      ToAddresses: toAddresses,
    },
    Content: {
      Simple: {
        Subject: { Data: input.subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: input.html, Charset: 'UTF-8' },
          Text: { Data: input.text || htmlToPlainText(input.html), Charset: 'UTF-8' },
        },
      },
    },
  };

  if (input.replyTo) {
    payloadObj.ReplyToAddresses = [input.replyTo];
  }
  const configSet = process.env.AWS_SES_CONFIGURATION_SET?.trim();
  if (configSet) {
    payloadObj.ConfigurationSetName = configSet;
  }

  const body = JSON.stringify(payloadObj);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = sha256Hex(body);

  const canonicalHeaders =
    `content-type:application/json\n` +
    `host:${host}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-date';

  const canonicalRequest = [
    'POST',
    path,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const credentialScope = `${dateStamp}/${region}/${SERVICE}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join('\n');

  const kDate = hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, SERVICE);
  const kSigning = hmacSha256(kService, 'aws4_request');
  const signature = crypto
    .createHmac('sha256', kSigning)
    .update(stringToSign, 'utf8')
    .digest('hex');

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Host: host,
        'X-Amz-Date': amzDate,
        Authorization: authorization,
      },
      body,
    });

    const rawText = await res.text();
    let parsed: Record<string, any> = {};
    try {
      parsed = rawText ? JSON.parse(rawText) : {};
    } catch {}

    if (!res.ok) {
      const msg = parsed.message || parsed.Message || rawText || `SES HTTP ${res.status}`;
      console.error('[Amazon SES] Send failed:', res.status, msg);
      return { success: false, provider: 'amazon_ses', error: String(msg) };
    }

    return {
      success: true,
      provider: 'amazon_ses',
      messageId: parsed.MessageId,
    };
  } catch (err: any) {
    console.error('[Amazon SES] Network error:', err);
    return {
      success: false,
      provider: 'amazon_ses',
      error: err?.message || 'Amazon SES request failed',
    };
  }
}
