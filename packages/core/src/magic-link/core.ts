/**
 * Magic link authentication core logic for Keyloom
 */

import { KeyloomError } from "../errors";
import { issueVerificationToken } from "../tokens/verification";
import { newSession } from "../session/model";
import type {
  MagicLinkRequestInput,
  MagicLinkVerifyInput,
  MagicLinkRequestContext,
  MagicLinkVerifyContext,
  MagicLinkRequestResult,
  MagicLinkVerifyResult,
  MagicLinkUrlOptions,
  MagicLinkConfig,
} from "./types";
import type { MagicLinkEmailData } from "../email/types";

/**
 * Default magic link configuration
 */
export const defaultMagicLinkConfig: Required<MagicLinkConfig> = {
  defaultTtlMinutes: 15,
  defaultSessionTtlMinutes: 60,
  autoCreateUser: true,
  requireEmailVerification: false,
  verifyPath: "/api/auth/magic-link/verify",
};

/**
 * Generate a magic link URL
 */
export function generateMagicLinkUrl(options: MagicLinkUrlOptions): string {
  const {
    baseUrl,
    email,
    token,
    redirectTo,
    verifyPath = "/api/auth/magic-link/verify",
  } = options;

  const url = new URL(verifyPath, baseUrl);
  url.searchParams.set("email", email);
  url.searchParams.set("token", token);

  if (redirectTo) {
    url.searchParams.set("redirectTo", redirectTo);
  }

  return url.toString();
}

/**
 * Request a magic link for authentication
 */
export async function requestMagicLink(
  input: MagicLinkRequestInput,
  context: MagicLinkRequestContext,
  config: Partial<MagicLinkConfig> = {}
): Promise<MagicLinkRequestResult> {
  const { email, redirectTo, ttlMinutes } = input;
  const { adapter, emailService, baseUrl, appName = "Keyloom App" } = context;
  const finalConfig = { ...defaultMagicLinkConfig, ...config };

  try {
    // Validate email format
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return {
        success: false,
        error: "Invalid email address",
      };
    }

    const normalizedEmail = email.toLowerCase().trim();
    const tokenTtl = ttlMinutes || finalConfig.defaultTtlMinutes;

    // Check if user exists (optional - depends on autoCreateUser setting)
    let user = await adapter.getUserByEmail(normalizedEmail);

    if (!user && !finalConfig.autoCreateUser) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // Generate verification token
    const verificationToken = issueVerificationToken(normalizedEmail, tokenTtl);

    // Store verification token in database
    await adapter.createVerificationToken({
      identifier: verificationToken.identifier,
      token: verificationToken.token,
      expiresAt: verificationToken.expiresAt,
    });

    // Generate magic link URL
    const urlOptions: MagicLinkUrlOptions = {
      baseUrl,
      email: normalizedEmail,
      token: verificationToken.token,
      verifyPath: finalConfig.verifyPath,
    };

    // Only add redirectTo if it's defined (exactOptionalPropertyTypes compliance)
    if (redirectTo !== undefined) {
      urlOptions.redirectTo = redirectTo;
    }

    const magicLinkUrl = generateMagicLinkUrl(urlOptions);

    // Prepare email data
    const emailData: MagicLinkEmailData = {
      email: normalizedEmail,
      magicLinkUrl,
      appName,
      expirationMinutes: tokenTtl,
    };

    // Only add userName if it's defined (exactOptionalPropertyTypes compliance)
    if (user?.name !== undefined && user.name !== null) {
      emailData.userName = user.name;
    }

    // Send magic link email
    const emailResult = await emailService.sendMagicLink(emailData);

    if (!emailResult.success) {
      return {
        success: false,
        error: emailResult.error || "Failed to send magic link email",
      };
    }

    return {
      success: true,
      email: normalizedEmail,
    };
  } catch (error) {
    console.error("Magic link request failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Verify a magic link and authenticate the user
 */
export async function verifyMagicLink(
  input: MagicLinkVerifyInput,
  context: MagicLinkVerifyContext,
  config: Partial<MagicLinkConfig> = {}
): Promise<MagicLinkVerifyResult> {
  const { email, token, sessionTtlMinutes } = input;
  const { adapter, audit } = context;
  const finalConfig = { ...defaultMagicLinkConfig, ...config };

  try {
    // Validate input
    if (!email || !token) {
      return {
        success: false,
        error: "Email and token are required",
      };
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Verify and consume the token
    const tokenUsed = await adapter.useVerificationToken(
      normalizedEmail,
      token
    );

    if (!tokenUsed) {
      return {
        success: false,
        error: "Invalid or expired magic link",
      };
    }

    // Get or create user
    let user = await adapter.getUserByEmail(normalizedEmail);

    if (!user) {
      if (!finalConfig.autoCreateUser) {
        return {
          success: false,
          error: "User not found",
        };
      }

      // Create new user
      user = await adapter.createUser({
        email: normalizedEmail,
        emailVerified: finalConfig.requireEmailVerification ? null : new Date(),
      });

      if (audit) {
        await audit("user.created", { userId: user.id, method: "magic_link" });
      }
    } else {
      // Update email verification if not already verified
      if (!user.emailVerified && !finalConfig.requireEmailVerification) {
        await adapter.updateUser(user.id, { emailVerified: new Date() });
      }
    }

    // Create session
    const sessionTtl =
      sessionTtlMinutes || finalConfig.defaultSessionTtlMinutes;
    const session = await adapter.createSession(
      newSession(user.id, sessionTtl)
    );

    if (audit) {
      await audit("user.login", { userId: user.id, method: "magic_link" });
    }

    // Build user object with proper optional property handling
    const userResult: any = {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
    };

    // Only add optional properties if they're not null/undefined
    if (user.name !== null && user.name !== undefined) {
      userResult.name = user.name;
    }

    if (user.image !== null && user.image !== undefined) {
      userResult.image = user.image;
    }

    return {
      success: true,
      user: userResult,
      session: {
        id: session.id,
        userId: session.userId,
        expiresAt: session.expiresAt,
      },
    };
  } catch (error) {
    console.error("Magic link verification failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
