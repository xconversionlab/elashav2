/*
# ELASHA Profile On Signup

Creates a `profiles` row for every new auth user.

Nothing populated `profiles` before: the client insert in `signUp` only works
when a session is returned, which is not the case while email confirmation is
enabled. Without a profile row, the account page and admin customer list have no
name for the user.

The trigger runs as the function owner (SECURITY DEFINER) so it can write to
`profiles` regardless of the caller's RLS context.

Idempotent: `ON CONFLICT (id) DO NOTHING` and `DROP TRIGGER IF EXISTS`.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
