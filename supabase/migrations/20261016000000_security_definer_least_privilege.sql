/*
# ELASHA Security Advisor Remediation — Least-Privilege SECURITY DEFINER Functions

Restricts execution of SECURITY DEFINER functions so untrusted or anonymous roles cannot invoke internal helper functions directly.

- Revokes execution of `public.is_admin()` and `public.handle_new_user()` from `PUBLIC` / `anon`.
- Grants execution of `public.is_admin()` to `authenticated` and `service_role`.
- `handle_new_user()` is triggered on `auth.users` insert and does not need direct client execution permissions.
*/

-- Revoke default PUBLIC execution privileges
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
