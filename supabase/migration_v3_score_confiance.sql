-- ============================================================
-- FreeZone Market — MIGRATION V3 : score de confiance dynamique
-- À exécuter dans le SQL Editor APRÈS migration_v2_securite_transactions.sql
-- (la vue lit les tables conversations/messages créées par la v2).
--
-- Modèle inspiré d'Alibaba (Supplier Assessment) et d'Upwork
-- (Job Success Score) : un score 0–100 recalculé en continu qui
-- MONTE avec les transactions réussies sur la plateforme et BAISSE
-- avec les litiges et les tentatives de contournement. Comme la
-- réputation n'existe que sur la plateforme, elle devient un actif
-- que le vendeur ne veut pas perdre — c'est le pilier n° 3 de la
-- stratégie anti-fuite.
--
-- Barème (max 100) :
--   Avis clients            jusqu'à 35  (moyenne/5 × 35 ; 15 si aucun avis)
--   Commandes menées à bien jusqu'à 20  (plafond à 50 commandes)
--   Ancienneté              jusqu'à 10  (plafond à 24 mois)
--   Vérification sur site          10
--   Réactivité messagerie   jusqu'à 15  (<4 h : 15 ; <24 h : 10 ; <72 h : 5)
--   Badge fiabilité stock          10
--   Malus litiges           jusqu'à −15 (proportionnel au taux de litige)
--   Malus fuites (90 j)     jusqu'à −20 (−5 par tentative signalée)
-- ============================================================

-- ------------------------------------------------------------
-- A. Les avis alimentent enfin la note des entreprises
--    (rating_avg / rating_count étaient des valeurs de seed figées)
-- ------------------------------------------------------------
create or replace function refresh_company_rating()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.entity_type = 'seller' then
    update companies c
    set rating_avg = sub.avg_r,
        rating_count = sub.cnt
    from (
      select coalesce(avg(rating), 0)::numeric(3,2) as avg_r, count(*) as cnt
      from reviews
      where reviewed_entity_id = new.reviewed_entity_id
        and entity_type = 'seller'
    ) sub
    where c.id = new.reviewed_entity_id;
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_refresh_rating on reviews;
create trigger reviews_refresh_rating
  after insert on reviews
  for each row execute function refresh_company_rating();

-- ------------------------------------------------------------
-- B. Le volume traité alimente le palier de fidélité
--    (commission dégressive — LoyaltyTier)
-- ------------------------------------------------------------
create or replace function accumulate_company_volume()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  if new.status = 'funds_released' and old.status is distinct from 'funds_released' then
    update companies
    set total_volume_usd = total_volume_usd + new.total_amount
    where id = new.seller_id;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_accumulate_volume on orders;
create trigger orders_accumulate_volume
  after update on orders
  for each row execute function accumulate_company_volume();

-- ------------------------------------------------------------
-- C. Vue publique du score de confiance
--    (agrégats uniquement — aucune coordonnée, les malus internes
--     ne sont pas détaillés publiquement, seul le score les reflète)
-- ------------------------------------------------------------
create or replace view company_trust_scores as
with order_stats as (
  select seller_id,
         count(*) filter (where status in ('escrow_funded','preparing','loaded',
                                           'in_transit','delivered','funds_released')) as orders_secured,
         count(*) filter (where status in ('delivered','funds_released')) as orders_completed
  from orders
  group by seller_id
),
dispute_stats as (
  select o.seller_id, count(d.id) as disputes_cnt
  from disputes d
  join orders o on o.id = d.order_id
  group by o.seller_id
),
leak_stats as (
  select c.id as company_id, count(a.id) as leaks_90d
  from companies c
  join profiles p on p.id = c.owner_id
  left join audit_log a
    on a.actor_id = p.id
   and a.action = 'MESSAGE_LEAK_FLAGGED'
   and a.created_at > now() - interval '90 days'
  group by c.id
),
response_stats as (
  select cv.seller_company_id as company_id,
         avg(extract(epoch from (first_reply.at - first_msg.at))) as avg_response_s
  from conversations cv
  join lateral (
    select min(m.created_at) as at
    from messages m
    where m.conversation_id = cv.id and m.sender_id = cv.buyer_id
  ) first_msg on first_msg.at is not null
  join lateral (
    select min(m.created_at) as at
    from messages m
    where m.conversation_id = cv.id and m.sender_id <> cv.buyer_id
  ) first_reply on first_reply.at is not null
  group by cv.seller_company_id
)
select
  c.id as company_id,
  round(greatest(0, least(100,
      case when c.rating_count > 0 then (c.rating_avg / 5.0) * 35 else 15 end
    + least(coalesce(os.orders_completed, 0), 50) / 50.0 * 20
    + least(extract(epoch from (now() - c.created_at)) / 86400.0 / 730.0, 1) * 10
    + case when c.verified_on_site then 10 else 0 end
    + case
        when rs.avg_response_s is null then 5
        when rs.avg_response_s < 4 * 3600 then 15
        when rs.avg_response_s < 24 * 3600 then 10
        when rs.avg_response_s < 72 * 3600 then 5
        else 0
      end
    + case when c.reliability_badge then 10 else 0 end
    - coalesce(least(coalesce(ds.disputes_cnt, 0)::numeric
                     / nullif(os.orders_secured, 0) * 50, 15), 0)
    - least(coalesce(ls.leaks_90d, 0) * 5, 20)
  )))::integer as score,
  c.rating_avg,
  c.rating_count,
  coalesce(os.orders_completed, 0) as orders_completed,
  floor(extract(epoch from (now() - c.created_at)) / 86400.0 / 30.0)::integer as months_active,
  c.verified_on_site,
  c.reliability_badge,
  case
    when rs.avg_response_s is null then 'none'
    when rs.avg_response_s < 4 * 3600 then 'fast'
    when rs.avg_response_s < 24 * 3600 then 'day'
    else 'slow'
  end as response_bucket,
  coalesce(ds.disputes_cnt, 0) as disputes_cnt
from companies c
left join order_stats os on os.seller_id = c.id
left join dispute_stats ds on ds.seller_id = c.id
left join leak_stats ls on ls.company_id = c.id
left join response_stats rs on rs.company_id = c.id;

grant select on company_trust_scores to anon, authenticated;

-- ------------------------------------------------------------
-- D. Cycle de vie de la commande (RPC transactionnelles)
--    C'est ce cycle qui active toute la boucle anti-contournement :
--    séquestre payé → contact débloqué + stock fermement décrémenté ;
--    livraison confirmée → fonds libérés → volume + avis + score.
-- ------------------------------------------------------------

-- Financer le séquestre. MVP : déclenché par l'acheteur (simulation).
-- Production : à déclencher par la confirmation bancaire via service role.
create or replace function fund_escrow(p_order_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_me uuid := current_profile_id();
  v_order orders%rowtype;
begin
  select * into v_order from orders where id = p_order_id for update;
  if v_order.id is null then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.buyer_id <> v_me then raise exception 'NOT_BUYER'; end if;
  if v_order.status <> 'created' then raise exception 'BAD_STATUS'; end if;

  update orders set status = 'escrow_funded' where id = p_order_id;

  -- La réservation devient ferme : le stock réel est décrémenté
  update products
  set stock_qty = stock_qty - v_order.qty,
      reserved_qty = greatest(0, reserved_qty - v_order.qty)
  where id = v_order.product_id;
  delete from stock_reservations where order_id = p_order_id;

  insert into audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (v_me, 'ESCROW_FUNDED', 'order', p_order_id,
          jsonb_build_object('amount', v_order.total_amount));
end;
$$;
grant execute on function fund_escrow(uuid) to authenticated;

-- Le vendeur fait avancer la préparation/expédition, étape par étape
create or replace function seller_advance_order(p_order_id uuid)
returns order_status
language plpgsql security definer
set search_path = public
as $$
declare
  v_me uuid := current_profile_id();
  v_order orders%rowtype;
  v_next order_status;
begin
  select * into v_order from orders where id = p_order_id for update;
  if v_order.id is null then raise exception 'ORDER_NOT_FOUND'; end if;
  if not exists (select 1 from companies c
                 where c.id = v_order.seller_id and c.owner_id = v_me) then
    raise exception 'NOT_SELLER';
  end if;

  v_next := case v_order.status
    when 'escrow_funded' then 'preparing'::order_status
    when 'preparing' then 'loaded'::order_status
    when 'loaded' then 'in_transit'::order_status
    when 'in_transit' then 'delivered'::order_status
    else null
  end;
  if v_next is null then raise exception 'BAD_STATUS'; end if;

  update orders set status = v_next where id = p_order_id;

  insert into audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (v_me, 'ORDER_ADVANCED', 'order', p_order_id,
          jsonb_build_object('from', v_order.status, 'to', v_next));
  return v_next;
end;
$$;
grant execute on function seller_advance_order(uuid) to authenticated;

-- L'acheteur confirme la réception : les fonds sont libérés au vendeur
-- (le trigger orders_accumulate_volume crédite alors son volume/palier)
create or replace function confirm_delivery(p_order_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_me uuid := current_profile_id();
  v_order orders%rowtype;
begin
  select * into v_order from orders where id = p_order_id for update;
  if v_order.id is null then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.buyer_id <> v_me then raise exception 'NOT_BUYER'; end if;
  if v_order.status <> 'delivered' then raise exception 'BAD_STATUS'; end if;

  update orders set status = 'funds_released' where id = p_order_id;

  insert into audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (v_me, 'FUNDS_RELEASED', 'order', p_order_id,
          jsonb_build_object('amount', v_order.total_amount));
end;
$$;
grant execute on function confirm_delivery(uuid) to authenticated;

-- Ouvrir un litige (gèle la libération des fonds)
create or replace function open_dispute(p_order_id uuid, p_reason text)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_me uuid := current_profile_id();
  v_order orders%rowtype;
  v_id uuid;
begin
  if length(trim(coalesce(p_reason, ''))) < 10 then
    raise exception 'REASON_TOO_SHORT';
  end if;
  select * into v_order from orders where id = p_order_id for update;
  if v_order.id is null then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.buyer_id <> v_me
     and not exists (select 1 from companies c
                     where c.id = v_order.seller_id and c.owner_id = v_me) then
    raise exception 'NOT_A_PARTY';
  end if;
  if v_order.status not in ('escrow_funded','preparing','loaded','in_transit','delivered') then
    raise exception 'BAD_STATUS';
  end if;

  insert into disputes (order_id, raised_by, reason)
  values (p_order_id, v_me, p_reason)
  returning id into v_id;
  update orders set status = 'disputed' where id = p_order_id;

  insert into audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (v_me, 'DISPUTE_OPENED', 'order', p_order_id,
          jsonb_build_object('dispute_id', v_id));
  return v_id;
end;
$$;
grant execute on function open_dispute(uuid, text) to authenticated;

-- Annulation par l'acheteur tant que rien n'est payé
create or replace function cancel_order(p_order_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_me uuid := current_profile_id();
  v_order orders%rowtype;
begin
  select * into v_order from orders where id = p_order_id for update;
  if v_order.id is null then raise exception 'ORDER_NOT_FOUND'; end if;
  if v_order.buyer_id <> v_me then raise exception 'NOT_BUYER'; end if;
  if v_order.status <> 'created' then raise exception 'BAD_STATUS'; end if;

  update orders set status = 'cancelled' where id = p_order_id;
  update products set reserved_qty = greatest(0, reserved_qty - v_order.qty)
  where id = v_order.product_id;
  delete from stock_reservations where order_id = p_order_id;

  insert into audit_log (actor_id, action, entity_type, entity_id, metadata)
  values (v_me, 'ORDER_CANCELLED', 'order', p_order_id, '{}'::jsonb);
end;
$$;
grant execute on function cancel_order(uuid) to authenticated;

-- ------------------------------------------------------------
-- Vérification
-- ------------------------------------------------------------
select company_id, score, rating_avg, orders_completed, months_active,
       response_bucket
from company_trust_scores
order by score desc;
