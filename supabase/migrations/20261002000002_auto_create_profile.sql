-- Auto-create an empty profile row for every new auth user, so RLS-backed
-- tables (garments, outfit_history) referencing profiles(user_id) work
-- immediately after registration.
-- Apply with: supabase db push (or paste into the Supabase SQL editor).

-- SECURITY DEFINER runs with the function owner's privileges, bypassing RLS
-- on profiles for this internal insert. The fixed search_path and the
-- absence of arguments keep it safe to expose via the trigger only.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
