-- Harden auth user profile provisioning to avoid signup failures from malformed metadata.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_text text;
  v_role public.user_role := 'buyer';
  v_full_name text;
begin
  v_role_text := lower(trim(coalesce(new.raw_user_meta_data ->> 'role', 'buyer')));
  if v_role_text in ('buyer', 'farmer', 'admin') then
    v_role := v_role_text::public.user_role;
  end if;

  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(new.email, '@', 1), ''),
    'user'
  );

  insert into public.profiles (id, full_name, email, role, phone, county)
  values (
    new.id,
    v_full_name,
    new.email,
    v_role,
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'county'), '')
  )
  on conflict (id) do update
    set
      full_name = excluded.full_name,
      email = excluded.email,
      role = excluded.role,
      phone = excluded.phone,
      county = excluded.county,
      updated_at = now();

  return new;
exception
  when others then
    -- Never block auth signup due to profile-metadata issues.
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();
