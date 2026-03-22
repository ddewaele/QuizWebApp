import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import secureSession from "@fastify/secure-session";

// 64-char hex string (32 bytes) for test session key
const TEST_SESSION_KEY =
  "a".repeat(64);

async function buildTestApp() {
  const fastify = Fastify({ logger: false });

  await fastify.register(secureSession, {
    key: Buffer.from(TEST_SESSION_KEY, "hex"),
    cookieName: "quiz_session",
    cookie: { path: "/", httpOnly: true, secure: false, sameSite: "lax" },
  });

  fastify.decorateRequest("userId", undefined);

  fastify.post("/api/auth/logout", async (request, reply) => {
    request.session.delete();
    return { success: true };
  });

  await fastify.ready();
  return fastify;
}

describe("POST /api/auth/logout", () => {
  it("returns 200 with no Content-Type header (correct client behaviour after fix)", async () => {
    const app = await buildTestApp();

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      // No headers, no body — mirrors what the fixed client sends
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ success: true });

    await app.close();
  });

  it("returns 400 when Content-Type: application/json is sent with no body (the original bug)", async () => {
    const app = await buildTestApp();

    const res = await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      headers: { "content-type": "application/json" },
      // No body — mirrors what the unfixed client was sending
    });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ code: "FST_ERR_CTP_EMPTY_JSON_BODY" });

    await app.close();
  });
});
