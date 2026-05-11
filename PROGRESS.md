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

## Phase 1 — Data model and authentication 🔄
- [ ] Full Drizzle schema (all tables upfront)
- [ ] Run migration against Neon
- [ ] Auth.js v5 Google OAuth wired up
- [ ] Sign in / sign out working
- [ ] Empty "Your groups" page for signed-in users

## Phase 2 — Groups and members
## Phase 3 — Manual payments and balance dashboard
## Phase 4 — Receipt photo upload
## Phase 5 — Auto-categorization
## Phase 6 — Email notifications
## Phase 7 — Ghost merge and edge cases
## Phase 8 — Polish and ship
