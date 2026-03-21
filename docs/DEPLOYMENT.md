# Deployment Options

Guide for deploying the QuizWebApp stack (React SPA + Fastify API + PostgreSQL) to the cloud.

## Key Constraint: OAuth Session Cookies

This app uses server-side encrypted session cookies for authentication. The frontend and backend **must share the same origin** (same domain) for cookies to work without complex cross-origin configuration. This rules out split-hosting where frontend and API are on different domains unless you set up reverse proxy rewrites.

**Simplest approach:** Serve the Vite build output from the Fastify server using `@fastify/static`, so everything runs as one service on one domain.

---

## Quick Comparison

| Option | Monthly Cost | Setup Effort | PostgreSQL | Cookie Simplicity |
|--------|-------------|-------------|-----------|-------------------|
| **Hetzner + Docker Compose** | ~$4-5 | Hard (first time) | Self-managed | Trivial |
| **Hetzner + Coolify** | ~$4-5 | Medium | Self-managed | Trivial |
| **Railway + Neon** | ~$5 | Easy | Neon (free tier) | Easy |
| **Heroku** | ~$10 | Very easy | Managed ($5/mo) | Trivial |
| **Render** | ~$14 | Easy | Managed ($7/mo) | Needs custom domain |
| **DO App Platform** | ~$20 | Easy | Managed ($15/mo) | Good |
| **Fly.io** | ~$10-43 | Medium | $38/mo managed | OK |
| **AWS** | ~$20-25 | Hard | RDS managed | Complex |
| **Azure** | ~$28-38 | Medium-Hard | Managed | OK |
| **GCP Cloud Run** | ~$10-35 | Medium | Cloud SQL | OK |
| **Vercel/Netlify + backend** | ~$10-30 | Medium | Separate | Problematic |

---

## Recommended Options

### 1. Best Value: Hetzner VPS + Docker Compose (~$4-5/month)

A single Hetzner CX22 (2 GB RAM, ~$4-5/month) runs everything: Caddy (reverse proxy + auto HTTPS), Fastify, PostgreSQL, and the React static build.

**Pros:**
- Cheapest option by far
- Everything on one domain — cookies just work
- Full control, no vendor lock-in
- Docker Compose makes it reproducible

**Cons:**
- Manual server setup (Docker, Caddy, firewall)
- You manage PostgreSQL backups
- No auto-scaling

**Deployment approach:**
```yaml
# production docker-compose.yml
services:
  caddy:
    image: caddy:2-alpine
    ports: ["80:80", "443:443"]
    volumes: ["./Caddyfile:/etc/caddy/Caddyfile"]
  api:
    build: .
    environment:
      DATABASE_URL: postgresql://quiz:password@db:5432/quizapp
  db:
    image: postgres:16-alpine
    volumes: ["pgdata:/var/lib/postgresql/data"]
```

**Alternative tools on top of Hetzner:**
- **Coolify** — Self-hosted PaaS on your VPS. One-click PostgreSQL, Git deploys, automatic SSL. Free and open source. Gives you a Railway-like experience for $4-5/month total.
- **Kamal** — Docker deployment tool from Basecamp. Zero-downtime deploys, automatic TLS via Kamal Proxy. Write a `deploy.yml`, run `kamal setup`. Free.

### 2. Best Managed + Cheap: Railway + Neon (~$5/month)

Deploy the Fastify API (serving the React build as static files) on Railway's $5/month Hobby plan. Use Neon's free tier for PostgreSQL.

**Pros:**
- Git-push deploys, zero server management
- Neon free PostgreSQL doesn't expire (unlike Render's 90-day limit)
- ~$5/month total
- Easy to get started

**Cons:**
- Railway Hobby has limited resources
- Neon free tier has cold starts (~500ms after idle)
- Need to serve SPA from Fastify (add `@fastify/static`)

**Setup:**
1. Add `@fastify/static` to serve the Vite build output from Fastify
2. Create a Neon project (free) — get the connection string
3. Connect GitHub repo to Railway — it auto-detects Node.js
4. Set environment variables in Railway dashboard
5. Deploy

### 3. Best Zero-Ops: Heroku (~$10/month)

The most mature PaaS. Eco dyno ($5) + Essential-0 PostgreSQL ($5).

**Pros:**
- Simplest setup — `git push heroku main`
- Managed PostgreSQL included as add-on
- Single domain — cookies work naturally
- Excellent documentation

**Cons:**
- Eco dynos sleep after 30 minutes of inactivity (cold starts)
- More expensive than Hetzner/Railway for what you get
- No free tier since 2022

### 4. Best Mid-Range: DigitalOcean App Platform (~$20/month)

Basic app component ($5) + Managed PostgreSQL ($15).

**Pros:**
- Clean UI, Git deploys
- Path-based routing: frontend at `/`, API at `/api` — same domain automatically
- Managed PostgreSQL with backups
- Free static site component

**Cons:**
- Managed PostgreSQL minimum is $15/month (expensive for hobby)
- Can swap managed DB for Neon to save $10/month

---

## Options to Avoid for This Stack

### Vercel / Netlify (frontend) + separate backend
The cross-origin cookie problem makes this painful. Your frontend gets `app.vercel.app` and your backend gets a different domain. Google OAuth session cookies won't work without setting up rewrites to proxy `/api/*` through Vercel/Netlify to your backend. This adds latency and complexity that isn't worth it for a personal project.

### Fly.io
Managed PostgreSQL starts at $38/month — too expensive for hobby use. Self-managed PostgreSQL on Fly is cheaper (~$3-5/month) but negates the PaaS benefit.

### AWS / Azure / GCP
Overkill for <100 users. Multiple services to configure (compute, database, CDN, IAM, VPC, networking). Monthly costs start at $20-38. These make sense for teams or production apps that need auto-scaling, multi-region, or compliance certifications.

---

## Interesting Add-ons

### Neon (Free PostgreSQL)
Serverless PostgreSQL with a permanent free tier: 0.5 GB storage, 100 compute-hours/month, scale-to-zero. Pair with any backend hosting to avoid paying for managed PostgreSQL. Cold starts of ~500ms after idle.

### Supabase (PostgreSQL + Auth replacement)
Free tier includes PostgreSQL (500 MB) and built-in Google OAuth. Would replace both your database hosting and custom auth implementation. Trade-off: requires switching from cookie sessions to Supabase's JWT-based auth — a significant architectural change.

### Cloudflare (DNS + CDN)
Even if you host on a VPS, put Cloudflare in front for free DNS, CDN caching of static assets, and DDoS protection. Works with any hosting provider.

---

## Production Checklist

Regardless of hosting choice, before going to production:

- [ ] Set `NODE_ENV=production` in environment
- [ ] Set `secure: true` on session cookies (requires HTTPS)
- [ ] Configure a custom domain with HTTPS
- [ ] Update Google OAuth redirect URI to production domain
- [ ] Set up PostgreSQL backups (automated or manual `pg_dump`)
- [ ] Add `@fastify/static` to serve the Vite build from Fastify (if not using a CDN)
- [ ] Build the client: `cd client && npm run build`
- [ ] Set `CORS origin: false` in production (same-origin, no need for CORS)
- [ ] Review `CLIENT_URL` to match production domain
