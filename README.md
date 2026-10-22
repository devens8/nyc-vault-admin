# NYC Vault Admin

Superadmin console for [NYC Vault](https://designforgenai.vercel.app), the
AI-generated NYC spot app ([repo](https://github.com/devens8/design_for_genai)).
Separate repo and Vercel project; same Supabase database.

## What it does

| Area | Route | Abilities |
|---|---|---|
| **Overview** | `/` | KPIs (spots, members, votes, approval rate, saves, avg blurb length), superlatives (most loved / most divisive / most saved spot, top scout, biggest hype person, harshest critic), and charts: love-vs-hate by vibe (diverging), where the AI sends people (by neighborhood), daily spots and votes since launch. Every chart has hover tooltips and a "View as table" fallback. |
| **AI media** | `/media`, `/media/new`, `/media/[id]` | **Create** (generate with Gemini using the app's prompt, or write by hand), **read** (search, sort by score/votes/name), **update** (name, area, vibe, blurb), **delete** (with confirm; votes and saves cascade). The detail page shows the stored prompt and every vote on the item. |
| **Users** | `/users`, `/users/[id]` | **Read** every profile with role, spots added, score earned, votes given, saves, join date, last sign-in; per-user detail with their spots and votes. |
| **Votes** | `/votes` | **Read** every upvote/downvote with voter, spot and time; filter up/down. |

## Security model

- **Every route** is behind Google sign-in *and* `profiles.is_superadmin = true`:
  - `middleware.js` sends signed-out visitors to `/login` and signed-in
    non-admins to `/denied` before any page renders.
  - Every page and server action re-checks with `requireAdmin()` /
    `adminOrError()` (`lib/auth.js`) before it creates the service-role
    client, so a direct server-action POST can't skip the middleware.
  - The service-role client is `server-only`. It can never be bundled into the
    browser.
- **Users can't promote themselves.** The main app lets users update their own
  profile row (RLS), so `supabase/admin.sql` also restricts column privileges:
  `authenticated` can only write the profile fields the app edits, never
  `is_superadmin`. Tested: a signed-in user PATCHing `is_superadmin` gets
  `permission denied`.

### "Won't the is_superadmin requirement lock me out of my own admin area?"

No. The flag is bootstrapped **outside the app**, with direct database access
the app's users don't have. `supabase/admin.sql` was run with `psql` over the
Postgres connection string (`POSTGRES_URL_NON_POOLING`, from `vercel env pull`).
That connection uses the database owner role, so it bypasses RLS and the
column grants:

```sql
update public.profiles set is_superadmin = true where email = 'you@example.com';
```

The Supabase SQL editor or the service-role key work too. The admin app itself
deliberately has **no** "make admin" button, so granting admin always needs
database-level access.

## Google sign-in on this domain

Supabase only allow-lists the main app's production domain for OAuth
redirects. Logins here go through the main app's `/auth/relay`, which hands the
OAuth `code` straight back to this app's `/auth/callback`. Only allow-listed
origins are accepted, and the code is useless without this app's PKCE verifier
cookie.

## Local development

```bash
pnpm install
vercel env pull .env.local   # Supabase URL/keys + GEMINI_API_KEY
pnpm dev
```
