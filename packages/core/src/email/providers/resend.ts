/**
 * Resend email provider implementation for Keyloom
 * Uses the Resend API for sending emails
 */

import type {
  EmailProvider,
  EmailMessage,
  EmailResult,
  ResendConfig,
} from "../types";

/**
 * Resend email provider
 */
export class ResendEmailProvider implements EmailProvider {
  public readonly id = "resend";
  private config: ResendConfig;
  private baseUrl: string;

  constructor(config: ResendConfig) {
    this.config = config;
    this.baseUrl = config.baseUrl || "https://api.resend.com";
    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error("Resend API key is required");
    }
    if (!this.config.apiKey.startsWith("re_")) {
      throw new Error(
        'Invalid Resend API key format. API key should start with "re_"'
      );
    }
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    try {
      const response = await fetch(`${this.baseUrl}/emails`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: message.from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || `Resend API error: ${response.status}`
        );
      }

      return {
        success: true,
        messageId: result.id,
      };
    } catch (error) {
      console.error("Resend email sending failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown Resend error",
      };
    }
  }
}

/**
 * Create a Resend email provider
 */
export function createResendProvider(config: ResendConfig): EmailProvider {
  return new ResendEmailProvider(config);
}

/**
 * Validate Resend configuration
 */
export async function validateResendConfig(
  config: ResendConfig
): Promise<boolean> {
  try {
    const provider = new ResendEmailProvider(config);

    // Test the API key by making a request to the domains endpoint
    const response = await fetch(
      `${config.baseUrl || "https://api.resend.com"}/domains`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.ok;
  } catch (error) {
    console.error("Resend configuration validation failed:", error);
    return false;
  }
}

/**
 * Resend provider with SDK (alternative implementation using resend package)
 * This requires the 'resend' package to be installed
 */
export class ResendSDKEmailProvider implements EmailProvider {
  public readonly id = "resend-sdk";
  private resend: any;
  private config: ResendConfig;

  constructor(config: ResendConfig) {
    this.config = config;
    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error("Resend API key is required");
    }
  }

  private async getResendClient() {
    if (!this.resend) {
      try {
        // Dynamic import to avoid bundling resend in client-side code
        const resendModule: typeof import("resend") = await import("resend");
        this.resend = new resendModule.Resend(this.config.apiKey);
      } catch (error) {
        throw new Error(
          "Resend package not found. Install with: npm install resend"
        );
      }
    }
    return this.resend;
  }

  async send(message: EmailMessage): Promise<EmailResult> {
    try {
      const resend = await this.getResendClient();

      const result = await resend.emails.send({
        from: message.from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });

      if (result.error) {
        throw new Error(result.error.message || "Resend SDK error");
      }

      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error) {
      console.error("Resend SDK email sending failed:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown Resend SDK error",
      };
    }
  }
}

/**
 * Create a Resend email provider using the SDK
 */
export function createResendSDKProvider(config: ResendConfig): EmailProvider {
  return new ResendSDKEmailProvider(config);
}
