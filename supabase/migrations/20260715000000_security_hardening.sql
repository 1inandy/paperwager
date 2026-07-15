-- Security hardening: shared rate limits and atomic balance mutations.
-- Apply with `supabase db push` (or paste into the Supabase SQL editor) before
-- deploying the accompanying application code.

create table if not exists public.rate_limit_buckets (
  key_hash text primary key,
  request_count integer not null check (request_count >= 0),
  reset_at timestamptz not null
);

-- Older installations may not have this optional snapshot column yet.
alter table public.bets
  add column if not exists market_outcomes jsonb;

do $$
begin
  -- Early installations stored this snapshot as text[]. Normalize it so the
  -- atomic RPC can preserve it consistently.
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bets'
      and column_name = 'market_outcomes'
      and data_type <> 'jsonb'
  ) then
    alter table public.bets
      alter column market_outcomes type jsonb using to_jsonb(market_outcomes);
  end if;
end;
$$;

create or replace function public.check_rate_limit(
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed boolean := false;
begin
  if p_key_hash = '' or p_limit < 1 or p_window_seconds < 1 then
    return false;
  end if;

  insert into rate_limit_buckets (key_hash, request_count, reset_at)
  values (p_key_hash, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key_hash) do update
    set request_count = case
          when rate_limit_buckets.reset_at <= now() then 1
          else rate_limit_buckets.request_count + 1
        end,
        reset_at = case
          when rate_limit_buckets.reset_at <= now()
            then now() + make_interval(secs => p_window_seconds)
          else rate_limit_buckets.reset_at
        end
    where rate_limit_buckets.reset_at <= now()
       or rate_limit_buckets.request_count < p_limit
  returning true into allowed;

  return coalesce(allowed, false);
end;
$$;

-- One scorecard may have one open bet per event. This is a backstop to the
-- row lock in place_bet_atomic and protects against future write paths.
create unique index if not exists bets_one_pending_bet_per_event
  on public.bets (scorecard_id, event_id)
  where status = 'pending';

create or replace function public.place_bet_atomic(
  p_bet jsonb,
  p_description text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scorecard_id uuid := (p_bet->>'scorecard_id')::uuid;
  v_stake numeric := (p_bet->>'stake')::numeric;
  v_balance numeric;
  v_bet_id uuid;
begin
  select balance into v_balance
    from scorecards
    where id = v_scorecard_id
    for update;

  if not found then
    raise exception 'scorecard_not_found';
  end if;
  if v_stake <= 0 or v_balance < v_stake then
    raise exception 'insufficient_balance';
  end if;
  if exists (
    select 1 from bets
    where scorecard_id = v_scorecard_id
      and event_id = p_bet->>'event_id'
      and status = 'pending'
  ) then
    raise exception 'duplicate_pending_bet';
  end if;

  insert into bets (
    scorecard_id, event_id, sport_key, home_team, away_team, commence_time,
    commence_time_at_bet, market, selection, line, odds_decimal, odds_american,
    stake, potential_payout, odds_provider, bookmaker, odds_captured_at,
    settlement_rule_version, market_outcomes, status
  ) values (
    v_scorecard_id, p_bet->>'event_id', p_bet->>'sport_key',
    p_bet->>'home_team', p_bet->>'away_team', (p_bet->>'commence_time')::timestamptz,
    (p_bet->>'commence_time_at_bet')::timestamptz, p_bet->>'market',
    p_bet->>'selection', nullif(p_bet->>'line', 'null')::numeric,
    (p_bet->>'odds_decimal')::numeric, (p_bet->>'odds_american')::numeric,
    v_stake, (p_bet->>'potential_payout')::numeric, p_bet->>'odds_provider',
    p_bet->>'bookmaker', (p_bet->>'odds_captured_at')::timestamptz,
    p_bet->>'settlement_rule_version', p_bet->'market_outcomes', 'pending'
  ) returning id into v_bet_id;

  update scorecards
    set balance = balance - v_stake
    where id = v_scorecard_id;

  insert into balance_transactions (scorecard_id, bet_id, amount, type, description)
    values (v_scorecard_id, v_bet_id, -v_stake, 'bet_placed', p_description);

  return v_bet_id;
end;
$$;

create or replace function public.cancel_bet_atomic(
  p_bet_id uuid,
  p_description text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scorecard_id uuid;
  v_stake numeric;
begin
  update bets
    set status = 'void', settled_at = now(), profit = 0
    where id = p_bet_id and status = 'pending'
    returning scorecard_id, stake into v_scorecard_id, v_stake;

  if not found then
    return false;
  end if;

  update scorecards
    set balance = balance + v_stake
    where id = v_scorecard_id;

  insert into balance_transactions (scorecard_id, bet_id, amount, type, description)
    values (v_scorecard_id, p_bet_id, v_stake, 'bet_void', p_description);

  return true;
end;
$$;

create or replace function public.settle_bet_atomic(
  p_bet_id uuid,
  p_status text,
  p_profit numeric,
  p_payout numeric,
  p_settlement_rule_version text,
  p_transaction_type text,
  p_transaction_amount numeric,
  p_description text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_scorecard_id uuid;
begin
  update bets
    set status = p_status,
        settled_at = now(),
        profit = p_profit,
        settlement_rule_version = p_settlement_rule_version
    where id = p_bet_id and status = 'pending'
    returning scorecard_id into v_scorecard_id;

  if not found then
    return false;
  end if;

  if p_payout <> 0 then
    update scorecards
      set balance = balance + p_payout
      where id = v_scorecard_id;
  end if;

  insert into balance_transactions (scorecard_id, bet_id, amount, type, description)
    values (
      v_scorecard_id, p_bet_id, p_transaction_amount,
      p_transaction_type, p_description
    );

  return true;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
revoke all on function public.place_bet_atomic(jsonb, text) from public;
revoke all on function public.cancel_bet_atomic(uuid, text) from public;
revoke all on function public.settle_bet_atomic(uuid, text, numeric, numeric, text, text, numeric, text) from public;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;
grant execute on function public.place_bet_atomic(jsonb, text) to service_role;
grant execute on function public.cancel_bet_atomic(uuid, text) to service_role;
grant execute on function public.settle_bet_atomic(uuid, text, numeric, numeric, text, text, numeric, text) to service_role;
