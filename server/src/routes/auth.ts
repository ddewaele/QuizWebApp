import type { FastifyInstance } from "fastify";
import type { Env } from "../config.js";

interface GoogleUserInfo {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
}

export default async function authRoutes(
  fastify: FastifyInstance,
  opts: { config: Env },
) {
  const { config } = opts;

  // Google OAuth callback
  fastify.get("/api/auth/google/callback", async (request, reply) => {
    const { token } =
      await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(
        request,
      );

    // Fetch user info from Google
    const response = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: { Authorization: `Bearer ${token.access_token}` },
      },
    );

    if (!response.ok) {
      fastify.log.error("Failed to fetch Google user info");
      return reply.redirect(`${config.CLIENT_URL}/login?error=oauth_failed`);
    }

    const googleUser: GoogleUserInfo = await response.json();

    if (!googleUser.email) {
      return reply.redirect(`${config.CLIENT_URL}/login?error=no_email`);
    }

    // Find or create user + auth account
    let user = await fastify.prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (!user) {
      user = await fastify.prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name ?? null,
          avatarUrl: googleUser.picture ?? null,
          accounts: {
            create: {
              provider: "google",
              providerAccountId: googleUser.sub,
            },
          },
        },
      });
    } else {
      // Ensure auth account link exists
      await fastify.prisma.authAccount.upsert({
        where: {
          provider_providerAccountId: {
            provider: "google",
            providerAccountId: googleUser.sub,
          },
        },
        create: {
          provider: "google",
          providerAccountId: googleUser.sub,
          userId: user.id,
        },
        update: {},
      });

      // Update profile info
      await fastify.prisma.user.update({
        where: { id: user.id },
        data: {
          name: googleUser.name ?? user.name,
          avatarUrl: googleUser.picture ?? user.avatarUrl,
        },
      });
    }

    // Set session
    request.session.set("userId", user.id);

    return reply.redirect(`${config.CLIENT_URL}/`);
  });

  // Get current user
  fastify.get("/api/auth/me", async (request, reply) => {
    if (!request.userId) {
      return reply.status(401).send({ user: null });
    }

    const user = await fastify.prisma.user.findUnique({
      where: { id: request.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      request.session.delete();
      return reply.status(401).send({ user: null });
    }

    return { user };
  });

  // Logout
  fastify.post("/api/auth/logout", async (request, reply) => {
    request.session.delete();
    return { success: true };
  });
}
