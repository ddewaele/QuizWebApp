# Authentication & Authorization Reference Architecture

Input document for building a reference React + Node.js web application that supports three authentication scenarios: interactive user login, programmatic API access via OAuth2 clients, and service-to-service communication.

---

## Requirements

### Scenario 1: Interactive User Login (Google SSO)

A human user opens the web app in a browser, signs in with their Google account, and uses the application. The app knows who they are and scopes all data to their account.

- OAuth2 Authorization Code flow with PKCE
- Server-side session (encrypted cookie)
- User profile created/updated on first login
- Session persists across page reloads (cookie-based)
- Logout clears the session

### Scenario 2: Programmatic API Access (OAuth2 Clients)

A user creates an "OAuth2 application" in the web app's developer settings. They receive a `client_id` and `client_secret`. Using these credentials, the user (or a third-party app acting on the user's behalf) can access the API programmatically through the OAuth2 Authorization Code flow.

- User registers an OAuth2 application (name, redirect URIs)
- Application receives a `client_id` and `client_secret`
- Third-party app redirects user to our authorization endpoint
- User sees a consent screen: "App X wants to access your quizzes. Allow?"
- On approval, we issue an authorization code → exchanged for access + refresh tokens
- Tokens are scoped (e.g., `quizzes:read`, `quizzes:write`, `attempts:read`)
- Tokens can be revoked by the user
- Access tokens are short-lived (1 hour), refresh tokens are long-lived (30 days)

### Scenario 3: Service-to-Service Communication (Client Credentials)

A backend service needs to access our API without a user present. The service authenticates with its own identity using the OAuth2 Client Credentials flow — no browser, no user interaction.

- Service registers as a "machine client" in the app (or via admin API)
- Service receives `client_id` + `client_secret`
- Service calls `POST /oauth/token` with `grant_type=client_credentials`
- We issue an access token scoped to the service's permissions
- No user context — the service acts as itself, not on behalf of a user
- Use case: data synchronization, batch processing, admin operations

---

## Architecture Overview

All three scenarios converge on a single authorization server that issues and validates tokens. The web app's browser session is a special case — still cookie-based for simplicity — but all programmatic access flows through OAuth2 tokens.

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Clients                                       │
│                                                                      │
│  ┌─────────────┐  ┌─────────────────┐  ┌──────────────────────────┐  │
│  │   Browser    │  │  Third-party    │  │  Backend Service         │  │
│  │   (React)    │  │  App / CLI      │  │  (machine-to-machine)    │  │
│  └──────┬───────┘  └───────┬─────────┘  └────────────┬─────────────┘  │
│         │                  │                          │               │
│    Google SSO         Authorization              Client Credentials  │
│    + Cookie           Code Flow                  Flow                │
│    Session            + PKCE                                         │
└─────────┼──────────────────┼──────────────────────────┼──────────────┘
          │                  │                          │
          ▼                  ▼                          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   Authorization Server                               │
│                                                                      │
│   ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐     │
│   │ Google OAuth  │  │ /oauth/      │  │ /oauth/token           │     │
│   │ Callback     │  │ authorize    │  │ (code + client_creds)  │     │
│   └──────┬───────┘  └──────┬───────┘  └────────────┬───────────┘     │
│          │                 │                        │                 │
│          ▼                 ▼                        ▼                 │
│   ┌────────────────────────────────────────────────────────────┐      │
│   │              Token Store (DB)                              │      │
│   │  access_tokens, refresh_tokens, authorization_codes,       │      │
│   │  oauth_applications, scopes                                │      │
│   └────────────────────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      Resource Server (API)                           │
│                                                                      │
│   Middleware: validate access token OR session cookie                 │
│   → extract userId (scenarios 1 & 2)                                 │
│   → extract serviceId + permissions (scenario 3)                     │
│   → enforce scopes on each endpoint                                  │
│                                                                      │
│   GET /api/quizzes          → requires quizzes:read                  │
│   POST /api/quizzes         → requires quizzes:write                 │
│   POST /api/quizzes/import  → requires quizzes:write                 │
│   GET /api/quizzes/:id      → requires quizzes:read + ownership      │
│   POST /api/attempts        → requires attempts:write                │
│   GET /api/attempts         → requires attempts:read                 │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Solution Options

### Option 1: Self-Hosted Authorization Server on Linux VPS

Run an open-source OAuth2/OIDC authorization server alongside your Node.js app on the same VPS.

#### Recommended: Ory Hydra + Custom Node.js Login/Consent UI

**Ory Hydra** is a hardened, production-grade OAuth2/OIDC server written in Go. It handles the protocol (authorization codes, token exchange, client credentials, token introspection, revocation). You provide the **login** and **consent** UI — which fits perfectly since you already have a React frontend and Fastify backend.

```
┌─────────────────────────────────────────────────────────┐
│  Linux VPS (Docker Compose)                             │
│                                                         │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │  Caddy     │  │  Ory Hydra   │  │  PostgreSQL      │ │
│  │  (reverse  │  │  (OAuth2     │  │  (shared DB or   │ │
│  │   proxy)   │  │   server)    │  │   separate DBs)  │ │
│  └─────┬──────┘  └──────┬───────┘  └────────┬─────────┘ │
│        │                │                    │           │
│  ┌─────▼────────────────▼────────────────────▼─────────┐ │
│  │              Your Application                       │ │
│  │  ┌──────────────┐  ┌─────────────────────────────┐  │ │
│  │  │ React SPA    │  │ Fastify API                 │  │ │
│  │  │ (+ login/    │  │ (resource server            │  │ │
│  │  │  consent UI) │  │  + login/consent endpoints) │  │ │
│  │  └──────────────┘  └─────────────────────────────┘  │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**How the three scenarios work with Hydra:**

**Scenario 1 — Browser login:**
1. User clicks "Sign in with Google"
2. Your Fastify server handles Google OAuth (existing flow)
3. After Google authenticates the user, your server creates a session cookie (existing behavior)
4. The browser uses cookie auth for all API calls (unchanged)
5. Hydra is not involved in this flow — it's just your app's internal session

**Scenario 2 — OAuth2 Authorization Code flow:**
1. Third-party app redirects to `https://yourapp.com/oauth2/auth?client_id=...&response_type=code&scope=quizzes:read`
2. Hydra checks the client registration, validates the request
3. Hydra redirects to your **login endpoint** (e.g., `/auth/login`) — your React UI
4. User signs in (if not already) via Google SSO or existing session
5. Your login endpoint tells Hydra "this user is authenticated" via Hydra's Admin API
6. Hydra redirects to your **consent endpoint** (e.g., `/auth/consent`) — your React UI
7. User sees "App X wants to read your quizzes. Allow?"
8. Your consent endpoint tells Hydra "user approved these scopes"
9. Hydra redirects back to the third-party app with an authorization code
10. Third-party app exchanges code for tokens via `POST /oauth2/token`

**Scenario 3 — Client Credentials:**
1. Register a machine client in Hydra: `hydra create client --grant-type client_credentials --scope admin:read`
2. Service calls `POST /oauth2/token` with `grant_type=client_credentials&client_id=...&client_secret=...`
3. Hydra validates credentials, issues access token with requested scopes
4. Service uses token: `Authorization: Bearer <token>`
5. Your API validates the token via Hydra's introspection endpoint

**Your Fastify middleware:**
```typescript
async function requireAuth(request, reply) {
  // Path 1: Browser session cookie (Scenario 1)
  if (request.userId) return;

  // Path 2: OAuth2 Bearer token (Scenarios 2 & 3)
  const token = request.headers.authorization?.replace("Bearer ", "");
  if (token) {
    // Introspect token with Hydra
    const introspection = await fetch("http://hydra:4445/admin/oauth2/introspect", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `token=${token}`,
    });
    const result = await introspection.json();

    if (result.active) {
      request.userId = result.sub;          // User ID (scenarios 1 & 2)
      request.clientId = result.client_id;  // OAuth client (scenario 2 & 3)
      request.scopes = result.scope?.split(" ") ?? [];
      return;
    }
  }

  return reply.status(401).send({ error: "Unauthorized" });
}
```

**Scope enforcement on routes:**
```typescript
function requireScope(scope: string) {
  return async (request, reply) => {
    // Cookie sessions get full access (browser user)
    if (request.session?.get("userId")) return;

    // Token-based access must have the required scope
    if (!request.scopes?.includes(scope)) {
      return reply.status(403).send({
        error: "Forbidden",
        message: `Missing required scope: ${scope}`,
      });
    }
  };
}

// Usage
fastify.get("/api/quizzes", {
  onRequest: [requireAuth, requireScope("quizzes:read")],
}, handler);
```

**Docker Compose for VPS:**
```yaml
services:
  caddy:
    image: caddy:2-alpine
    ports: ["80:80", "443:443"]
    volumes: ["./Caddyfile:/etc/caddy/Caddyfile"]

  hydra:
    image: oryd/hydra:v2
    environment:
      DSN: postgres://hydra:password@postgres:5432/hydra
      URLS_SELF_ISSUER: https://yourapp.com
      URLS_LOGIN: https://yourapp.com/auth/login
      URLS_CONSENT: https://yourapp.com/auth/consent
      SECRETS_SYSTEM: generate-a-32-byte-secret
    depends_on: [postgres]

  api:
    build: ./server
    environment:
      DATABASE_URL: postgres://quiz:password@postgres:5432/quizapp
      HYDRA_ADMIN_URL: http://hydra:4445

  postgres:
    image: postgres:16-alpine
    volumes: ["pgdata:/var/lib/postgresql/data"]
```

**Caddyfile routing:**
```
yourapp.com {
    # OAuth2 endpoints → Hydra
    handle /oauth2/* {
        reverse_proxy hydra:4444
    }

    # API endpoints → Fastify
    handle /api/* {
        reverse_proxy api:3000
    }

    # Everything else → React SPA
    handle {
        root * /srv/client
        try_files {path} /index.html
        file_server
    }
}
```

**Pros:**
- Battle-tested OAuth2 implementation (don't roll your own crypto)
- All three scenarios supported out of the box
- Runs on a single VPS ($4-7/month)
- Full control over data and infrastructure
- No vendor lock-in
- Hydra handles the hard parts (token lifecycle, PKCE, client credentials)
- You only build the UI (login page, consent page, client management)

**Cons:**
- More moving parts (Hydra is another service to run and monitor)
- Must implement login + consent endpoints that integrate with Hydra's Admin API
- Hydra's learning curve (admin API, configuration)
- You manage TLS, backups, updates

**Alternative self-hosted options:**

| Solution | Language | Notes |
|----------|----------|-------|
| **Ory Hydra** | Go | OAuth2/OIDC only. You provide login/consent UI. Lightweight. Recommended. |
| **Keycloak** | Java | Full identity provider. Includes login UI, user management, social login. Heavy (~500MB+ RAM). |
| **Authelia** | Go | Primarily an authentication portal/proxy. Less suited for OAuth2 server use case. |
| **Authentik** | Python | Identity provider with OAuth2 support. Web-based admin UI. Moderate resource usage. |

---

### Option 2: AWS Cognito

AWS Cognito is a managed identity service that acts as your OAuth2/OIDC authorization server. It handles user pools, social login (Google), token issuance, client credentials, and hosted UI for consent.

```
┌─────────────────────────────────────────────────────────────────┐
│  AWS                                                            │
│                                                                 │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │  CloudFront  │  │  AWS Cognito     │  │  RDS PostgreSQL   │  │
│  │  (CDN +      │  │  (User Pool +    │  │                   │  │
│  │   React SPA) │  │   OAuth2 Server) │  │                   │  │
│  └──────┬───────┘  └───────┬──────────┘  └────────┬──────────┘  │
│         │                  │                       │             │
│  ┌──────▼──────────────────▼───────────────────────▼──────────┐  │
│  │              App Runner / ECS / Lambda                     │  │
│  │              (Fastify API — resource server)               │  │
│  └────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**How the three scenarios work with Cognito:**

**Scenario 1 — Browser login:**
1. React app redirects to Cognito's hosted UI (or uses Amplify library)
2. User clicks "Continue with Google" on Cognito's login page
3. Cognito handles the Google OAuth flow, creates/updates user in the User Pool
4. Cognito redirects back with an authorization code
5. React app exchanges code for tokens (ID token, access token, refresh token)
6. React app stores tokens in memory, sends access token with API requests
7. Fastify validates the access token (JWT signed by Cognito)

Note: This is a **JWT-based flow, not cookie-based**. Cognito doesn't set cookies on your domain. Your React app must manage tokens explicitly. This is a design shift from the current cookie approach.

**Scenario 2 — OAuth2 Authorization Code flow:**
1. Create an "App Client" in the Cognito User Pool for the third-party app
2. Configure allowed OAuth scopes, callback URLs
3. Third-party app redirects to Cognito's `/oauth2/authorize` endpoint
4. User authenticates (Google SSO via Cognito), approves scopes
5. Cognito redirects back with authorization code
6. Third-party app exchanges code for tokens via Cognito's `/oauth2/token`
7. Your API validates the Cognito-issued JWT

**Scenario 3 — Client Credentials:**
1. Create an App Client in Cognito with `client_credentials` grant enabled
2. Define a Resource Server in Cognito with custom scopes (e.g., `quizapi/admin.read`)
3. Service calls Cognito's `/oauth2/token` with `grant_type=client_credentials`
4. Cognito issues an access token with the requested scopes
5. Your API validates the JWT and checks scopes

**Your Fastify middleware (Cognito JWTs):**
```typescript
import { CognitoJwtVerifier } from "aws-jwt-verify";

const verifier = CognitoJwtVerifier.create({
  userPoolId: "us-east-1_abc123",
  clientId: "your-app-client-id",
  tokenUse: "access",
});

async function requireAuth(request, reply) {
  const token = request.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  try {
    const payload = await verifier.verify(token);
    request.userId = payload.sub;
    request.scopes = payload.scope?.split(" ") ?? [];
  } catch {
    return reply.status(401).send({ error: "Invalid token" });
  }
}
```

**Cognito setup (via AWS CDK or CLI):**
```typescript
// AWS CDK example
const userPool = new cognito.UserPool(this, "QuizAppUsers", {
  selfSignUpEnabled: true,
  signInAliases: { email: true },
});

// Google as identity provider
new cognito.UserPoolIdentityProviderGoogle(this, "Google", {
  userPool,
  clientId: "google-client-id",
  clientSecretValue: SecretValue.unsafePlainText("google-secret"),
  scopes: ["openid", "email", "profile"],
  attributeMapping: {
    email: cognito.ProviderAttribute.GOOGLE_EMAIL,
    fullname: cognito.ProviderAttribute.GOOGLE_NAME,
  },
});

// App client for the web app
const webClient = userPool.addClient("WebApp", {
  oAuth: {
    flows: { authorizationCodeGrant: true },
    scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL],
    callbackUrls: ["https://yourapp.com/callback"],
  },
});

// Resource server for custom scopes
const resourceServer = userPool.addResourceServer("QuizAPI", {
  identifier: "quizapi",
  scopes: [
    { scopeName: "quizzes.read", scopeDescription: "Read quizzes" },
    { scopeName: "quizzes.write", scopeDescription: "Write quizzes" },
    { scopeName: "admin.read", scopeDescription: "Admin read access" },
  ],
});

// Machine client for service-to-service
const machineClient = userPool.addClient("MachineClient", {
  oAuth: {
    flows: { clientCredentials: true },
    scopes: [
      cognito.OAuthScope.resourceServer(resourceServer, {
        scopeName: "admin.read", scopeDescription: "Admin read access",
      }),
    ],
  },
  generateSecret: true,
});
```

**Pros:**
- Fully managed — no server to maintain for auth
- All three scenarios supported natively
- Built-in Google SSO federation
- Built-in hosted UI for login/consent (customizable)
- Token validation is local (JWT signature check, no network call to introspect)
- Integrates with AWS IAM, API Gateway, ALB
- Free tier: 50,000 monthly active users (generous)

**Cons:**
- Vendor lock-in to AWS
- Cognito's UI customization is limited (can be frustrating)
- Forces JWT-based auth for the browser app (no cookie sessions)
- React app must manage token lifecycle (storage, refresh, retry on 401)
- Cognito's documentation and error messages are notoriously poor
- Custom scopes require a Resource Server (extra configuration)
- Client Credentials tokens are opaque by default (need to configure for JWT)
- Cold starts on hosted UI if not frequently used

**Cost estimate:**
- Cognito: Free for first 50K MAU, then $0.0055/MAU
- For <1000 users: $0/month for Cognito
- Still need to pay for compute (App Runner ~$7/mo) and database (RDS ~$12/mo)

---

### Option 3: Microsoft Entra ID (Azure AD)

Microsoft Entra ID (formerly Azure Active Directory) is a full identity platform. It can act as your OAuth2/OIDC authorization server with support for social login, authorization code flow, and client credentials.

```
┌──────────────────────────────────────────────────────────────────┐
│  Azure                                                           │
│                                                                  │
│  ┌───────────────┐  ┌──────────────────┐  ┌───────────────────┐  │
│  │  Static Web   │  │  Microsoft       │  │  Azure Database   │  │
│  │  Apps (React) │  │  Entra ID        │  │  for PostgreSQL   │  │
│  │               │  │  (OAuth2/OIDC)   │  │                   │  │
│  └───────┬───────┘  └────────┬─────────┘  └─────────┬─────────┘  │
│          │                   │                       │            │
│  ┌───────▼───────────────────▼───────────────────────▼─────────┐  │
│  │              App Service / Container Apps                   │  │
│  │              (Fastify API — resource server)                │  │
│  └─────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

**How the three scenarios work with Entra ID:**

**Scenario 1 — Browser login:**
1. React app redirects to Entra ID's authorization endpoint
2. Configure Entra ID to allow Google as an external identity provider
3. User signs in with Google (federated through Entra ID)
4. Entra ID issues tokens (ID token + access token)
5. React app stores tokens, sends access token with API requests
6. Fastify validates the JWT (signed by Entra ID)

**Scenario 2 — OAuth2 Authorization Code flow:**
1. Register an "App Registration" in Entra ID for the third-party app
2. Configure API permissions (scopes) the app can request
3. Third-party app redirects to Entra ID's `/oauth2/v2.0/authorize`
4. User consents → Entra ID issues authorization code
5. Third-party app exchanges code for tokens
6. Your API validates the Entra ID JWT and checks scopes

**Scenario 3 — Client Credentials:**
1. Register an App Registration for the service
2. Create a client secret or certificate
3. Grant "Application permissions" (not delegated — these are service-level)
4. Service calls `POST /oauth2/v2.0/token` with `grant_type=client_credentials`
5. Entra ID issues an access token
6. Your API validates the JWT

**Your Fastify middleware (Entra ID JWTs):**
```typescript
import jwksClient from "jwks-rsa";
import jwt from "jsonwebtoken";

const client = jwksClient({
  jwksUri: "https://login.microsoftonline.com/{tenant-id}/discovery/v2.0/keys",
});

async function requireAuth(request, reply) {
  const token = request.headers.authorization?.replace("Bearer ", "");
  if (!token) return reply.status(401).send({ error: "Unauthorized" });

  try {
    const decoded = jwt.decode(token, { complete: true });
    const key = await client.getSigningKey(decoded.header.kid);
    const payload = jwt.verify(token, key.getPublicKey(), {
      audience: "api://your-app-id",
      issuer: `https://login.microsoftonline.com/{tenant-id}/v2.0`,
    });
    request.userId = payload.sub || payload.oid;
    request.scopes = payload.scp?.split(" ") ?? payload.roles ?? [];
  } catch {
    return reply.status(401).send({ error: "Invalid token" });
  }
}
```

**Pros:**
- Enterprise-grade identity platform
- Excellent for organizations already using Microsoft 365
- Supports Google as external identity provider
- Built-in consent framework with admin consent for org-wide access
- Application roles for service-to-service (in addition to delegated scopes)
- Conditional Access policies (MFA, device compliance, location-based)
- Free tier includes basic features for up to 50K MAU (Entra ID Free / External Identities)

**Cons:**
- Complex configuration — Azure Portal UI is dense and not intuitive
- Steeper learning curve than Cognito
- Primarily designed for Microsoft ecosystem — Google federation works but feels secondary
- Forces JWT-based auth (same as Cognito — no cookie sessions)
- Terminology is unique to Microsoft (App Registrations, Service Principals, Manifests)
- External Identities pricing for non-organizational users can be confusing
- Overkill for a small project without Microsoft ecosystem ties

**Cost estimate:**
- Entra ID Free: Basic OAuth2/OIDC for single-tenant apps
- External Identities: First 50K MAU/month free, then $0.01325/MAU
- For <1000 users: $0/month for auth
- Compute + DB costs separate (App Service ~$13/mo, PostgreSQL ~$15/mo)

---

## Comparison

| | Self-Hosted (Ory Hydra) | AWS Cognito | Microsoft Entra ID |
|-|------------------------|-------------|-------------------|
| **Scenario 1: Google SSO** | Your app handles Google OAuth directly. Hydra not involved. Cookie session. | Cognito federates Google. JWT-based. | Entra ID federates Google. JWT-based. |
| **Scenario 2: Auth Code flow** | Hydra handles OAuth2 protocol. You build login + consent UI. | Cognito handles everything. Hosted or custom UI. | Entra ID handles everything. Azure Portal config. |
| **Scenario 3: Client Credentials** | Hydra handles it. Register client via CLI/Admin API. | Cognito App Client with client_credentials grant. | Entra ID App Registration with application permissions. |
| **Browser auth model** | Cookie session (existing) | JWT (must change frontend) | JWT (must change frontend) |
| **Token validation** | Network call to Hydra introspection endpoint | Local JWT signature check | Local JWT signature check |
| **Consent UI** | You build it (React pages) | Cognito hosted UI (limited customization) | Entra ID consent prompt (limited customization) |
| **Client management** | You build UI + Hydra Admin API | AWS Console or API | Azure Portal or API |
| **Self-hosted?** | Yes (Docker on VPS) | No (AWS managed) | No (Azure managed) |
| **Vendor lock-in** | None | AWS | Azure/Microsoft |
| **Infra cost** | $4-7/mo (VPS) | $0 auth + $20/mo compute/DB | $0 auth + $28/mo compute/DB |
| **Operational effort** | Medium (manage Hydra + app) | Low (managed service) | Low (managed service) |
| **Learning curve** | Hydra Admin API, OAuth2 concepts | Cognito concepts, AWS SDK | Entra ID concepts, Azure Portal |
| **Best for** | Full control, no vendor lock-in, keep cookie sessions for web | AWS-native projects, serverless | Microsoft/enterprise environments |

---

## Recommended Implementation Plan

Regardless of which authorization server you choose, the application structure follows the same pattern:

### Database Models (additions to existing schema)

```prisma
// OAuth2 application registered by a user (Scenario 2)
model OAuthApplication {
  id            String   @id @default(cuid())
  name          String
  clientId      String   @unique
  clientSecret  String                          // hashed (bcrypt or SHA-256)
  redirectUris  String[]
  scopes        String[]                        // allowed scopes
  grantTypes    String[] @default(["authorization_code"])  // or ["client_credentials"]
  userId        String?                         // null for machine clients
  user          User?    @relation(fields: [userId], references: [id])
  active        Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([userId])
}

// Issued tokens (if self-hosted; managed services handle this)
model OAuthToken {
  id            String    @id @default(cuid())
  accessToken   String    @unique               // hashed
  refreshToken  String?   @unique               // hashed
  applicationId String
  userId        String?                          // null for client_credentials
  scopes        String[]
  expiresAt     DateTime
  createdAt     DateTime  @default(now())
}

// Authorization codes (short-lived, used once)
model OAuthAuthorizationCode {
  id            String   @id @default(cuid())
  code          String   @unique                 // hashed
  applicationId String
  userId        String
  scopes        String[]
  redirectUri   String
  codeChallenge String?                          // PKCE
  expiresAt     DateTime
  used          Boolean  @default(false)
  createdAt     DateTime @default(now())
}
```

### API Endpoints (additions)

**Client Management (for users to register OAuth apps):**

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `GET` | `/api/oauth/applications` | List user's registered apps | Session |
| `POST` | `/api/oauth/applications` | Register new OAuth app | Session |
| `GET` | `/api/oauth/applications/:id` | Get app details | Session + ownership |
| `DELETE` | `/api/oauth/applications/:id` | Delete/revoke app | Session + ownership |
| `POST` | `/api/oauth/applications/:id/rotate-secret` | Rotate client secret | Session + ownership |

**OAuth2 Protocol Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/oauth/authorize` | Authorization endpoint (shows consent UI) |
| `POST` | `/oauth/token` | Token endpoint (code exchange + client credentials) |
| `POST` | `/oauth/revoke` | Revoke a token |
| `POST` | `/oauth/introspect` | Check if a token is valid (for self-hosted) |
| `GET` | `/.well-known/openid-configuration` | OIDC discovery document |
| `GET` | `/.well-known/jwks.json` | Public keys for JWT verification |

**Note:** If using Cognito or Entra ID, you don't build the OAuth2 protocol endpoints — the managed service provides them. You only build the client management UI.

### Frontend Pages (additions)

| Route | Page | Description |
|-------|------|-------------|
| `/settings/applications` | ApplicationsPage | List user's OAuth apps |
| `/settings/applications/new` | CreateApplicationPage | Register new app, shows client_id + secret once |
| `/auth/consent` | ConsentPage | "App X wants access to..." approval screen |

### Scope Definitions

```typescript
const SCOPES = {
  "quizzes:read": "Read your quizzes",
  "quizzes:write": "Create, edit, and delete your quizzes",
  "attempts:read": "View your quiz results",
  "attempts:write": "Submit quiz attempts",
  "profile:read": "View your profile information",
} as const;
```

### Middleware Architecture

```typescript
// Unified auth middleware supporting all three scenarios
async function requireAuth(request, reply) {
  // Scenario 1: Cookie session (browser)
  const sessionUserId = request.session?.get("userId");
  if (sessionUserId) {
    request.userId = sessionUserId;
    request.authMethod = "session";
    request.scopes = ["*"]; // Full access for direct browser sessions
    return;
  }

  // Scenarios 2 & 3: Bearer token
  const token = request.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    return reply.status(401).send({ error: "Unauthorized" });
  }

  const tokenInfo = await validateToken(token); // Introspect or JWT verify
  if (!tokenInfo.active) {
    return reply.status(401).send({ error: "Invalid or expired token" });
  }

  request.userId = tokenInfo.sub || null;        // null for client_credentials
  request.clientId = tokenInfo.client_id;
  request.scopes = tokenInfo.scope?.split(" ") ?? [];
  request.authMethod = tokenInfo.sub ? "authorization_code" : "client_credentials";
}

// Scope enforcement
function requireScope(...requiredScopes: string[]) {
  return async (request, reply) => {
    if (request.scopes.includes("*")) return; // Browser session = full access

    for (const scope of requiredScopes) {
      if (!request.scopes.includes(scope)) {
        return reply.status(403).send({
          error: "Insufficient scope",
          message: `Required scope: ${scope}`,
          required: requiredScopes,
          granted: request.scopes,
        });
      }
    }
  };
}
```

---

## Decision Criteria

**Choose self-hosted (Ory Hydra) if:**
- You want to keep cookie sessions for the browser app (no frontend changes)
- You want full control and no vendor lock-in
- You're comfortable running Docker on a VPS
- Budget is tight ($4-7/month total)
- You want to understand OAuth2 deeply (educational value)

**Choose AWS Cognito if:**
- You're already on AWS or planning to deploy there
- You want a fully managed solution with minimal operational burden
- You're okay with JWT-based auth for the browser (requires frontend refactoring)
- You need the AWS ecosystem (Lambda, API Gateway, IAM integration)

**Choose Microsoft Entra ID if:**
- Your users or organization are in the Microsoft ecosystem
- You need enterprise features (Conditional Access, MFA policies, audit logs)
- You're deploying on Azure
- You need organizational admin consent workflows

**For a personal project or small startup:** Start with Ory Hydra on a VPS. It's the cheapest, gives you cookie sessions for the web app, and you learn the most. Migrate to a managed service later if operational burden becomes a problem.
