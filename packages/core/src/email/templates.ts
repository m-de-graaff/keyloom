/**
 * Default email templates for magic link authentication
 */

import type { EmailTemplate, MagicLinkEmailData } from './types'

/**
 * Default magic link email template
 */
export const defaultMagicLinkTemplate: EmailTemplate = {
  subject: (data: MagicLinkEmailData) => 
    `Sign in to ${data.appName}`,

  html: (data: MagicLinkEmailData) => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sign in to ${data.appName}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9f9f9;
        }
        .container {
          background-color: white;
          padding: 40px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .title {
          color: #1a1a1a;
          font-size: 24px;
          font-weight: 600;
          margin: 0 0 10px 0;
        }
        .subtitle {
          color: #666;
          font-size: 16px;
          margin: 0;
        }
        .button {
          display: inline-block;
          background-color: #007bff;
          color: white;
          text-decoration: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-weight: 500;
          margin: 20px 0;
          text-align: center;
        }
        .button:hover {
          background-color: #0056b3;
        }
        .link-container {
          text-align: center;
          margin: 30px 0;
        }
        .footer {
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          font-size: 14px;
          color: #666;
        }
        .security-note {
          background-color: #f8f9fa;
          border-left: 4px solid #007bff;
          padding: 15px;
          margin: 20px 0;
          border-radius: 4px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="title">Sign in to ${data.appName}</h1>
          <p class="subtitle">${data.userName ? `Hi ${data.userName},` : 'Hi there,'}</p>
        </div>
        
        <p>Click the button below to sign in to your account. This link will expire in ${data.expirationMinutes} minutes.</p>
        
        <div class="link-container">
          <a href="${data.magicLinkUrl}" class="button">Sign In</a>
        </div>
        
        <div class="security-note">
          <strong>Security Note:</strong> If you didn't request this sign-in link, you can safely ignore this email. The link will expire automatically.
        </div>
        
        <div class="footer">
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #007bff;">${data.magicLinkUrl}</p>
          <p style="margin-top: 20px;">This email was sent to ${data.email}. If you have any questions, please contact our support team.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  text: (data: MagicLinkEmailData) => `
Sign in to ${data.appName}

${data.userName ? `Hi ${data.userName},` : 'Hi there,'}

Click the link below to sign in to your account. This link will expire in ${data.expirationMinutes} minutes.

${data.magicLinkUrl}

Security Note: If you didn't request this sign-in link, you can safely ignore this email. The link will expire automatically.

This email was sent to ${data.email}. If you have any questions, please contact our support team.
  `.trim()
}

/**
 * Create a custom magic link template
 */
export function createMagicLinkTemplate(
  customTemplate: Partial<EmailTemplate>
): EmailTemplate {
  return {
    subject: customTemplate.subject || defaultMagicLinkTemplate.subject,
    html: customTemplate.html || defaultMagicLinkTemplate.html,
    text: customTemplate.text || defaultMagicLinkTemplate.text,
  }
}
