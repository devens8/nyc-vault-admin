-- ============================================================================
-- Week 6: superadmin flag for the separate admin-panel app.
--
-- Run with: psql "$POSTGRES_URL_NON_POOLING" -f supabase/admin.sql
--
-- Additive only (new column, default false) so older graded deployments that
-- share this database keep working.
--
-- SECURITY: profiles has an "update your own row" RLS policy, so without extra
-- care any signed-in user could PATCH is_superadmin = true on themselves via the
-- Data API. RLS is row-level, not column-level, so we lock this down with
-- column privileges: `authenticated` may only insert/update the profile fields
-- the app actually edits (`id` is included because PostgREST upserts SET every
-- payload column; RLS still pins it to auth.uid()). is_superadmin can only be
-- changed with direct DB access (psql / SQL editor) or the service-role key —
-- never from a browser.
--
-- Bootstrapping ("won't I be locked out?"): the first admin is granted here,
-- directly in SQL over the Postgres connection string, which bypasses the app
-- entirely. Admins are never self-service.
-- ============================================================================

alter table public.profiles
  add column if not exists is_superadmin boolean not null default false;

-- Column-level privileges: replace table-wide INSERT/UPDATE with an explicit
-- list that excludes is_superadmin.
revoke insert, update on public.profiles from authenticated, anon;
grant insert (id, email, first_name, last_name, bio, avatar_url, created_at, updated_at)
  on public.profiles to authenticated;
grant update (id, email, first_name, last_name, bio, avatar_url, updated_at)
  on public.profiles to authenticated;

-- Bootstrap the owner's accounts as superadmins.
update public.profiles
   set is_superadmin = true
 where email in ('devenseth8@gmail.com', 'ds4394@columbia.edu');
