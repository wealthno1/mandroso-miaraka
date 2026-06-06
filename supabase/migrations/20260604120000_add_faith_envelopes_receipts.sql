begin;

create extension if not exists pgcrypto;

-- ============================================================
-- SPRINT 1 - ENVELOPPES & RECUS
-- Migration additive pour Valopy Finoana / Mandroso Miaraka
--
-- Les paiements d'enveloppes ne sont PAS inseres dans contributions.
-- numbered_envelopes reste la table technique d'impression.
-- faith_envelopes devient la table metier des enveloppes distribuees.
-- ============================================================

-- ============================================================
-- 1. TABLES
-- ============================================================

create table if not exists public.faith_envelopes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id),
  numbered_envelope_id uuid null references public.numbered_envelopes(id),
  envelope_number text not null,
  beneficiary_name text,
  beneficiary_type text not null default 'person',
  phone text,
  distributed_by text,
  distributed_at date,
  is_anonymous boolean not null default false,
  status text not null default 'distributed',
  total_paid numeric not null default 0,
  final_category text,
  has_prayer_request boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  constraint faith_envelopes_envelope_number_format_check
    check (envelope_number ~ '^[0-9]{4}$'),

  constraint faith_envelopes_status_check
    check (status in ('distributed', 'in_progress', 'closed', 'cancelled')),

  constraint faith_envelopes_total_paid_check
    check (total_paid >= 0),

  constraint faith_envelopes_beneficiary_type_check
    check (beneficiary_type in ('person', 'family', 'group', 'sampana', 'anonymous')),

  constraint faith_envelopes_campaign_envelope_number_unique
    unique (campaign_id, envelope_number)
);

create unique index if not exists faith_envelopes_numbered_envelope_id_unique
on public.faith_envelopes(numbered_envelope_id)
where numbered_envelope_id is not null;


create table if not exists public.receipt_books (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id),
  book_number integer not null,
  receipt_count integer not null default 25,
  start_receipt_number integer not null,
  end_receipt_number integer not null,
  responsible_name text,
  responsible_user_id uuid,
  assigned_at date,
  returned_at date,
  status text not null default 'prepared',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  constraint receipt_books_campaign_book_number_unique
    unique (campaign_id, book_number),

  constraint receipt_books_receipt_count_check
    check (receipt_count = 25),

  constraint receipt_books_book_number_check
    check (book_number > 0),

  constraint receipt_books_start_receipt_number_check
    check (start_receipt_number > 0),

  constraint receipt_books_start_formula_check
    check (start_receipt_number = ((book_number - 1) * receipt_count) + 1),

  constraint receipt_books_end_formula_check
    check (end_receipt_number = book_number * receipt_count),

  constraint receipt_books_end_receipt_number_check
    check (end_receipt_number = start_receipt_number + receipt_count - 1),

  constraint receipt_books_status_check
    check (status in ('prepared', 'assigned', 'in_use', 'returned', 'verified', 'cancelled'))
);


create table if not exists public.receipt_registry (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id),
  receipt_book_id uuid not null references public.receipt_books(id),
  receipt_number integer not null,
  receipt_number_display text generated always as (
    lpad(receipt_number::text, 3, '0')
  ) stored,
  internal_code text,
  status text not null default 'available',
  foana_reason text,
  foana_at timestamptz,
  foana_by text,
  voided_reason text,
  voided_at timestamptz,
  voided_by text,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  constraint receipt_registry_status_check
    check (status in ('available', 'used', 'foana', 'voided')),

  constraint receipt_registry_receipt_number_check
    check (receipt_number > 0),

  constraint receipt_registry_campaign_receipt_number_unique
    unique (campaign_id, receipt_number)
);

create unique index if not exists receipt_registry_internal_code_unique
on public.receipt_registry(internal_code)
where internal_code is not null;


create table if not exists public.faith_envelope_payments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id),
  envelope_id uuid not null references public.faith_envelopes(id),
  receipt_registry_id uuid null references public.receipt_registry(id),
  no_receipt_exception_reason text,
  amount numeric not null,
  payment_method text not null default 'cash',
  paid_at timestamptz not null default now(),
  is_closing_payment boolean not null default false,
  operator_name text,
  notes text,
  status text not null default 'active',
  cancellation_reason text,
  cancelled_at timestamptz,
  cancelled_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text,
  updated_by text,

  constraint faith_envelope_payments_amount_check
    check (amount > 0),

  constraint faith_envelope_payments_status_check
    check (status in ('active', 'cancelled')),

  constraint faith_envelope_payments_payment_method_check
    check (payment_method in ('cash', 'mvola', 'orange_money', 'transfer', 'check', 'other')),

  constraint faith_envelope_payments_receipt_or_exception_check
    check (
      receipt_registry_id is not null
      or nullif(btrim(coalesce(no_receipt_exception_reason, '')), '') is not null
    ),

  constraint faith_envelope_payments_cancellation_reason_check
    check (
      status <> 'cancelled'
      or nullif(btrim(coalesce(cancellation_reason, '')), '') is not null
    ),

  constraint faith_envelope_payments_receipt_registry_unique
    unique (receipt_registry_id)
);


create table if not exists public.faith_envelope_prayers (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id),
  envelope_id uuid not null references public.faith_envelopes(id),
  payment_id uuid null references public.faith_envelope_payments(id),
  prayer_text text not null,
  confidentiality text not null default 'internal',
  created_at timestamptz not null default now(),
  created_by text,

  constraint faith_envelope_prayers_confidentiality_check
    check (confidentiality in ('internal', 'pastor'))
);


-- ============================================================
-- 2. INDEX
-- ============================================================

create index if not exists faith_envelopes_campaign_id_idx
on public.faith_envelopes(campaign_id);

create index if not exists faith_envelopes_campaign_envelope_number_idx
on public.faith_envelopes(campaign_id, envelope_number);

create index if not exists faith_envelopes_status_idx
on public.faith_envelopes(status);

create index if not exists faith_envelopes_distributed_by_idx
on public.faith_envelopes(distributed_by);

create index if not exists faith_envelopes_phone_idx
on public.faith_envelopes(phone);

create index if not exists faith_envelope_payments_campaign_id_idx
on public.faith_envelope_payments(campaign_id);

create index if not exists faith_envelope_payments_envelope_id_idx
on public.faith_envelope_payments(envelope_id);

create index if not exists faith_envelope_payments_status_idx
on public.faith_envelope_payments(status);

create index if not exists receipt_books_campaign_id_idx
on public.receipt_books(campaign_id);

create index if not exists receipt_registry_campaign_id_idx
on public.receipt_registry(campaign_id);

create index if not exists receipt_registry_receipt_book_id_idx
on public.receipt_registry(receipt_book_id);

create index if not exists receipt_registry_status_idx
on public.receipt_registry(status);

create index if not exists faith_envelope_prayers_envelope_id_idx
on public.faith_envelope_prayers(envelope_id);

create index if not exists faith_envelope_prayers_payment_id_idx
on public.faith_envelope_prayers(payment_id);


-- ============================================================
-- 3. UPDATED_AT SPECIFIQUE AU MODULE
-- ============================================================

create or replace function public.set_mandroso_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  new.updated_at := now();
  return new;
end;
$function$;

drop trigger if exists set_updated_at_faith_envelopes on public.faith_envelopes;
create trigger set_updated_at_faith_envelopes
before update on public.faith_envelopes
for each row
execute function public.set_mandroso_updated_at();

drop trigger if exists set_updated_at_receipt_books on public.receipt_books;
create trigger set_updated_at_receipt_books
before update on public.receipt_books
for each row
execute function public.set_mandroso_updated_at();

drop trigger if exists set_updated_at_receipt_registry on public.receipt_registry;
create trigger set_updated_at_receipt_registry
before update on public.receipt_registry
for each row
execute function public.set_mandroso_updated_at();

drop trigger if exists set_updated_at_faith_envelope_payments on public.faith_envelope_payments;
create trigger set_updated_at_faith_envelope_payments
before update on public.faith_envelope_payments
for each row
execute function public.set_mandroso_updated_at();


-- ============================================================
-- 4. VALIDATION DES PLAGES DE CARNETS ET RECUS
-- ============================================================

create or replace function public.validate_receipt_book_range()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if exists (
    select 1
    from public.receipt_books rb
    where rb.campaign_id = new.campaign_id
      and rb.id is distinct from new.id
      and int4range(rb.start_receipt_number, rb.end_receipt_number + 1, '[)')
          && int4range(new.start_receipt_number, new.end_receipt_number + 1, '[)')
  ) then
    raise exception 'La plage de recus chevauche un carnet existant dans cette campagne.';
  end if;

  return new;
end;
$function$;

drop trigger if exists validate_receipt_book_range_trigger on public.receipt_books;
create trigger validate_receipt_book_range_trigger
before insert or update on public.receipt_books
for each row
execute function public.validate_receipt_book_range();


create or replace function public.validate_receipt_registry_book_range()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_book public.receipt_books%rowtype;
begin
  select *
  into v_book
  from public.receipt_books
  where id = new.receipt_book_id;

  if not found then
    raise exception 'Carnet de recus introuvable.';
  end if;

  if v_book.campaign_id <> new.campaign_id then
    raise exception 'Le recu doit appartenir a la meme campagne que son carnet.';
  end if;

  if new.receipt_number < v_book.start_receipt_number
     or new.receipt_number > v_book.end_receipt_number then
    raise exception 'Le numero de recu doit appartenir a la plage du carnet.';
  end if;

  return new;
end;
$function$;

drop trigger if exists validate_receipt_registry_book_range_trigger on public.receipt_registry;
create trigger validate_receipt_registry_book_range_trigger
before insert or update on public.receipt_registry
for each row
execute function public.validate_receipt_registry_book_range();


-- ============================================================
-- 5. VALIDATION COHERENCE CAMPAGNE
-- ============================================================

create or replace function public.validate_faith_envelope_payment_campaign()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_envelope_campaign_id uuid;
  v_receipt_campaign_id uuid;
  v_receipt_status text;
  v_receipt_changed boolean;
begin
  select campaign_id
  into v_envelope_campaign_id
  from public.faith_envelopes
  where id = new.envelope_id;

  if not found then
    raise exception 'Enveloppe metier introuvable.';
  end if;

  if new.campaign_id <> v_envelope_campaign_id then
    raise exception 'Le paiement doit appartenir a la meme campagne que son enveloppe.';
  end if;

  if new.receipt_registry_id is not null then
    select campaign_id, status
    into v_receipt_campaign_id, v_receipt_status
    from public.receipt_registry
    where id = new.receipt_registry_id;

    if not found then
      raise exception 'Recu introuvable.';
    end if;

    if new.campaign_id <> v_receipt_campaign_id then
      raise exception 'Le paiement doit appartenir a la meme campagne que son recu.';
    end if;

    if tg_op = 'INSERT' then
      v_receipt_changed := true;
    elsif tg_op = 'UPDATE' then
      v_receipt_changed := old.receipt_registry_id is distinct from new.receipt_registry_id;
    else
      v_receipt_changed := false;
    end if;

    if v_receipt_changed and v_receipt_status <> 'available' then
      raise exception 'Le recu n''est pas disponible.';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists validate_faith_envelope_payment_campaign_trigger
on public.faith_envelope_payments;

create trigger validate_faith_envelope_payment_campaign_trigger
before insert or update on public.faith_envelope_payments
for each row
execute function public.validate_faith_envelope_payment_campaign();


create or replace function public.validate_faith_envelope_prayer_campaign()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_envelope_campaign_id uuid;
  v_payment_campaign_id uuid;
begin
  select campaign_id
  into v_envelope_campaign_id
  from public.faith_envelopes
  where id = new.envelope_id;

  if not found then
    raise exception 'Enveloppe metier introuvable.';
  end if;

  if new.campaign_id <> v_envelope_campaign_id then
    raise exception 'La demande de priere doit appartenir a la meme campagne que son enveloppe.';
  end if;

  if new.payment_id is not null then
    select campaign_id
    into v_payment_campaign_id
    from public.faith_envelope_payments
    where id = new.payment_id;

    if not found then
      raise exception 'Paiement introuvable.';
    end if;

    if new.campaign_id <> v_payment_campaign_id then
      raise exception 'La demande de priere doit appartenir a la meme campagne que son paiement.';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists validate_faith_envelope_prayer_campaign_trigger
on public.faith_envelope_prayers;

create trigger validate_faith_envelope_prayer_campaign_trigger
before insert or update on public.faith_envelope_prayers
for each row
execute function public.validate_faith_envelope_prayer_campaign();


-- ============================================================
-- 6. RECALCUL TOTAL ENVELOPPE ET DEMANDE DE PRIERE
-- ============================================================

create or replace function public.recalculate_faith_envelope_total(
  p_envelope_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $function$
begin
  if p_envelope_id is null then
    return;
  end if;

  update public.faith_envelopes fe
  set
    total_paid = (
      select coalesce(sum(fep.amount), 0)
      from public.faith_envelope_payments fep
      where fep.envelope_id = p_envelope_id
        and fep.status = 'active'
    ),
    has_prayer_request = exists (
      select 1
      from public.faith_envelope_prayers fpr
      where fpr.envelope_id = p_envelope_id
    ),
    updated_at = now()
  where fe.id = p_envelope_id;
end;
$function$;


create or replace function public.recalculate_faith_envelope_from_payment_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if tg_op <> 'DELETE' then
    perform public.recalculate_faith_envelope_total(new.envelope_id);
  end if;

  if tg_op <> 'INSERT'
     and old.envelope_id is distinct from coalesce(new.envelope_id, old.envelope_id) then
    perform public.recalculate_faith_envelope_total(old.envelope_id);
  end if;

  if tg_op = 'DELETE' then
    perform public.recalculate_faith_envelope_total(old.envelope_id);
  end if;

  return coalesce(new, old);
end;
$function$;

drop trigger if exists recalculate_faith_envelope_from_payment
on public.faith_envelope_payments;

create trigger recalculate_faith_envelope_from_payment
after insert or update or delete on public.faith_envelope_payments
for each row
execute function public.recalculate_faith_envelope_from_payment_trigger();


create or replace function public.recalculate_faith_envelope_from_prayer_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
begin
  if tg_op <> 'DELETE' then
    perform public.recalculate_faith_envelope_total(new.envelope_id);
  end if;

  if tg_op <> 'INSERT'
     and old.envelope_id is distinct from coalesce(new.envelope_id, old.envelope_id) then
    perform public.recalculate_faith_envelope_total(old.envelope_id);
  end if;

  if tg_op = 'DELETE' then
    perform public.recalculate_faith_envelope_total(old.envelope_id);
  end if;

  return coalesce(new, old);
end;
$function$;

drop trigger if exists recalculate_faith_envelope_from_prayer
on public.faith_envelope_prayers;

create trigger recalculate_faith_envelope_from_prayer
after insert or update or delete on public.faith_envelope_prayers
for each row
execute function public.recalculate_faith_envelope_from_prayer_trigger();


-- ============================================================
-- 7. RECALCUL campaigns.current_amount
-- Remplace la fonction existante, en ajoutant faith_envelope_payments actifs.
-- ============================================================

create or replace function public.update_campaign_current_amount()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_new_campaign_id uuid;
  v_old_campaign_id uuid;
begin
  if tg_op <> 'DELETE' then
    v_new_campaign_id := new.campaign_id;
  end if;

  if tg_op <> 'INSERT' then
    v_old_campaign_id := old.campaign_id;
  end if;

  if v_new_campaign_id is not null then
    update public.campaigns as c
    set current_amount =
      (
        select coalesce(sum(amount), 0)
        from public.contributions
        where campaign_id = v_new_campaign_id
          and status = 'active'
      )
      +
      (
        select coalesce(sum(amount), 0)
        from public.rakitra
        where campaign_id = v_new_campaign_id
      )
      +
      (
        select coalesce(sum(amount), 0)
        from public.faith_envelope_payments
        where campaign_id = v_new_campaign_id
          and status = 'active'
      )
    where c.id = v_new_campaign_id;
  end if;

  if v_old_campaign_id is not null
     and v_old_campaign_id is distinct from v_new_campaign_id then
    update public.campaigns as c
    set current_amount =
      (
        select coalesce(sum(amount), 0)
        from public.contributions
        where campaign_id = v_old_campaign_id
          and status = 'active'
      )
      +
      (
        select coalesce(sum(amount), 0)
        from public.rakitra
        where campaign_id = v_old_campaign_id
      )
      +
      (
        select coalesce(sum(amount), 0)
        from public.faith_envelope_payments
        where campaign_id = v_old_campaign_id
          and status = 'active'
      )
    where c.id = v_old_campaign_id;
  end if;

  return coalesce(new, old);
end;
$function$;

drop trigger if exists update_campaign_current_amount_faith_envelope_payments
on public.faith_envelope_payments;

create trigger update_campaign_current_amount_faith_envelope_payments
after insert or update or delete on public.faith_envelope_payments
for each row
execute function public.update_campaign_current_amount();


-- ============================================================
-- 8. RLS / GRANTS PRUDENTS
-- ============================================================

alter table public.faith_envelopes enable row level security;
alter table public.receipt_books enable row level security;
alter table public.receipt_registry enable row level security;
alter table public.faith_envelope_payments enable row level security;
alter table public.faith_envelope_prayers enable row level security;

revoke all on public.faith_envelopes from anon;
revoke all on public.faith_envelopes from authenticated;

revoke all on public.receipt_books from anon;
revoke all on public.receipt_books from authenticated;

revoke all on public.receipt_registry from anon;
revoke all on public.receipt_registry from authenticated;

revoke all on public.faith_envelope_payments from anon;
revoke all on public.faith_envelope_payments from authenticated;

revoke all on public.faith_envelope_prayers from anon;
revoke all on public.faith_envelope_prayers from authenticated;

grant all on public.faith_envelopes to service_role;
grant all on public.receipt_books to service_role;
grant all on public.receipt_registry to service_role;
grant all on public.faith_envelope_payments to service_role;
grant all on public.faith_envelope_prayers to service_role;

revoke execute on function public.set_mandroso_updated_at() from public;
revoke execute on function public.validate_receipt_book_range() from public;
revoke execute on function public.validate_receipt_registry_book_range() from public;
revoke execute on function public.validate_faith_envelope_payment_campaign() from public;
revoke execute on function public.validate_faith_envelope_prayer_campaign() from public;
revoke execute on function public.recalculate_faith_envelope_total(uuid) from public;
revoke execute on function public.recalculate_faith_envelope_from_payment_trigger() from public;
revoke execute on function public.recalculate_faith_envelope_from_prayer_trigger() from public;

grant execute on function public.set_mandroso_updated_at() to service_role;
grant execute on function public.validate_receipt_book_range() to service_role;
grant execute on function public.validate_receipt_registry_book_range() to service_role;
grant execute on function public.validate_faith_envelope_payment_campaign() to service_role;
grant execute on function public.validate_faith_envelope_prayer_campaign() to service_role;
grant execute on function public.recalculate_faith_envelope_total(uuid) to service_role;
grant execute on function public.recalculate_faith_envelope_from_payment_trigger() to service_role;
grant execute on function public.recalculate_faith_envelope_from_prayer_trigger() to service_role;

commit;
