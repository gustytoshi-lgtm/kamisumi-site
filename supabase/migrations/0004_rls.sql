-- 0004_rls.sql
-- Row Level Security ポリシー
-- 方針:
--   * 公開読み取り: products / journal / sourcing / faq は「公開状態のもの」だけ anon が SELECT 可。
--   * 管理テーブル: authenticated かつ user_roles を持つ組織メンバーのみ。
--   * 顧客/注文/問い合わせ/仕入/原価/利益は権限ロール限定。service_role はサーバー専用（RLS バイパス）。
--   * RLS はアプリ側ガード（src/lib/commerce/rbac.ts）と二重で効かせる。

-- ===== ヘルパー =====
create or replace function auth_uid() returns uuid
language sql stable as $$ select auth.uid() $$;

-- 指定組織でいずれかのロールを持つか
create or replace function has_org_role(target_org uuid, roles text[])
returns boolean language sql stable as $$
  select exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid()
      and ur.organization_id = target_org
      and ur.role = any(roles)
  );
$$;

-- 組織メンバー（いずれかのロール）か
create or replace function is_org_member(target_org uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from user_roles ur
    where ur.user_id = auth.uid() and ur.organization_id = target_org
  );
$$;

-- ===== 公開カタログ/コンテンツ: 公開状態のみ anon read =====
alter table products enable row level security;
create policy products_public_read on products for select
  using (deleted_at is null and public_status <> 'coming_soon');
create policy products_admin_all on products for all
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));

alter table product_translations enable row level security;
create policy product_tr_read on product_translations for select using (true);
create policy product_tr_admin on product_translations for all
  using (exists (select 1 from products p where p.id = product_id and is_org_member(p.organization_id)))
  with check (exists (select 1 from products p where p.id = product_id and is_org_member(p.organization_id)));

alter table product_images enable row level security;
create policy product_img_read on product_images for select using (true);
alter table product_image_alt enable row level security;
create policy product_img_alt_read on product_image_alt for select using (true);
alter table product_reference_prices enable row level security;
create policy product_ref_price_read on product_reference_prices for select using (true);
alter table product_matcha_detail enable row level security;
create policy product_matcha_read on product_matcha_detail for select using (true);
alter table product_ceramic_detail enable row level security;
create policy product_ceramic_read on product_ceramic_detail for select using (true);
alter table product_related_products enable row level security;
create policy product_rel_p_read on product_related_products for select using (true);
alter table product_related_journal enable row level security;
create policy product_rel_j_read on product_related_journal for select using (true);

alter table journal_posts enable row level security;
create policy journal_public_read on journal_posts for select
  using (deleted_at is null and status = 'published');
create policy journal_admin_all on journal_posts for all
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));

alter table journal_translations enable row level security;
create policy journal_tr_read on journal_translations for select using (true);
alter table journal_related_products enable row level security;
create policy journal_rel_read on journal_related_products for select using (true);

alter table sourcing_schedules enable row level security;
create policy sourcing_public_read on sourcing_schedules for select
  using (deleted_at is null);
create policy sourcing_admin_all on sourcing_schedules for all
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));
alter table sourcing_schedule_translations enable row level security;
create policy sourcing_tr_read on sourcing_schedule_translations for select using (true);

alter table faqs enable row level security;
create policy faqs_read on faqs for select using (true);
alter table faq_translations enable row level security;
create policy faq_tr_read on faq_translations for select using (true);

-- ===== 組織構造: 読みは公開、変更は owner =====
alter table organizations enable row level security;
create policy org_read on organizations for select using (true);
create policy org_admin on organizations for all
  using (has_org_role(id, array['owner'])) with check (has_org_role(id, array['owner']));

alter table brands enable row level security;
create policy brands_read on brands for select using (true);
create policy brands_admin on brands for all
  using (has_org_role(organization_id, array['owner'])) with check (has_org_role(organization_id, array['owner']));

alter table stores enable row level security;
create policy stores_read on stores for select using (true);
alter table sales_channels enable row level security;
create policy channels_read on sales_channels for select using (true);
alter table warehouses enable row level security;
create policy warehouses_member on warehouses for select using (is_org_member(organization_id));

-- ===== 認証/ロール =====
alter table profiles enable row level security;
create policy profiles_self_read on profiles for select using (id = auth.uid());
create policy profiles_self_update on profiles for update using (id = auth.uid()) with check (id = auth.uid());

alter table user_roles enable row level security;
create policy user_roles_self_read on user_roles for select using (user_id = auth.uid());
create policy user_roles_owner_manage on user_roles for all
  using (has_org_role(organization_id, array['owner']))
  with check (has_org_role(organization_id, array['owner']));

-- ===== 顧客/問い合わせ/注文: 組織メンバー（owner/front_staff 等）=====
alter table customers enable row level security;
create policy customers_member on customers for all
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));
alter table customer_addresses enable row level security;
create policy cust_addr_member on customer_addresses for all
  using (exists (select 1 from customers c where c.id = customer_id and is_org_member(c.organization_id)))
  with check (exists (select 1 from customers c where c.id = customer_id and is_org_member(c.organization_id)));
alter table customer_notes enable row level security;
create policy cust_notes_member on customer_notes for all
  using (exists (select 1 from customers c where c.id = customer_id and is_org_member(c.organization_id)))
  with check (exists (select 1 from customers c where c.id = customer_id and is_org_member(c.organization_id)));

alter table inquiries enable row level security;
-- 公開フォームからの作成は anon でも可（個人情報は payload に限定、閲覧は不可）
create policy inquiries_anon_insert on inquiries for insert with check (true);
create policy inquiries_member_read on inquiries for select using (is_org_member(organization_id));
create policy inquiries_member_update on inquiries for update
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));

alter table provisional_orders enable row level security;
create policy orders_member on provisional_orders for all
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));
alter table provisional_order_items enable row level security;
create policy order_items_member on provisional_order_items for all
  using (exists (select 1 from provisional_orders o where o.id = order_id and is_org_member(o.organization_id)))
  with check (exists (select 1 from provisional_orders o where o.id = order_id and is_org_member(o.organization_id)));
alter table order_status_events enable row level security;
create policy order_events_member on order_status_events for all
  using (exists (select 1 from provisional_orders o where o.id = order_id and is_org_member(o.organization_id)))
  with check (exists (select 1 from provisional_orders o where o.id = order_id and is_org_member(o.organization_id)));

-- ===== 在庫 =====
alter table inventory_items enable row level security;
create policy inventory_member on inventory_items for all
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));
alter table inventory_movements enable row level security;
create policy inventory_mv_member on inventory_movements for all
  using (exists (select 1 from inventory_items i where i.id = inventory_item_id and is_org_member(i.organization_id)))
  with check (exists (select 1 from inventory_items i where i.id = inventory_item_id and is_org_member(i.organization_id)));

-- ===== 買付依頼 =====
alter table sourcing_requests enable row level security;
create policy sourcing_req_anon_insert on sourcing_requests for insert with check (true);
create policy sourcing_req_member on sourcing_requests for select using (is_org_member(organization_id));
create policy sourcing_req_member_update on sourcing_requests for update
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));
alter table sourcing_request_status_events enable row level security;
create policy sourcing_req_events_member on sourcing_request_status_events for all
  using (exists (select 1 from sourcing_requests r where r.id = sourcing_request_id and is_org_member(r.organization_id)))
  with check (exists (select 1 from sourcing_requests r where r.id = sourcing_request_id and is_org_member(r.organization_id)));

-- ===== メディア/設定/監査 =====
alter table media_assets enable row level security;
create policy media_public_read on media_assets for select using (bucket = 'public' or is_org_member(organization_id));
create policy media_member_write on media_assets for all
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));

alter table site_settings enable row level security;
-- 機微設定は owner のみ。非機微は組織メンバー読み取り可。
create policy settings_read on site_settings for select
  using (is_org_member(organization_id) and (is_secret = false or has_org_role(organization_id, array['owner'])));
create policy settings_owner_write on site_settings for all
  using (has_org_role(organization_id, array['owner'])) with check (has_org_role(organization_id, array['owner']));

alter table audit_logs enable row level security;
create policy audit_owner_read on audit_logs for select using (has_org_role(organization_id, array['owner']));
-- 挿入はサーバー（service_role）想定。RLS 経由の挿入は組織メンバーに限定。
create policy audit_member_insert on audit_logs for insert with check (is_org_member(organization_id));

-- ===== 仕入/原価/入金/配送/ロット/個体: 機微（owner / inventory_staff など）=====
-- 原価・利益は owner のみ。inventory_staff は在庫運用の範囲で参照可（cost 値はアプリ側で遮断）。
alter table suppliers enable row level security;
create policy suppliers_owner on suppliers for all
  using (has_org_role(organization_id, array['owner'])) with check (has_org_role(organization_id, array['owner']));
alter table purchases enable row level security;
create policy purchases_owner on purchases for all
  using (has_org_role(organization_id, array['owner'])) with check (has_org_role(organization_id, array['owner']));
alter table purchase_items enable row level security;
create policy purchase_items_owner on purchase_items for all
  using (exists (select 1 from purchases p where p.id = purchase_id and has_org_role(p.organization_id, array['owner'])))
  with check (exists (select 1 from purchases p where p.id = purchase_id and has_org_role(p.organization_id, array['owner'])));
alter table cost_allocations enable row level security;
create policy cost_alloc_owner on cost_allocations for all
  using (exists (select 1 from purchases p where p.id = purchase_id and has_org_role(p.organization_id, array['owner'])))
  with check (exists (select 1 from purchases p where p.id = purchase_id and has_org_role(p.organization_id, array['owner'])));
alter table payments enable row level security;
create policy payments_owner on payments for all
  using (has_org_role(organization_id, array['owner'])) with check (has_org_role(organization_id, array['owner']));
alter table shipments enable row level security;
create policy shipments_member on shipments for all
  using (is_org_member(organization_id)) with check (is_org_member(organization_id));
alter table exchange_rates enable row level security;
create policy exchange_rates_member_read on exchange_rates for select using (auth.uid() is not null);

alter table matcha_lots enable row level security;
create policy matcha_lots_member on matcha_lots for all
  using (exists (select 1 from products p where p.id = product_id and is_org_member(p.organization_id)))
  with check (exists (select 1 from products p where p.id = product_id and is_org_member(p.organization_id)));
alter table ceramic_units enable row level security;
create policy ceramic_units_member on ceramic_units for all
  using (exists (select 1 from products p where p.id = product_id and is_org_member(p.organization_id)))
  with check (exists (select 1 from products p where p.id = product_id and is_org_member(p.organization_id)));
