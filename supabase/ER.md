# ER 図 — KAGURAKOJI Commerce Core

主要エンティティと関係（mermaid）。詳細カラムは `migrations/*.sql` を正とする。

## 組織構造・カタログ・公開コンテンツ（0001）

```mermaid
erDiagram
  organizations ||--o{ brands : has
  organizations ||--o{ business_units : has
  organizations ||--o{ warehouses : has
  brands ||--o{ stores : has
  stores ||--o{ sales_channels : has
  organizations ||--o{ products : scopes
  brands ||--o{ products : owns
  stores ||--o{ products : sells
  products ||--o{ product_translations : localized
  products ||--o{ product_images : has
  product_images ||--o{ product_image_alt : localized
  products ||--o{ product_reference_prices : has
  products ||--o| product_matcha_detail : detail
  products ||--o| product_ceramic_detail : detail
  brands ||--o{ journal_posts : publishes
  journal_posts ||--o{ journal_translations : localized
  brands ||--o{ sourcing_schedules : plans
  sourcing_schedules ||--o{ sourcing_schedule_translations : localized
  brands ||--o{ faqs : has
  faqs ||--o{ faq_translations : localized
```

## 運用（0002）

```mermaid
erDiagram
  profiles ||--o{ user_roles : has
  organizations ||--o{ user_roles : scopes
  organizations ||--o{ customers : has
  customers ||--o{ customer_addresses : has
  customers ||--o{ customer_notes : has
  organizations ||--o{ inquiries : receives
  organizations ||--o{ provisional_orders : has
  customers ||--o{ provisional_orders : places
  provisional_orders ||--o{ provisional_order_items : contains
  provisional_orders ||--o{ order_status_events : logs
  organizations ||--o{ inventory_items : has
  products ||--o{ inventory_items : stocked_as
  inventory_items ||--o{ inventory_movements : logs
  organizations ||--o{ sourcing_requests : receives
  sourcing_requests ||--o{ sourcing_request_status_events : logs
  organizations ||--o{ media_assets : owns
  organizations ||--o{ site_settings : has
  organizations ||--o{ audit_logs : records
```

## 仕入・原価・入金・配送・ロット・個体（0003 / Phase 2B）

```mermaid
erDiagram
  organizations ||--o{ suppliers : has
  suppliers ||--o{ purchases : supplies
  purchases ||--o{ purchase_items : contains
  purchases ||--o{ cost_allocations : allocates
  purchase_items ||--o{ cost_allocations : allocated_to
  products ||--o{ matcha_lots : lots
  products ||--o{ ceramic_units : units
  provisional_orders ||--o{ payments : settled_by
  provisional_orders ||--o{ shipments : shipped_by
  media_assets ||--o{ purchases : receipt
  media_assets ||--o{ ceramic_units : image
```

## 凡例

- すべての主要テーブルは `organization_id` で多テナント境界を持つ（一部は親経由）。
- 金額は `*_minor`(bigint) + `currency`(char3)。
- `*_translations` は `(parent_id, locale)` 複合主キー。
- 機微（原価/利益/口座/顧客全件）は RLS（0004）で owner 限定。
