begin;

-- ============================================================
-- MODIFICATION SÉCURISÉE D'UNE CONTRIBUTION ACTIVE
-- ============================================================

create or replace function public.admin_update_contribution(
  p_contribution_id uuid,
  p_contributor_name text,
  p_amount numeric,
  p_payment_method text,
  p_notes text,
  p_contribution_date timestamp with time zone,
  p_reason text,
  p_changed_by text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_before public.contributions%rowtype;
  v_after jsonb;
begin
  if p_contribution_id is null then
    raise exception 'Identifiant de contribution obligatoire.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Le montant doit être strictement supérieur à zéro.';
  end if;

  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'Le motif de modification est obligatoire.';
  end if;

  if nullif(btrim(coalesce(p_changed_by, '')), '') is null then
    raise exception 'L''auteur de la modification est obligatoire.';
  end if;

  select *
  into v_before
  from public.contributions
  where id = p_contribution_id
  for update;

  if not found then
    raise exception 'Contribution introuvable.';
  end if;

  if coalesce(v_before.status, 'active') <> 'active' then
    raise exception 'Une contribution annulée ne peut pas être modifiée.';
  end if;

  update public.contributions
  set
    contributor_name = nullif(btrim(coalesce(p_contributor_name, '')), ''),
    amount = p_amount,
    payment_method = nullif(btrim(coalesce(p_payment_method, '')), ''),
    notes = nullif(btrim(coalesce(p_notes, '')), ''),
    contribution_date = coalesce(p_contribution_date, contribution_date),
    updated_at = now(),
    updated_by = p_changed_by,
    last_update_reason = p_reason
  where id = p_contribution_id
  returning to_jsonb(contributions.*) into v_after;

  insert into public.contribution_audit_logs (
    contribution_id,
    campaign_id,
    action,
    previous_data,
    new_data,
    reason,
    changed_by
  )
  values (
    p_contribution_id,
    v_before.campaign_id,
    'update',
    to_jsonb(v_before),
    v_after,
    p_reason,
    p_changed_by
  );

  return v_after;
end;
$function$;

-- ============================================================
-- ANNULATION SÉCURISÉE D'UNE CONTRIBUTION ACTIVE
-- ============================================================

create or replace function public.admin_cancel_contribution(
  p_contribution_id uuid,
  p_reason text,
  p_cancelled_by text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_before public.contributions%rowtype;
  v_after jsonb;
begin
  if p_contribution_id is null then
    raise exception 'Identifiant de contribution obligatoire.';
  end if;

  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'Le motif d''annulation est obligatoire.';
  end if;

  if nullif(btrim(coalesce(p_cancelled_by, '')), '') is null then
    raise exception 'L''auteur de l''annulation est obligatoire.';
  end if;

  select *
  into v_before
  from public.contributions
  where id = p_contribution_id
  for update;

  if not found then
    raise exception 'Contribution introuvable.';
  end if;

  if coalesce(v_before.status, 'active') = 'cancelled' then
    raise exception 'Cette contribution est déjà annulée.';
  end if;

  update public.contributions
  set
    status = 'cancelled',
    cancelled_at = now(),
    cancellation_reason = p_reason,
    cancelled_by = p_cancelled_by,
    updated_at = now(),
    updated_by = p_cancelled_by,
    last_update_reason = p_reason
  where id = p_contribution_id
  returning to_jsonb(contributions.*) into v_after;

  insert into public.contribution_audit_logs (
    contribution_id,
    campaign_id,
    action,
    previous_data,
    new_data,
    reason,
    changed_by
  )
  values (
    p_contribution_id,
    v_before.campaign_id,
    'cancel',
    to_jsonb(v_before),
    v_after,
    p_reason,
    p_cancelled_by
  );

  return v_after;
end;
$function$;

-- ============================================================
-- LIMITATION D'EXÉCUTION
-- Les fonctions seront appelées par les routes API serveur
-- avec le service_role Supabase.
-- ============================================================

revoke all on function public.admin_update_contribution(
  uuid, text, numeric, text, text, timestamp with time zone, text, text
) from public;

revoke all on function public.admin_update_contribution(
  uuid, text, numeric, text, text, timestamp with time zone, text, text
) from anon;

revoke all on function public.admin_update_contribution(
  uuid, text, numeric, text, text, timestamp with time zone, text, text
) from authenticated;

grant execute on function public.admin_update_contribution(
  uuid, text, numeric, text, text, timestamp with time zone, text, text
) to service_role;

revoke all on function public.admin_cancel_contribution(
  uuid, text, text
) from public;

revoke all on function public.admin_cancel_contribution(
  uuid, text, text
) from anon;

revoke all on function public.admin_cancel_contribution(
  uuid, text, text
) from authenticated;

grant execute on function public.admin_cancel_contribution(
  uuid, text, text
) to service_role;

commit;