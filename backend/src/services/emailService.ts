import { google } from 'googleapis';

const OAuth2 = google.auth.OAuth2;

function getOAuth2Client() {
  const client = new OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );

  client.setCredentials({
    refresh_token: process.env.GMAIL_REFRESH_TOKEN,
  });

  return client;
}

export async function sendEmail(
  to: string,
  subject: string,
  message: string,
  from?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Check if Gmail credentials are configured
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_REFRESH_TOKEN) {
      console.warn('[Email] Gmail API credentials not configured. Email not sent.');
      return {
        success: false,
        error: 'Gmail API credentials not configured. Please set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REDIRECT_URI, and GMAIL_REFRESH_TOKEN in .env',
      };
    }

    const auth = getOAuth2Client();
    const gmail = google.gmail({ version: 'v1', auth });

    const fromEmail = from || process.env.GMAIL_FROM_EMAIL || 'complaints@unionbank.in';

    // Create the email in RFC 2822 format
    const emailContent = [
      `From: ComplaintIQ <${fromEmail}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      '',
      message.replace(/\n/g, '<br>'),
    ].join('\r\n');

    const encodedEmail = Buffer.from(emailContent)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
      },
    });

    return {
      success: true,
      messageId: result.data.id || undefined,
    };
  } catch (error: any) {
    console.error('[Email] Send error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
}
