import fp from "fastify-plugin";
import oauth2, { type OAuth2Namespace } from "@fastify/oauth2";
import secureSession from "@fastify/secure-session";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Env } from "../config.js";

declare module "fastify" {
  interface FastifyInstance {
    googleOAuth2: OAuth2Namespace;
  }
  interface FastifyRequest {
    userId?: string;
  }
}

declare module "@fastify/secure-session" {
  interface SessionData {
    userId: string;
  }
}

export default fp(async (fastify: FastifyInstance, opts: { config: Env }) => {
  const { config } = opts;

  // Secure session (cookie-based)
  await fastify.register(secureSession, {
    key: Buffer.from(config.SESSION_SECRET, "hex"),
    cookieName: "quiz_session",
    cookie: {
      path: "/",
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    },
  });

  // Google OAuth2
  await fastify.register(oauth2, {
    name: "googleOAuth2",
    scope: ["openid", "email", "profile"],
    credentials: {
      client: {
        id: config.GOOGLE_CLIENT_ID,
        secret: config.GOOGLE_CLIENT_SECRET,
      },
    },
    startRedirectPath: "/api/auth/google",
    callbackUri: `${config.CLIENT_URL}/api/auth/google/callback`,
    discovery: {
      issuer: "https://accounts.google.com",
    },
    pkce: "S256",
  });

  // Decorator to extract userId from session
  fastify.decorateRequest("userId", undefined);
  fastify.addHook("onRequest", async (request: FastifyRequest) => {
    const userId = request.session?.get("userId");
    if (userId) {
      request.userId = userId;
    }
  });
});
