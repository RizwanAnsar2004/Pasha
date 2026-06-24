-- Lets the signup flow check, on step 1, whether an email already has an
-- account — so we can show "already exists" before the applicant fills out the
-- whole registration form (instead of only failing at final submit).
--
-- SECURITY DEFINER so it can read auth.users; execute is restricted to
-- service_role, which is the only client that calls it (from the auth route).
CREATE OR REPLACE FUNCTION public.applicant_email_exists(p_email text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE lower(email) = lower(p_email)
  );
$$;

REVOKE ALL ON FUNCTION public.applicant_email_exists(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.applicant_email_exists(text) TO service_role;
