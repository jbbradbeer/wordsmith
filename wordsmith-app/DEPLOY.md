# Wordsmith — Deployment Guide

## Architecture Overview

```
User → Next.js Frontend (Vercel)
         ├── Supabase (Auth + Database)
         ├── Anthropic API (Word generation, proxied server-side)
         └── Stripe (Payments + Subscriptions)
```

**Flow:** User signs up → gets 3 free searches → hits paywall → pays $10/mo via Stripe → unlimited searches.

---

## Step 1: Set Up Supabase (10 min)

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name it `wordsmith`, choose a region close to your users, set a DB password
3. Once created, go to **SQL Editor** → paste the contents of `supabase-schema.sql` → **Run**, then run each file in `supabase-migrations/` in order (001, 002, …)
4. Go to **Settings → API** and copy:
   - `Project URL` → this is your `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → this is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → this is your `SUPABASE_SERVICE_ROLE_KEY`

### Enable Google OAuth (optional but recommended)
1. In Supabase, go to **Authentication → Providers → Google**
2. Follow the instructions to set up Google OAuth credentials
3. Add your production URL to the redirect URLs

### Configure Auth Settings
1. Go to **Authentication → URL Configuration**
2. Set Site URL to your production domain (e.g., `https://wordsmith.thetuxedocollective.com`)
3. Add `http://localhost:3000` to Redirect URLs for local dev

---

## Step 2: Set Up Stripe ($10/mo Subscription) (10 min)

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com)
2. **Products → Add Product**
   - Name: `Wordsmith Pro`
   - Pricing: `$10.00 / month` (recurring)
   - Click **Save**
   - Copy the **Price ID** (starts with `price_`) → this is your `STRIPE_PRICE_ID`
3. Go to **API Keys**:
   - Copy **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Copy **Secret key** → `STRIPE_SECRET_KEY`

### Set Up Webhook (do this AFTER deploying)
1. Go to **Developers → Webhooks → Add endpoint**
2. URL: `https://your-domain.com/api/webhook`
3. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the **Signing secret** → `STRIPE_WEBHOOK_SECRET`

### Enable Customer Portal
1. Go to **Settings → Billing → Customer Portal**
2. Enable it and configure allowed actions (cancel, update payment method)

---

## Step 3: Get Anthropic API Key (2 min)

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. **Settings → API Keys → Create Key**
3. Copy it → `ANTHROPIC_API_KEY`

---

## Step 4: Deploy to Vercel (10 min)

### Option A: GitHub Deploy (recommended)
1. Push this project to a GitHub repo
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your repo
3. Framework: **Next.js** (auto-detected)
4. Add all environment variables from `.env.example` with your real values (generate `COOKIE_SECRET` with `openssl rand -hex 32` — it signs the anonymous free-search cookie)
5. Set `NEXT_PUBLIC_APP_URL` to your Vercel domain (e.g., `https://wordsmith.vercel.app`)
6. Click **Deploy**

### Option B: Vercel CLI
```bash
npm i -g vercel
cd wordsmith-app
vercel
# Follow prompts, then set env vars in Vercel dashboard
```

### Custom Domain
1. In Vercel → **Settings → Domains**
2. Add `wordsmith.thetuxedocollective.com` (or whatever you prefer)
3. Add the DNS records Vercel gives you to your domain registrar
4. Update `NEXT_PUBLIC_APP_URL` in Vercel env vars
5. Update Supabase Site URL and Stripe webhook URL

---

## Step 5: Post-Deploy Checklist

- [ ] Visit your deployed URL, confirm the page loads
- [ ] Sign up for an account, confirm email arrives
- [ ] Do 3 searches, confirm the paywall appears on the 4th
- [ ] Complete a test Stripe checkout (use card `4242 4242 4242 4242`)
- [ ] Confirm subscription status updates in Supabase `profiles` table
- [ ] Set up the Stripe webhook with your production URL
- [ ] Switch Stripe from test mode to live mode when ready
- [ ] Update all `sk_test_` and `pk_test_` keys to `sk_live_` and `pk_live_`

---

## Cost Estimates

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| **Vercel** | 100GB bandwidth/mo | $20/mo Pro |
| **Supabase** | 50k auth users, 500MB DB | $25/mo Pro |
| **Anthropic API** | — | ~$0.003-0.01/search |
| **Stripe** | — | 2.9% + $0.30/transaction |

**Per subscriber math:** $10/mo revenue - $0.59 Stripe fee - ~$0.30/mo API costs = **~$9.11 net per subscriber**

At 100 subscribers: ~$911/mo net revenue. Infrastructure costs stay under $50/mo until you're well past that.

---

## File Structure

```
wordsmith-app/
├── .env.example              # Environment variables template
├── package.json
├── next.config.js
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── supabase-schema.sql       # Run in Supabase SQL Editor
└── src/
    ├── lib/
    │   ├── supabase.ts       # Supabase client
    │   ├── stripe.ts         # Stripe client
    │   └── constants.ts      # App constants (free limit, price)
    ├── components/
    │   ├── AuthModal.tsx      # Sign in / Sign up modal
    │   ├── PaywallModal.tsx   # Upgrade prompt
    │   ├── WordCard.tsx       # Individual word result card
    │   └── UsageBar.tsx       # Search usage indicator
    ├── pages/
    │   ├── _app.tsx           # App wrapper with auth provider
    │   ├── index.tsx          # Main app page
    │   └── api/
    │       ├── search.ts      # Word search (Anthropic proxy + usage tracking)
    │       ├── user.ts        # Get user profile/status
    │       ├── checkout.ts    # Create Stripe checkout session
    │       ├── webhook.ts     # Stripe webhook handler
    │       └── portal.ts      # Stripe customer portal
    └── styles/
        └── globals.css
```

---

## Changing the Free Limit or Price

Edit `src/lib/constants.ts`:
```ts
export const FREE_SEARCH_LIMIT = 3;        // Change free searches
export const SUBSCRIPTION_PRICE_MONTHLY = 10; // Display price (update in Stripe too)
```

---

## Troubleshooting

**"Not authenticated" errors:** Check that your Supabase URL and anon key are correct in env vars.

**Webhook not updating subscription:** Verify the webhook secret matches, and all 4 event types are selected in Stripe.

**Google OAuth not working:** Ensure redirect URLs are configured in both Google Console and Supabase Auth settings.

**Search returns errors:** Check the Anthropic API key is valid and has credits.
