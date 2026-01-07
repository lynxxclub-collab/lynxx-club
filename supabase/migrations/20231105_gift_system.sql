-- 1. Create Tables
create table if not exists public.gift_catalog (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  emoji text not null,
  credits_cost int not null check (credits_cost > 0),
  description text,
  animation_type text check (animation_type in ('standard', 'premium', 'ultra')) default 'standard',
  sort_order int default 0,
  is_seasonal boolean default false,
  season_tag text,
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

create table if not exists public.gift_transactions (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references auth.users not null,
  recipient_id uuid references auth.users not null,
  conversation_id uuid,
  gift_id uuid references public.gift_catalog not null,
  credits_spent int not null,
  earner_amount int not null,
  platform_fee int not null,
  message text,
  thank_you_reaction text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- 2. Create the Robust RPC Function
-- This function runs atomically: either everything succeeds, or nothing happens.
create or replace function public.send_gift(
  p_sender_id uuid,
  p_recipient_id uuid,
  p_gift_id uuid,
  p_conversation_id uuid default null,
  p_message text default null
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_gift record;
  v_sender_balance int;
  v_earner_amount int;
  v_platform_fee int;
  v_transaction_id uuid;
begin
  -- 1. Get Gift Details
  select * into v_gift
  from public.gift_catalog
  where id = p_gift_id and active = true;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Gift not found');
  end if;

  -- 2. Get Sender Balance
  select coalesce(balance, 0) into v_sender_balance
  from public.wallets
  where user_id = p_sender_id;

  -- 3. Validate Balance
  if v_sender_balance < v_gift.credits_cost then
    return jsonb_build_object('success', false, 'error', 'Insufficient credits');
  end if;

  -- 4. Calculate Splits (70% to Earner, 30% Platform)
  v_earner_amount := floor(v_gift.credits_cost * 0.70);
  v_platform_fee := v_gift.credits_cost - v_earner_amount;

  -- 5. Perform Transaction (Atomic)
  -- Deduct from Sender
  update public.wallets
  set balance = balance - v_gift.credits_cost
  where user_id = p_sender_id;

  -- Add to Recipient (Earner)
  insert into public.wallets (user_id, balance, total_earned)
  values (p_recipient_id, v_earner_amount, v_earner_amount)
  on conflict (user_id) 
  do update set 
    balance = wallets.balance + v_earner_amount,
    total_earned = wallets.total_earned + v_earner_amount;

  -- Create Transaction Record
  insert into public.gift_transactions (
    sender_id, recipient_id, conversation_id, gift_id, 
    credits_spent, earner_amount, platform_fee, message
  ) values (
    p_sender_id, p_recipient_id, p_conversation_id, p_gift_id,
    v_gift.credits_cost, v_earner_amount, v_platform_fee, p_message
  ) returning id into v_transaction_id;

  -- 6. Return Success Data
  return jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'gift_name', v_gift.name,
    'gift_emoji', v_gift.emoji,
    'animation_type', v_gift.animation_type,
    'credits_spent', v_gift.credits_cost,
    'new_balance', v_sender_balance - v_gift.credits_cost
  );
end;
$$;
