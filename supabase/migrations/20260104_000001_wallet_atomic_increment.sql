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
  if p_field not in ('credit_balance','pending_earnings') then
    raise exception 'Invalid field';
  end if;

  execute format(
    'update public.wallets
     set %I = coalesce(%I,0) + $1,
         updated_at = now()
     where user_id = $2',
    p_field, p_field
  )
  using p_amount, p_user_id;
end;
$$;