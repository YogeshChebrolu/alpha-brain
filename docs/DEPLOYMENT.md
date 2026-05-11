# Production Deployment Guide - Alpha Brain

> **Last Updated:** 2026-05-09
> **Architecture:** Next.js 16 + Supabase + Inngest
> **Goal:** Minimize cost while maintaining scalability

---

## Table of Contents

1. [Current Architecture](#current-architecture)
2. [Cost Analysis by Platform](#cost-analysis-by-platform)
3. [Recommended Architecture](#recommended-architecture)
4. [Deployment Strategy](#deployment-strategy)
5. [Environment Configuration](#environment-configuration)
6. [CI/CD Setup](#cicd-setup)
7. [Monitoring & Observability](#monitoring--observability)
8. [Future: AI Agents & Bot Integration](#future-ai-agents--bot-integration)
9. [Cost Optimization Tips](#cost-optimization-tips)
10. [Migration Path](#migration-path)

---

## Current Architecture

### Tech Stack
- **Frontend/Backend:** Next.js 16 (App Router)
- **Database:** Supabase (PostgreSQL + Auth + RLS)
- **Background Jobs:** Inngest (event-driven notifications)
- **Cron Jobs:** Stock price syncing
- **API Routes:** REST endpoints for notifications, stocks, ideas

### Current Features
- User authentication (Supabase Auth)
- Idea management with template builder
- Stock price tracking (Yahoo Finance integration)
- Event-driven notification system (Inngest)
- Form elements library (drag-drop, markdown editor, charts)

### Future Requirements
- AI agents accessing "Idea OS"
- WhatsApp/Telegram bot integration
- Expanded component library
- Higher traffic capacity

---

## Cost Analysis by Platform

### Option 1: Vercel (RECOMMENDED)

**Pros:**
- Zero-config Next.js deployment
- Built for Next.js (automatic optimizations)
- Free tier: 100GB bandwidth, 6,000 GB-hours compute
- Excellent DX with preview deployments
- Built-in analytics and monitoring
- Edge network (global CDN)
- Serverless functions auto-scale

**Cons:**
- Expensive at scale (after free tier)
- Function execution time limits (10s free, 60s Pro)

**Cost Breakdown:**

| Tier | Monthly Cost | Limits | Best For |
|------|-------------|--------|----------|
| **Hobby (FREE)** | $0 | 100GB bandwidth, 6,000 GB-hours, 1 concurrent build | Early stage, low traffic (<10k MAU) |
| **Pro** | $20/month | 1TB bandwidth, 100,000 GB-hours, 12 concurrent builds | Production app (10k-100k MAU) |
| **Enterprise** | Custom | Unlimited | High scale |

**Additional Services:**
- Supabase Free: $0 (500MB database, 50,000 MAU)
- Supabase Pro: $25/month (8GB database, 100,000 MAU)
- Inngest Free: $0 (50,000 events/month)
- Inngest Team: $20/month (500,000 events/month)

**Total for Free Tier:** $0/month
**Total for Production (Pro):** $45-65/month (Vercel Pro + Supabase Pro + Inngest Free)

---

### Option 2: Cloudflare Pages + Workers

**Pros:**
- **Extremely generous free tier**
- Free: Unlimited bandwidth, 100,000 requests/day
- Cloudflare Workers for serverless functions
- Global edge network (fastest CDN)
- D1 database (SQLite at edge) or use Supabase separately
- Workers AI for future AI features (cheap inference)

**Cons:**
- Not built specifically for Next.js (requires adapter)
- Workers have 10ms CPU time limit (can be challenging)
- Less mature Next.js support than Vercel

**Cost Breakdown:**

| Service | Free Tier | Paid (Workers Paid) |
|---------|-----------|---------------------|
| **Pages** | Unlimited sites, builds | $5/month (more builds) |
| **Workers** | 100,000 requests/day | $5/month (10M requests) |
| **D1 Database** | 5GB storage, 5M reads/day | $5/month (more capacity) |
| **R2 Storage** | 10GB, 1M reads/month | Pay-as-you-go ($0.015/GB) |
| **Workers AI** | 10,000 neurons/day | Pay-as-you-go (very cheap) |

**Total for Free Tier:** $0/month (with Supabase Free)
**Total for Production:** $10-20/month (Workers Paid + Supabase Pro)

---

### Option 3: Railway

**Pros:**
- Simple deployment (like Vercel but cheaper)
- $5/month starter credit (free tier)
- Can run Next.js + PostgreSQL + cron jobs in one place
- Good for monolithic deployments
- Simple pricing: pay for what you use

**Cons:**
- No free tier anymore (was removed)
- Less optimized for Next.js than Vercel
- Smaller edge network

**Cost Breakdown:**

| Tier | Cost | Resources |
|------|------|-----------|
| **Trial** | $5 credit (one-time) | Expires after usage |
| **Hobby** | ~$5-10/month | 512MB RAM, 1GB disk |
| **Pro** | Pay-as-you-go | $0.000463/GB-sec RAM |

**Total for Production:** $15-30/month (Next.js + Postgres + background jobs)

---

### Option 4: Render

**Pros:**
- Free tier for web services (750 hours/month)
- Free PostgreSQL database (90-day limit, then expires)
- Cron jobs included
- Simple setup

**Cons:**
- Free tier services sleep after 15 min inactivity (slow cold starts)
- Free PostgreSQL expires after 90 days
- Paid tier starts at $7/month per service

**Cost Breakdown:**

| Service | Free | Paid |
|---------|------|------|
| **Web Service** | 750 hrs/month (sleeps) | $7/month (always on) |
| **PostgreSQL** | Free 90 days, then $7/month | $7/month (256MB RAM) |
| **Cron Jobs** | Free with web service | Included |

**Total for Production:** $14-21/month (Web + DB, recommend Supabase instead)

---

### Option 5: Fly.io

**Pros:**
- True global distribution (run close to users)
- Free allowance: 3 shared VMs, 3GB storage
- Can run full Next.js app (not serverless)
- Good for WebSocket/real-time features

**Cons:**
- Requires Dockerfile (more DevOps)
- Free tier might not be enough for production
- Complex scaling

**Cost Breakdown:**

| Resource | Free | Paid |
|----------|------|------|
| **Compute** | 3 shared VMs | $0.0000022/sec (256MB VM) |
| **Storage** | 3GB | $0.15/GB/month |
| **Bandwidth** | 160GB/month | $0.02/GB |

**Total for Production:** $10-25/month

---

### Option 6: AWS Amplify + Lambda

**Pros:**
- Massive free tier (12 months)
- Lambda: 1M requests/month free forever
- S3 + CloudFront for static assets
- Full AWS ecosystem for future growth
- Best for future AI/ML workloads

**Cons:**
- Complex setup and configuration
- AWS billing can be unpredictable
- Steeper learning curve
- Not optimized for Next.js (use Vercel > AWS integration)

**Cost Breakdown (Free Tier):**
- Amplify: 1,000 build minutes, 15GB storage/month
- Lambda: 1M requests, 400,000 GB-seconds compute
- CloudFront: 1TB data transfer, 10M requests
- RDS PostgreSQL: Not free (starts $15/month)

**Total for Production:** $30-50/month (if not using free tier)

---

### Option 7: Self-Hosted (Hetzner/DigitalOcean)

**Pros:**
- Cheapest long-term option
- Full control
- Hetzner VPS: €4.51/month (2 vCPU, 4GB RAM)
- DigitalOcean: $6/month droplet

**Cons:**
- No auto-scaling
- Manual DevOps (Docker, Nginx, SSL, monitoring)
- Single point of failure (no redundancy)
- Time-consuming maintenance

**Cost Breakdown:**
- Hetzner VPS: €4.51/month
- DigitalOcean Droplet: $6/month
- Supabase: $0 (free tier) or self-host PostgreSQL

**Total for Production:** $5-10/month (but requires DevOps time)

---

## Recommended Architecture

### **Winner: Vercel + Supabase + Inngest (Hybrid with Cloudflare optimization)**

**Why This Stack:**
1. **Free tier covers early stage** ($0/month for first 10k users)
2. **Best Next.js performance** (Vercel is built for Next.js)
3. **Supabase handles auth + database** (no custom backend needed)
4. **Inngest handles background jobs** (replaces cron, workers)
5. **Easy migration to Cloudflare later** if costs grow

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE CDN                           │
│                  (Free: Unlimited bandwidth)                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      VERCEL (Edge Network)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────┐  ┌────────────────────┐               │
│  │  Next.js App       │  │  API Routes        │               │
│  │  (SSR + Static)    │  │  - /api/stocks     │               │
│  │                    │  │  - /api/ideas      │               │
│  │  - Pages           │  │  - /api/inngest    │               │
│  │  - Components      │  │  - /api/notify     │               │
│  └────────────────────┘  └────────────────────┘               │
│                                                                 │
└────────────────┬────────────────────┬───────────────────────────┘
                 │                    │
                 │                    │
        ┌────────▼─────────┐  ┌──────▼──────────────────┐
        │   SUPABASE       │  │   INNGEST CLOUD         │
        ├──────────────────┤  ├─────────────────────────┤
        │                  │  │                         │
        │  PostgreSQL      │  │  Event Queue            │
        │  Auth            │  │  Function Executor      │
        │  RLS Policies    │  │  - send-notification    │
        │  Storage         │  │  - stock-sync (future)  │
        │                  │  │                         │
        │  Tables:         │  │  Observability          │
        │  - ideas         │  │  Automatic Retries      │
        │  - actions       │  │                         │
        │  - notifications │  │                         │
        │  - stock_prices  │  │                         │
        └──────────────────┘  └─────────────────────────┘
```

### Component Deployment

| Component | Platform | Cost | Why |
|-----------|----------|------|-----|
| **Next.js App** | Vercel | Free → $20/mo | Best Next.js performance, auto-scaling |
| **Database** | Supabase | Free → $25/mo | Managed Postgres + Auth + Realtime |
| **Background Jobs** | Inngest | Free → $20/mo | Event-driven, better than cron |
| **Static Assets** | Vercel CDN | Free | Included with Vercel |
| **Cron Jobs** | Vercel Cron (Free) or Inngest scheduled events | Free | Built-in |
| **Future: AI Agents** | Cloudflare Workers AI | Pay-per-use | Cheapest inference |
| **Future: WhatsApp Bot** | Separate Cloudflare Worker | Free tier | Lightweight webhook handler |

**Total Month 1:** $0
**Total Month 6 (moderate traffic):** $0-20
**Total Year 1 (10k users):** $20-45/month

---

## Deployment Strategy

### Phase 1: Initial Production Deploy (FREE)

**Goal:** Get app live on production domain with $0 cost

**Steps:**

1. **Prepare Supabase**
   ```bash
   # Already done - your Supabase project is live
   # URL: https://kosutzkbgdoskbkvhopb.supabase.co
   ```

2. **Push to GitHub**
   ```bash
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

3. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select GitHub repo
   - Vercel auto-detects Next.js
   - Add environment variables:
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://kosutzkbgdoskbkvhopb.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
     SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
     INNGEST_EVENT_KEY=<your-event-key>
     INNGEST_SIGNING_KEY=<your-signing-key>
     ```
   - Click "Deploy"

4. **Configure Inngest**
   - Go to [Inngest Dashboard](https://app.inngest.com)
   - Set App URL: `https://your-app.vercel.app/api/inngest`
   - Click "Sync" to register functions

5. **Configure Custom Domain (Optional)**
   - Vercel: Settings → Domains → Add Domain
   - Point DNS to Vercel (automatic SSL)

**Result:** App live on `https://your-app.vercel.app` for $0/month

---

### Phase 2: Optimize for Cloudflare CDN (OPTIONAL)

**Goal:** Use Cloudflare's free CDN to reduce Vercel bandwidth costs

**Steps:**

1. **Add Site to Cloudflare**
   - Create free Cloudflare account
   - Add your domain
   - Update nameservers to Cloudflare

2. **Configure DNS**
   - Add CNAME: `@` → `cname.vercel-dns.com`
   - Or A record pointing to Vercel IP
   - Proxy through Cloudflare (orange cloud)

3. **Cloudflare Settings**
   - SSL/TLS: Full (not Flexible)
   - Caching: Standard
   - Auto Minify: JS, CSS, HTML
   - Brotli compression: ON

**Result:** Unlimited bandwidth through Cloudflare free tier, reducing Vercel costs

---

### Phase 3: Background Jobs Setup

**Goal:** Configure Inngest for production + optional cron jobs

**Current Setup (Inngest):**
- Already configured in codebase
- `send-notification` function registered
- Events triggered via `inngest.send()`

**Alternative: Vercel Cron (for stock sync)**

Create `app/api/cron/sync-stocks/route.ts`:
```typescript
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Sync all active stocks
  const tickers = await getActiveStockTickers();
  for (const ticker of tickers) {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sync-stock?ticker=${ticker}`);
  }

  return NextResponse.json({ success: true });
}
```

Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-stocks",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Cost:** Free on Vercel (included in all tiers)

---

## Environment Configuration

### Production Environment Variables

**Vercel Dashboard → Project → Settings → Environment Variables**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... # Keep secret!

# Inngest
INNGEST_EVENT_KEY=<from-inngest-dashboard>
INNGEST_SIGNING_KEY=signkey-prod-... # Keep secret!

# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Cron (if using Vercel cron)
CRON_SECRET=<generate-random-string>

# Future: AI/WhatsApp
OPENAI_API_KEY=sk-... # For AI agents
TWILIO_ACCOUNT_SID=AC... # For WhatsApp
TWILIO_AUTH_TOKEN=... # Keep secret!
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### Environment Variable Security

**Public (Safe to expose):**
- `NEXT_PUBLIC_*` variables → Included in client bundle
- Only use for non-sensitive data

**Secret (Server-only):**
- `SUPABASE_SERVICE_ROLE_KEY` → Bypasses RLS, NEVER expose
- `INNGEST_SIGNING_KEY` → Validates webhooks
- `TWILIO_AUTH_TOKEN` → Sends WhatsApp messages

**Vercel automatically makes non-prefixed vars server-only**

---

## CI/CD Setup

### Automatic Deployments (Vercel)

**How it Works:**
1. Push to `main` → Production deploy
2. Push to any branch → Preview deploy
3. Pull request → Preview deploy with URL

**Configuration:**

`.github/workflows/vercel-deploy.yml` (Optional - Vercel does this automatically):
```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm install -g vercel
      - run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

**Branch Strategy:**

```
main (production) → https://your-app.vercel.app
staging → https://staging-your-app.vercel.app (preview)
feature/* → https://feature-xyz-your-app.vercel.app (preview)
```

### Database Migrations

**Supabase Migration Strategy:**

1. Local Development:
   ```bash
   supabase migration new add_new_table
   # Edit supabase/migrations/xxxxx_add_new_table.sql
   supabase db push
   ```

2. Production Deploy:
   - Migrations run automatically on Supabase dashboard
   - Or use GitHub Actions:
   ```yaml
   - name: Push migrations to Supabase
     run: supabase db push --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
   ```

---

## Monitoring & Observability

### Vercel Analytics (Built-in)

**Free Tier Includes:**
- Real User Monitoring (RUM)
- Web Vitals (LCP, FID, CLS)
- Traffic analytics
- Function invocation logs

**Enable:**
- Vercel Dashboard → Project → Analytics
- Or add to `next.config.js`:
```javascript
module.exports = {
  experimental: {
    webVitalsAttribution: ['CLS', 'LCP', 'FID']
  }
}
```

### Supabase Monitoring

**Free Tier Includes:**
- Database size
- API requests
- Auth users
- Storage usage

**Access:** Supabase Dashboard → Project → Settings → Usage

### Inngest Observability

**Free Tier Includes:**
- Full execution traces
- Step-by-step logs
- Error tracking
- Retry history

**Access:** Inngest Dashboard → Functions → Runs

### Error Tracking: Sentry (Optional)

**Free Tier:** 5,000 errors/month

**Setup:**
```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

**Cost:** $0 (free tier) or $26/month (Team)

### Uptime Monitoring: UptimeRobot (Free)

**Free Tier:**
- 50 monitors
- 5-minute intervals
- Email/SMS alerts

**Setup:**
1. Create account at [uptimerobot.com](https://uptimerobot.com)
2. Add monitor: `https://your-app.vercel.app/api/health`
3. Configure alerts

**Cost:** $0

---

## Future: AI Agents & Bot Integration

### Architecture for AI Agents

**Recommended Approach:**

```
User (WhatsApp/Telegram)
    ↓
Cloudflare Worker (webhook handler) → FREE
    ↓
POST /api/agent/chat (Vercel API route)
    ↓
Cloudflare Workers AI (inference) → $0.011 per 1M neurons
    ↓
Idea OS Context (Supabase query)
    ↓
Response → User
```

### WhatsApp Bot Setup

**Option 1: Twilio (Paid)**

**Cost:**
- WhatsApp: $0.005 per message (conversation-based)
- Free trial: $15 credit

**Setup:**
```typescript
// app/api/webhooks/whatsapp/route.ts
import { NextResponse } from 'next/server';
import twilio from 'twilio';

export async function POST(request: Request) {
  const formData = await request.formData();
  const message = formData.get('Body');
  const from = formData.get('From');

  // Process with AI agent
  const response = await processAgentRequest(message);

  // Send response via Twilio
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(response);

  return new NextResponse(twiml.toString(), {
    headers: { 'Content-Type': 'text/xml' }
  });
}
```

**Cost:** ~$5-20/month (1,000-4,000 messages)

**Option 2: WhatsApp Business API (Free for small usage)**

- WhatsApp Business API has free tier (1,000 conversations/month)
- Requires business verification
- Setup via Meta Business Manager

### Telegram Bot Setup (RECOMMENDED - FREE)

**Why Telegram:**
- **Completely free** (no per-message costs)
- Rich bot API
- Better for power users
- Easier verification

**Setup:**

1. Create bot via [@BotFather](https://t.me/botfather)
2. Get API token
3. Deploy webhook handler:

```typescript
// Cloudflare Worker (free)
export default {
  async fetch(request: Request, env: Env) {
    const { message } = await request.json();

    // Call your Next.js API
    const response = await fetch('https://your-app.vercel.app/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: message.from.id,
        message: message.text,
      })
    });

    const { reply } = await response.json();

    // Send Telegram message
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: message.chat.id,
        text: reply,
      })
    });

    return new Response('OK');
  }
}
```

**Cost:** $0 (Telegram is free, Cloudflare Worker is free)

### AI Model Options

| Provider | Cost | Use Case |
|----------|------|----------|
| **Cloudflare Workers AI** | $0.011/1M neurons | Best for production (cheap + fast) |
| **OpenAI GPT-4o-mini** | $0.15/1M tokens | Better reasoning, higher cost |
| **Anthropic Claude Haiku** | $0.25/1M tokens | Fast, balanced |
| **Groq (free tier)** | Free (limited) | Testing/MVP |

**Recommendation:** Start with Cloudflare Workers AI ($0.011/1M neurons is ~100x cheaper than OpenAI)

---

## Cost Optimization Tips

### 1. Use Cloudflare for Static Assets

**Problem:** Vercel charges for bandwidth after 100GB

**Solution:** Serve images/fonts through Cloudflare (unlimited free bandwidth)

```typescript
// next.config.js
module.exports = {
  images: {
    loader: 'custom',
    loaderFile: './lib/cloudflare-image-loader.ts',
  },
}
```

### 2. Optimize API Routes

**Problem:** Each API call counts toward serverless function invocations

**Solution:**
- Cache responses with `cache-control` headers
- Use Vercel Edge Config for frequently accessed data
- Batch requests where possible

```typescript
// Cached for 1 hour
export const revalidate = 3600;

export async function GET() {
  // This response is cached
  return NextResponse.json({ data: '...' });
}
```

### 3. Use Edge Functions for Simple Logic

**Problem:** Serverless functions are slower and more expensive

**Solution:** Use Vercel Edge Functions for simple operations

```typescript
// app/api/edge/route.ts
export const runtime = 'edge'; // Runs on edge, faster + cheaper

export async function GET() {
  return new Response('Hello from edge!');
}
```

### 4. Database Query Optimization

**Problem:** Supabase charges for database size and compute

**Solution:**
- Add indexes to frequently queried columns
- Use RLS policies instead of custom auth logic
- Clean up old data (notifications, logs)

```sql
-- Add index for faster queries
CREATE INDEX idx_ideas_user_id ON ideas(user_id);

-- Archive old notifications (keep last 30 days)
DELETE FROM in_app_notifications
WHERE created_at < NOW() - INTERVAL '30 days'
AND dismissed = true;
```

### 5. Reduce Build Times

**Problem:** Vercel charges for build minutes on paid tiers

**Solution:**
- Use `output: 'standalone'` in `next.config.js`
- Cache `node_modules` in CI
- Minimize dependencies

```javascript
// next.config.js
module.exports = {
  output: 'standalone', // Smaller Docker images
  swcMinify: true, // Faster builds
}
```

---

## Migration Path (as you grow)

### Stage 1: MVP (0-1k users)
**Stack:** Vercel Free + Supabase Free + Inngest Free
**Cost:** $0/month
**Action:** Focus on product-market fit

### Stage 2: Early Growth (1k-10k users)
**Stack:** Vercel Hobby + Supabase Free + Inngest Free
**Cost:** $0-20/month
**Action:** Monitor usage, optimize queries

### Stage 3: Scaling (10k-50k users)
**Stack:** Vercel Pro + Supabase Pro + Inngest Free
**Cost:** $45-65/month
**Action:** Consider Cloudflare Workers for API routes

### Stage 4: High Scale (50k+ users)
**Option A:** Stay on Vercel
**Cost:** $65-200/month (Vercel Pro + overages)

**Option B:** Migrate to Cloudflare Pages + Workers
**Stack:**
- Frontend: Cloudflare Pages (free)
- API: Cloudflare Workers ($5/month for 10M requests)
- Database: Supabase Pro or Neon (cheaper)
- AI: Workers AI (pay-per-use)
**Cost:** $30-50/month (50-70% cheaper)

**Option C:** Self-host on Hetzner/DigitalOcean
**Cost:** $20-40/month (VPS + managed DB)

### Migration Checklist (Vercel → Cloudflare)

1. **Add Cloudflare adapter**
   ```bash
   npm install @cloudflare/next-on-pages
   ```

2. **Update `next.config.js`**
   ```javascript
   module.exports = {
     output: 'export', // Static export
     // Or use edge runtime for dynamic routes
   }
   ```

3. **Deploy to Cloudflare Pages**
   ```bash
   npx wrangler pages deploy .next
   ```

4. **Migrate API routes to Workers**
   - Rewrite as Cloudflare Workers (different API)
   - Or use Workers + Pages integration

5. **Test thoroughly** (different runtime environment)

**Effort:** 2-3 weeks for full migration

---

## Deployment Checklist

### Pre-Deploy

- [ ] Environment variables configured in Vercel
- [ ] Supabase RLS policies tested
- [ ] Inngest functions registered and tested
- [ ] Database migrations up to date
- [ ] API routes have proper error handling
- [ ] No hardcoded secrets in code
- [ ] `.env.local` in `.gitignore`

### Deploy

- [ ] Push to GitHub
- [ ] Import project to Vercel
- [ ] Add environment variables
- [ ] Deploy and verify build succeeds
- [ ] Configure custom domain (optional)
- [ ] Set up Cloudflare CDN (optional)

### Post-Deploy

- [ ] Test all critical user flows
- [ ] Verify Inngest webhook is working (`/api/inngest`)
- [ ] Check Supabase connections (auth, database)
- [ ] Set up monitoring (UptimeRobot, Sentry)
- [ ] Configure alerts for errors
- [ ] Add team members to Vercel project
- [ ] Document deployment process

### Security

- [ ] Enable 2FA on Vercel, Supabase, GitHub
- [ ] Rotate service role keys regularly
- [ ] Review RLS policies
- [ ] Add rate limiting to API routes
- [ ] Configure CORS properly
- [ ] Enable HTTPS only (automatic on Vercel)
- [ ] Add CSP headers

---

## Recommended Production Stack

### **Final Recommendation: Vercel + Supabase + Inngest**

**Rationale:**
1. **Free for MVP** - Zero cost until you validate product
2. **Best DX** - Deploy in 5 minutes, no DevOps needed
3. **Automatic scaling** - Handle traffic spikes effortlessly
4. **Next.js optimized** - Vercel built Next.js, best performance
5. **Easy migration** - Can move to Cloudflare/self-hosted later if needed

**When to Consider Alternatives:**
- **Use Cloudflare** if costs exceed $100/month (at 50k+ users)
- **Use Railway/Render** if you prefer single platform for everything
- **Self-host** if you have DevOps expertise and want max control
- **Use AWS** if you need specific AWS services (SageMaker, etc.)

---

## Next Steps

1. **Week 1: Initial Deploy**
   - Push code to GitHub
   - Deploy to Vercel (free tier)
   - Configure environment variables
   - Test production deployment

2. **Week 2: Monitoring Setup**
   - Add Sentry for error tracking
   - Set up UptimeRobot
   - Configure Vercel Analytics
   - Create health check endpoint

3. **Week 3: Optimization**
   - Add Cloudflare CDN
   - Optimize database queries
   - Add caching headers
   - Test Lighthouse scores

4. **Week 4: Documentation**
   - Document deployment process
   - Create runbook for common issues
   - Set up team access

**Total Time to Production:** 1-2 weeks

---

## Questions?

**Common Issues:**

**Q: Why not AWS/GCP?**
A: Overkill for Next.js apps. More complex, less optimized, higher learning curve. Use Vercel first, migrate later if needed.

**Q: What if Vercel gets expensive?**
A: At $100/month+ (50k users), migrate API routes to Cloudflare Workers ($5/month for 10M requests). Frontend can stay on Vercel or move to Cloudflare Pages.

**Q: Should I use Vercel's database (Postgres)?**
A: No, stick with Supabase. You get Auth + Realtime + Storage for same price. Vercel Postgres doesn't include these.

**Q: How to handle WhatsApp costs?**
A: Start with Telegram (free). Later, use WhatsApp Business API (first 1,000 conversations free/month).

---

**Last Updated:** 2026-05-09
**Author:** Claude Sonnet 4.5
**Version:** 1.0
