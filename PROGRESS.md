# SplitSEAD Progress

## Phase 0 — Foundation ✅
- GitHub repo: LouisLR1/Claude-SplitSEAD
- Vercel project: https://claude-split-sead-gykf.vercel.app (auto-deploy on push to main)
- Neon Postgres: eu-central-1
- Google OAuth: configured with localhost + Vercel redirect URIs
- Resend: API key ready, using onboarding@resend.dev sender for now
- Anthropic API key: ready
- Vercel Blob: ready
- Next.js 15 (App Router) + TypeScript + Tailwind CSS scaffolded
- shadcn/ui initialized
- All deps installed: Auth.js v5, Drizzle ORM, Neon, Resend, Anthropic SDK, Vercel Blob, Zod
- .env.example documented
- Live deploy confirmed

## Phase 1 — Data model and authentication ✅
- Full Drizzle schema defined (all tables upfront, including Phase 6+ tables)
- Migration pushed to Neon (all tables created)
- Auth.js v5 Google OAuth wired up with Drizzle adapter
- Sign in / sign out working
- Route protection via proxy (Next.js 16 middleware)
- Empty "Your groups" page for signed-in users
- Note: scaffolded with Next.js 16.2.6 (latest at time of setup); middleware renamed to proxy per v16 convention

## Phase 2 — Groups and members ✅
- Create group (name + currency) with server action
- Permanent invite link auto-created per group (nanoid token)
- Invite by email via Resend with dark-themed HTML template
- Join page at /join/[token] — works for signed-out users (redirects to Google auth then back)
- Add ghost participants (name + optional email)
- Group detail page: member list, ghost list, invite link, payments placeholder
- Groups list page with empty state
- Note: using @base-ui/react dialog (shadcn v4), uses render prop not asChild

## Phase 3 — Manual payments and balance dashboard
## Phase 4 — Receipt photo upload
## Phase 5 — Auto-categorization
## Phase 6 — Email notifications
## Phase 7 — Ghost merge and edge cases
## Phase 8 — Polish and ship
