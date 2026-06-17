# Phase 2A Implementation Plan

この文書は設計案のみ。Phase 2Aのコード、Supabase接続、本番管理画面、在庫管理、顧客情報保存、決済、Shopify、会計連携はまだ実装しない。

## 目的

- Phase 1のpublic siteを保ちながら、KAGURAKOJI Commerce Coreとして再利用できる管理・データ基盤を追加する。
- KAMISUMI固有の表示、翻訳、ブランド設定を共通コアから分離したまま、商品・在庫・買付・Journalを管理できるようにする。
- 日本語／繁体字の管理UIを用意し、公開画面と同じ翻訳構造を将来共有できるようにする。

## 境界

KAGURAKOJI Commerce Core:

- Supabase schema, migrations, RLS, generated types
- Auth, roles, audit logs
- product / inventory / customer / provisional order / sourcing / journal の共通table
- repository interface と service layer
- admin layout と権限チェック

KAMISUMI固有:

- `siteConfig` の brand/store/channel 設定
- KAMISUMI用の商品カテゴリ表示、Journal分類表示、公開コピー
- KAMISUMIの管理画面初期メニュー、公開/非公開判断、台湾向け配送・問い合わせ文言
- seed data のKAMISUMIサンプル

## Supabase

- `.env.local` に URL と anon key を置く。本番 service role key はサーバー専用に限定する。
- `supabase/migrations` を作成し、DB schemaをSQLで管理する。
- `supabase/seed.sql` または seed script で開発用データを投入する。
- `src/lib/supabase/client.ts` と `src/lib/supabase/server.ts` を分離する。
- Supabase generated types を `src/types/supabase.ts` に出力する。
- Public siteは原則 repository 経由で読む。UIから直接Supabase clientを呼ばない。

## 認証・権限

予定role:

- owner: 全権限、RLS policy管理対象
- admin: 商品、在庫、買付、Journal、顧客、仮注文を管理
- editor: 商品本文、Journal、画像、翻訳を管理
- ops: 在庫、買付、仮注文、配送状態を管理
- viewer: 閲覧のみ

認証方針:

- Supabase Auth を使用。
- admin routeは middleware または server layout でsession確認。
- roleは `profiles` / `user_roles` に保存。
- 操作単位で server action / route handler 側でも権限を再確認する。

## 日本語／繁体字管理画面

- 管理route案: `/[locale]/admin`
- 管理localeは初期状態で `ja`, `zh-tw` のみ表示。
- admin dictionaryを公開dictionaryとは分ける。
- 入力画面では翻訳ペアを同じフォーム内で編集できるようにする。
- 英語はscaffoldとして後続フェーズまで非表示にする。

## 商品管理

管理対象:

- product基本情報: slug, sku, type, category, status, publishedAt
- localized fields: title, shortDescription, description, story
- price / reference price
- image metadata / alt
- brand / maker / region
- matcha detail / ceramic detail
- related products / related journal
- externalProductId / externalVariantId

方針:

- Phase 2Aでは公開用CMSとしての管理を優先する。
- 原価、利益、粗利計算は扱わない。
- ステータス変更は audit log に残す。

## 在庫管理

候補table:

- `inventory_locations`
- `inventory_items`
- `inventory_units`
- `inventory_movements`
- `inventory_reservations`

方針:

- 在庫数、取り置き、入荷予定、手動調整を扱う。
- 在庫移動は増減理由と操作者を記録する。
- 原価・利益計算はPhase 2A対象外。
- 公開画面には数値を直接出さず、公開ステータスへ変換する。

## 顧客管理

候補table:

- `customers`
- `customer_contacts`
- `customer_addresses`
- `customer_notes`

方針:

- 最小限の個人情報だけを保存する。
- RLSで admin / ops 以外の閲覧を制限する。
- データ保持期間、削除依頼、輸出方法を事前に決める。
- Phase 2A実装前にプライバシーポリシーと運用ルールを確定する。

## 仮注文

候補table:

- `provisional_orders`
- `provisional_order_items`
- `order_status_events`

方針:

- 公開フォームまたは管理画面から仮注文を作成。
- 在庫確認、送料確認、正式見積、支払い案内までを状態管理する。
- オンライン決済は実装しない。
- 銀行口座情報はDBや公開画面に入れない。

## 買付管理

候補table:

- `sourcing_requests`
- `sourcing_request_items`
- `sourcing_schedules`
- `sourcing_status_events`

方針:

- 買付予定、受付状態、顧客リクエスト、候補商品、結果メモを管理する。
- 公開画面へ出す内容と内部メモを明確に分ける。
- 仕入先の非公開情報は public repository へ渡さない。

## Journal管理

候補table:

- `journal_posts`
- `journal_translations`
- `journal_related_products`
- `media_assets`

方針:

- 下書き、公開予約、公開済み、非公開を管理する。
- 商品との関連をDB上で管理する。
- Article JSON-LDに必要な公開日、画像、著者情報を保持する。

## 操作履歴

候補table:

- `audit_logs`

記録対象:

- 誰が、いつ、どのtableのどのrecordを変更したか
- 変更前後の差分または要約
- IP / user agent は必要性と法務確認後に扱う

## RLS

基本方針:

- public site用の読み取りviewを分ける。
- admin tableは認証済みかつrole付きユーザーだけ許可する。
- 顧客・仮注文・問い合わせは本人または権限roleのみ閲覧可能にする。
- service roleはserver-onlyに限定する。

初期policy案:

- `products_public`: published商品のみ anonymous read
- `journal_posts_public`: published記事のみ anonymous read
- `sourcing_schedules_public`: 公開予定のみ anonymous read
- `admin_*`: authenticated + role check
- `customers`, `provisional_orders`, `sourcing_requests`: authenticated + role check
- `audit_logs`: owner/admin read, system insert

## Migration

段階案:

1. Supabase project / local dev / env を作成。
2. core schema migrationを追加。
3. RLS policy migrationを追加。
4. seedを追加。
5. generated typesを出力。
6. `SupabaseCommerceRepository` をmock repositoryと同じinterfaceで追加。
7. public siteをfeature flagでmock / Supabase切替可能にする。
8. admin routeを認証付きで追加。

## Seed

seed方針:

- Phase 1 mock dataを元に、公開可能なサンプルだけ投入する。
- 顧客情報、実在の注文、銀行口座、原価、内部仕入先メモはseedしない。
- 日本語・繁体字の翻訳欠落を検出できる最低限のデータを用意する。
- statusごとの動作確認用には架空の商品実績を作らず、明確なfixtureとして分ける。

## Phase 2A開始前に決める事項

- Supabase project名、region、本番/開発分離。
- 管理者roleと初期ユーザー。
- 顧客情報の保存範囲と保持期間。
- 仮注文のステータス名。
- 在庫予約の期限と解放ルール。
- 買付リクエストの受付停止条件。
- 画像アップロード先とファイル命名ルール。
- 正式な法務・プライバシー文言。
- 英語管理画面をPhase 2Aに含めるか。
