-- migration: wallet_atomic_increment
-- purpose: atomic increment wallet fields safely (credit_balance / pending_earnings)

begin;

create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  credit_balance integer not null default 0,
  pending_earnings numeric not null default 0,
  updated_at timestamptz not null default now()
);

-- Atomic increment function
create or replace function public.wallet_atomic_increment(
  p_user_id uuid,
  p_field text,
  p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- ensure row exists
  insert into public.wallets (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;

  if p_field = 'credit_balance' then
    update public.wallets
    set credit_balance = credit_balance + cast(p_amount as integer),
        updated_at = now()
    where user_id = p_user_id;

  elsif p_field = 'pending_earnings' then
    update public.wallets
    set pending_earnings = pending_earnings + p_amount,
        updated_at = now()
    where user_id = p_user_id;

  else
    raise exception 'Invalid field: %', p_field;
  end if;
end;
$$;

comment on function public.wallet_atomic_increment(uuid, text, numeric)
is 'Atomically increments wallet credit_balance or pending_earnings. Used by edge functions for refunds/payouts.';

commit;