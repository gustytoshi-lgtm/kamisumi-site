# Supabase 接続・適用手順（Phase 2A）

実 Supabase project が用意できた段階で、本書の順に作業すると公開サイト（mock）から
Supabase バックエンドへ切り替えられる。**秘密情報・実キー・実口座・顧客実データはコミットしない。**

> 本書のコマンド中の `<...>` は人間が実値に置き換える。値は `.env.local`（gitignore 済み）にのみ置く。

## 検証状況（2026-06-22 / session 31）

開発用 Supabase project（PostgreSQL 17.6）で実接続検証を実施:

- ✅ migration 0001-0017 + seed を適用成功（54 テーブル生成）。**I-002 解決**。
  - supabase CLI / psql が無い環境向けに **`scripts/apply-migrations.mjs`**（Node + `pg`、`SUPABASE_DB_URL` 接続）を追加。
    `node --env-file=.env.local scripts/apply-migrations.mjs --check`（接続のみ）/ `--seed`（適用+seed）。
- ✅ contract test が実 DB で全 pass（session 33: write/procurement/fulfillment 含む 13 file / 50 test。I-024 解決）。
- ✅ RLS 実 DB 検証 5/5 pass（session 34, `scripts/verify-rls.mjs`）: anon/front_staff は expenses（原価=機微）0 件、owner は可、anon は公開 products 可。
- 🐛 **実 DB で発見・修正（重要）**: RLS ヘルパー（has_org_role/is_org_member/is_customer_self）が security definer でなく無限再帰 42P17 → member/owner 系テーブルが authenticated から 500。migration **0018** で security definer 化（I-025）。
- 🐛 **実 DB で発見・修正**: `supabaseSettingsRepository` が org に slug `org-kagurakoji` を使い uuid 型で失敗 → `organizations.code` から実 UUID を解決する方式へ修正（`siteConfig.organization.code` 追加）。
- ⚠️ 未検証: write / procurement / fulfillment の contract runner はダミー非UUID ID を使うため実 DB では失敗（**I-024**。repo 実装の問題ではない）。services の org slug フォールバックも要修正（**I-023**）。

### contract test 用 fixture（実 DB に投入する SQL）

`*.supabase.test.ts` は seed 固定 UUID と以下の actor/customer を前提とする。`SUPABASE_DB_URL` 接続で投入:

```sql
-- owner actor（SUPABASE_CONTRACT_ACTOR_ID）
insert into profiles (id, display_name, admin_locale)
  values ('11111111-1111-1111-1111-111111111111','Contract Owner','ja') on conflict (id) do nothing;
insert into user_roles (user_id, organization_id, role)
  values ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-0000000000a1','owner') on conflict do nothing;

-- customer（SUPABASE_CUSTOMER_CONTRACT_USER_ID）
insert into profiles (id, display_name)
  values ('22222222-2222-2222-2222-222222222222','Contract Customer') on conflict (id) do nothing;
insert into customers (id, organization_id, name, email)
  values ('33333333-3333-3333-3333-333333333333','00000000-0000-0000-0000-0000000000a1','Contract Customer','customer@contract.test') on conflict (id) do nothing;
insert into customer_accounts (user_id, organization_id, customer_id)
  values ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-0000000000a1','33333333-3333-3333-3333-333333333333') on conflict (user_id) do nothing;
```

---

## 0. 前提

- Node / npm 導入済み（このリポジトリで `npm install` 済み）
- Supabase CLI（`npm i -g supabase` もしくは scoop/brew）
- `psql`（PostgreSQL クライアント。migration を psql で流す場合）

---

## 1. 環境変数一覧

`.env.example` をテンプレートに `.env.local` を作成する。

| 変数 | 公開/秘密 | 用途 | 例/既定 |
|---|---|---|---|
| `DATA_BACKEND` | 設定値 | `mock`（既定）/ `supabase` 切替 | `mock` |
| `NEXT_PUBLIC_SUPABASE_URL` | 公開（ブラウザ可） | project URL | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 公開（ブラウザ可） | anon key。RLS 前提の読取・認証 | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | **秘密・サーバー専用** | RLS バイパス。write repo / 管理操作 | `eyJ...` |
| `SUPABASE_DB_URL` | **秘密** | migration/psql 用接続文字列 | `postgresql://postgres:<pw>@<host>:5432/postgres` |
| `SUPABASE_CONTRACT_ACTOR_ID` | **秘密扱い** | 実 DB 契約テストで `profiles.id` / FK を満たすテスト操作者 UUID | `<owner-uid>` |
| `SUPABASE_CUSTOMER_CONTRACT_USER_ID` | **秘密扱い** | 顧客マイページ契約テスト用。`customer_accounts` にリンク済みの `profiles.id` | `<customer-uid>` |
| `ADMIN_ENABLED` | 設定値 | 管理画面有効化（既定 OFF=`/admin` は 404） | `true` で有効 |
| `ADMIN_DEV_ROLE` | 設定値（dev のみ） | mock 認証ロール。Supabase Auth 導入後は不要 | `owner` 等 |
| `NEXT_PUBLIC_SITE_URL` | 公開 | プレビュー等で siteUrl 上書き | 任意 |
| `HOLD_DEFAULT_HOURS` | 設定値 | 取り置き既定時間 | `48` |

> `anon` と `service_role` の key は Supabase ダッシュボード → Project Settings → API で取得。
> `service_role` は RLS を無視できるため、**絶対にブラウザ／クライアントバンドルへ出さない**
> （コードでは `src/lib/supabase/server.ts` の `"server-only"` で強制）。

---

## 2. Supabase project 作成

1. https://supabase.com でプロジェクト作成（region は台湾向けなら `Southeast Asia (Singapore)` 等を検討）。
2. Project Settings → API から URL / anon key / service_role key を取得し `.env.local` に記入。
3. Project Settings → Database から接続文字列を取得し `SUPABASE_DB_URL` に記入。
4. 開発用と本番用は別 project にする（本番データを開発で触らない）。

---

## 3. migration 0001〜0017 の適用

### 3-A. Supabase CLI（ローカル開発 DB を作り直す場合）

```bash
supabase login
supabase link --project-ref <project-ref>
supabase db reset    # migrations/*.sql を番号順に適用し、続けて seed.sql を流す
```

### 3-B. psql（既存 DB へ手動適用）

```bash
psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_core_catalog.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0002_operations.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0003_procurement.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0004_rls.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0005_write_support.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0006_order_notes.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0007_supplier_details.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0008_shipment_status.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0009_payment_details.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0010_matcha_lot_quantity.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0011_ceramic_unit_lifecycle.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0012_expenses.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0013_accounting_exports.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0014_media_assets_meta.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0015_settings_history.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0016_customer_accounts.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0017_checkout_orders.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0018_rls_security_definer.sql
psql "$SUPABASE_DB_URL" -f supabase/migrations/0019_matcha_adjust_quantity_fn.sql
```

適用前に静的検証:

```bash
npm run db:validate         # 連番・括弧/クォートの静的チェック（実 DB 不要）
```

適用後に SQL 妥当性を確認（I-002 のクローズ条件）:

```bash
supabase db lint            # もしくは psql で各テーブル/関数の存在確認
```

> 適用済み migration は書き換えない。修正は新番号（0016_…）で追加する。

---

## 4. seed 投入

`supabase db reset` を使った場合は seed も自動適用される。psql で個別適用する場合:

```bash
psql "$SUPABASE_DB_URL" -f supabase/seed.sql
```

seed は**公開可能なサンプルのみ**（org/brand/store/warehouse/channel と代表商品など）。
顧客実データ・実注文・銀行口座・原価・内部仕入先メモは入れない。

主要な固定 UUID（seed 内）:

- organization `KAGURAKOJI` = `00000000-0000-0000-0000-0000000000a1`
- brand `KAMISUMI` = `00000000-0000-0000-0000-0000000000b1`

---

## 5. 初期 owner ユーザー作成

Supabase Auth にユーザーを作り、`profiles` と `user_roles` を紐づける。

### 5-1. Auth ユーザー作成

ダッシュボード → Authentication → Users → Add user（email + password）。
作成後の user の UUID（= `auth.users.id`）を控える（以下 `<owner-uid>`）。

### 5-2. profiles 行作成

```sql
insert into profiles (id, display_name, admin_locale)
values ('<owner-uid>', 'Owner', 'ja')
on conflict (id) do nothing;
```

### 5-3. user_roles 付与（owner）

```sql
insert into user_roles (user_id, organization_id, role)
values ('<owner-uid>', '00000000-0000-0000-0000-0000000000a1', 'owner')
on conflict do nothing;
```

> `user_roles.role` の許可値は `owner` / `front_staff` / `inventory_staff` / `editor`
> （TS の `src/lib/commerce/rbac.ts` と一致。CHECK 制約で強制）。
> RLS のメンバー判定は `is_org_member(org)` / `has_org_role(org, roles[])`（0004）で
> `auth.uid()` と `user_roles` を突き合わせる。

---

## 6. 他ロールの追加（任意）

front_staff（接客担当・原価/利益/口座/全顧客CSV を見せない想定）:

```sql
-- 先に Auth ユーザー + profiles を作成してから
insert into user_roles (user_id, organization_id, role)
values ('<front-staff-uid>', '00000000-0000-0000-0000-0000000000a1', 'front_staff')
on conflict do nothing;
```

`inventory_staff` / `editor` も同様（role を置換）。

---

## 7. Storage バケット設定

ダッシュボード → Storage → Create bucket。

| bucket | 公開設定 | 用途 |
|---|---|---|
| `public` | Public | 商品 / Journal / ブランド画像（公開表示用） |
| `private` | Private | レシート / 仕入証明 / 顧客関連 / 内部資料 |

`private` は RLS/policy で組織メンバー（`is_org_member`）に限定する。公開画像のみ `public`。

> バケット作成と公開URL/署名URL/アクセス制御の検証は `node --env-file=.env.local scripts/verify-storage.mjs`
> で一括実施できる（service role で public/private を作成し upload→URL→fetch を確認。session 38 で 5/5 pass）。
> アプリ側は `getMediaStorage()` / `mediaService.uploadMedia` / `mediaService.getMediaUrl` を使う。

---

## 8. RLS 検証

owner と front_staff で「見えてはいけないものが見えないこと」を確認する。

1. ダッシュボードの SQL Editor で `set role` ではなく、各ユーザーの JWT で API 経由（anon key + ログイン）を使う。
2. 確認観点:
   - 公開テーブル: 未ログイン（anon）で published 商品/journal のみ SELECT 可。
   - 管理テーブル: ログイン済み組織メンバーのみ。非メンバーは 0 行。
   - 機微（cost/profit/口座/全顧客）: owner のみ。front_staff から遮断。
3. アプリ層の二重防御（`src/lib/commerce/rbac.ts` の `SENSITIVE_PERMISSIONS`）と整合することを確認。

> 詳細な期待値はテスト（`tests/rbac.test.ts`）と `0004_rls.sql` のポリシーコメント参照。

---

## 9. アプリ切替と repository contract test

### 9-1. 切替

`.env.local` に設定:

```
DATA_BACKEND=supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

未設定で `DATA_BACKEND=supabase` にすると factory が明示エラーを投げる（誤設定検知。`src/repositories/index.ts`）。

### 9-2. repository contract test（mock と同一挙動の保証）

mock 用の契約テストは常時実行される:

```bash
npm run test                 # tests/writeContract.test.ts の runWriteContract("mock", …) を含む
```

Supabase 実装に対して同じ契約を流すテストは、**実 DB が必要なため既定では skip**
（`tests/*.supabase.test.ts`、`RUN_SUPABASE_CONTRACT=1` と必要 env が無ければ describe.skip）。
実 DB 接続後に実行:

```bash
# .env.local に Supabase env を設定したうえで（開発 project 推奨。seed をリセットする）
set RUN_SUPABASE_CONTRACT=1
set SUPABASE_CONTRACT_ACTOR_ID=<owner-uid>
set SUPABASE_CUSTOMER_CONTRACT_USER_ID=<customer-uid>
npm run test -- *.supabase
```

追加済みの実 DB 契約テスト:

- `writeContract.supabase.test.ts`（商品/在庫/注文/買付/Journal 書込）
- `procurementContract.supabase.test.ts`（仕入先/仕入/原価配賦）
- `fulfillmentContract.supabase.test.ts`（配送）
- `matchaLotContract.supabase.test.ts`（抹茶ロット）
- `ceramicUnitContract.supabase.test.ts`（陶器個体）
- `expenseContract.supabase.test.ts`（経費）
- `mediaContract.supabase.test.ts`（メディアメタデータ。Storage upload は対象外）
- `settingsContract.supabase.test.ts`（業務設定/履歴）
- `customerPortalContract.supabase.test.ts`（顧客マイページ。`customer_accounts` へリンク済み customer が必要）
- `manualTransferOrderContract.supabase.test.ts`（カート注文台帳。0017 + seed の固定 org が必要。`RUN_SUPABASE_CONTRACT=1` + Supabase env のみで実行可。owner 操作の role は ActorContext で渡すため customer fixture は不要）

> Supabase 契約テストは破壊的（テストデータを作る）。**本番 project では実行しない**。
> 専用の test schema / 開発 project を使うこと。

---

## 10. Phase 2A 完了チェックリスト（実 DB で確認）

すべて実 DB で確認できるまで Phase 2A 完了扱いにせず、タグ `v0.2.0-phase2a` も付けない。

- [ ] migration 0001-0016 適用（`supabase db lint` パス, I-002 クローズ）
- [ ] Supabase Auth ログイン → `getAdminSession()` が session+user_roles を返す
- [ ] owner / front_staff の認可差（機微の遮断）
- [ ] RLS（anon 公開のみ / メンバー限定 / owner 限定）
- [ ] Supabase repository contract test パス（mock と同一挙動）
- [ ] 商品 CRUD（作成/編集/翻訳/状態/論理削除/復元）
- [ ] 在庫移動（apply_inventory_movement 経由・冪等・非負）
- [ ] 注文状態変更（イベント記録）
- [ ] 買付 CRUD
- [ ] Journal CRUD（翻訳含む）
- [ ] 操作履歴（audit_logs）
- [ ] Phase 2B repository 契約（仕入/配送/入金/抹茶/陶器/経費/メディア/設定）
- [ ] 顧客マイページ repository 契約（`customer_accounts` 本人リンク / RLS）
- [ ] typecheck / lint / test / build / db:validate すべてパス
