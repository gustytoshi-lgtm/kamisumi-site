# Supabase / KAGURAKOJI Commerce Core

Phase 2A のデータ基盤。**この時点では Supabase 本番接続は不要**で、公開サイトは `DATA_BACKEND` 未設定（= mock）で動作する。
本番 project が用意できたら以下の手順で適用する。

## 構成

```
supabase/
├ migrations/
│  ├ 0001_core_catalog.sql   組織構造 + 商品カタログ + 公開コンテンツ（journal/sourcing/faq）
│  ├ 0002_operations.sql     profiles/roles, 顧客, 問い合わせ, 仮注文, 在庫, 買付依頼, メディア, 設定, 監査
│  ├ 0003_procurement.sql    仕入/原価/為替/入金/配送/抹茶ロット/陶器個体（Phase 2B）
│  ├ 0004_rls.sql            RLS ポリシー
│  └ 0005_write_support.sql  在庫 reserved/held 列・冪等テーブル・原子的 apply_inventory_movement()
├ seed.sql                   公開可能な開発サンプルのみ
├ ER.md                      ER 図（mermaid）
└ README.md
```

## 設計の要点

- 金額は最小通貨単位の整数（`*_minor`）+ `currency`。浮動小数点で金額計算しない（`src/lib/commerce/money.ts` と対応）。
- 多テナント: organization → brand → store / warehouse / sales_channel を最初から分離。
- 翻訳は `*_translations`（locale 行）に分離。コードへラベル直書きしない方針と一致。
- 共通カラム: `created_at` / `updated_at`（トリガ更新）/ `deleted_at`（論理削除）。
- ステータスは `CHECK (... in (...))` で TS の union（`src/lib/commerce/*`, `src/types/commerce.ts`）と一致させる。
- 公開読み取りは「公開状態のものだけ anon SELECT」。管理/機微テーブルは `user_roles` 付き組織メンバー限定。原価・利益・口座設定は owner 限定（`front_staff` から遮断）。

## ローカル検証（Supabase 不要）

```bash
npm run db:validate   # 連番・括弧/クォート/セミコロンの静的チェック
```

> 完全な SQL 妥当性は実 Postgres が必要（`supabase db lint` / `supabase db reset`）。未実施の旨は KNOWN_ISSUES に記録。

## 本番/開発 project への適用（env が揃ってから）

1. Supabase CLI を導入し `supabase login`。
2. `.env.local` に `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_DB_URL` を設定（`.env.example` 参照）。
3. マイグレーション適用:
   ```bash
   supabase db reset            # ローカル開発DBを作り直し migrations + seed を適用
   # または既存DBへ:
   psql "$SUPABASE_DB_URL" -f supabase/migrations/0001_core_catalog.sql
   psql "$SUPABASE_DB_URL" -f supabase/migrations/0002_operations.sql
   psql "$SUPABASE_DB_URL" -f supabase/migrations/0003_procurement.sql
   psql "$SUPABASE_DB_URL" -f supabase/migrations/0004_rls.sql
   psql "$SUPABASE_DB_URL" -f supabase/seed.sql
   ```
4. Storage バケット作成: `public`（商品/Journal/ブランド画像）, `private`（レシート/仕入証明/顧客関連/内部資料）。
5. アプリ側で `DATA_BACKEND=supabase` を設定し、`src/repositories/supabase/supabaseCommerceRepository.ts` の各メソッドを実装する。

## 書込・トランザクション方針（Phase 2A）

- 書込は `CommerceWriteRepository` 契約経由。mock（`mockCommerceWriteRepository`）と Supabase（`supabaseCommerceWriteRepository`、実装待ち）が同一契約を満たす。
- 業務ルール（RBAC・状態遷移・購入可否）は `src/lib/commerce/commerceService.ts` に集約。repository は永続レベルの不変条件のみ担う。
- **原子性**: 複数テーブル更新（在庫移動・予約・注文状態変更・操作履歴）は DB function / 単一 RPC で1トランザクション実行し、途中状態を残さない。在庫は `apply_inventory_movement()`（0005）を使用。
- **冪等**: `idempotency_keys` で二重実行を防止（在庫二重減算防止）。アプリ層は idempotencyKey を渡す。
- **エラー変換**: Postgres errcode（P0001=業務違反 / P0002=not_found 等）→ `CommerceError(code)` に変換し、UI が i18n マッピング。
- **権限**: service の RBAC と RLS の二重防御。`service_role` key はサーバー専用（ブラウザへ出さない）。
- Supabase 実装後は `tests/writeContract.test.ts` の `runWriteContract` を Supabase 実装に対しても実行し、mock と同一挙動を保証する。

## マイグレーション運用ルール

- 適用済みマイグレーションは書き換えない。修正は新しい番号で追加（0005_...）。
- `.env` / service role key / 顧客情報 / 実口座番号はコミットしない。
- seed には公開可能データのみ。
