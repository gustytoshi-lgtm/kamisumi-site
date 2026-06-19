# DECISIONS

設計判断の記録。ルートの `DECISIONS.md`（D-001〜D-008, Phase 1）も有効。本ファイルは Phase 2A 以降を扱う。

| ID | 日付 | 内容 | 背景 / 理由 | 却下案 | 見直し条件 | 影響範囲 |
|---|---|---|---|---|---|---|
| PM-030 | 2026-06-19 | 正式作業パスを OneDrive 外 `C:\dev\sites\kamisumi-site` へ移設 | OneDrive 同期競合/ロックで build EPERM・大量削除確認が頻発（I-003）。`.next`/`node_modules` の同期が根因 | OneDrive 内で同期除外設定 | 別環境へ移す場合は本表と CURRENT_STATE/HANDOFF のパスを更新 | 全体（旧 OneDrive コピーは参照・編集しない） |
| PM-031 | 2026-06-19 | 実 Supabase 契約テストは `RUN_SUPABASE_CONTRACT=1` と `SUPABASE_CONTRACT_ACTOR_ID` が揃う時だけ実行 | 実 DB テストは破壊的で、`created_by/uploaded_by/changed_by` の FK に実 `profiles.id` が必要。既定 skip で mock 開発を止めない | env があれば常時実行 / 固定ダミー user id を seed へ入れる | 専用 test project/seed が確立したら自動化を再検討 | tests/*.supabase.test.ts, docs/SUPABASE_SETUP.md |
| PM-032 | 2026-06-19 | 顧客マイページは `customer_accounts` で Supabase Auth ユーザーと `customers` をリンクし、本人データだけを RLS で開く | `customers` は管理者向け顧客台帳でもあるため、Auth ユーザーを直接混ぜると全顧客/内部メモ露出の境界が曖昧になる | customers に user_id を直接追加 / 顧客本人にも管理 repo を使わせる | 本番会員要件・退会/データ削除ポリシー確定時 | 0016_customer_accounts, customerPortalRepository, customer auth |
| PM-001 | 2026-06-18 | データバックエンドを `DATA_BACKEND`(mock/supabase) で切替、既定 mock | 公開サイトを壊さず Supabase を段階導入。env 未設定なら Phase 1 と同一挙動 | 即 Supabase 化（本番情報なし） | Supabase 本番 project 確定時 | `src/config/dataBackend.ts`, `src/repositories/index.ts` |
| PM-002 | 2026-06-18 | 金額は最小通貨単位の整数 + currency。`src/lib/commerce/money.ts` 経由で計算 | 浮動小数点誤差の排除（§8 必須） | number で直接計算 | — | 全金額処理、DB `*_minor` 列 |
| PM-003 | 2026-06-18 | ステータスは TS union と DB `CHECK(... in ...)` で二重定義し一致させる | enum 移行の手間回避と型安全の両立 | PG enum 型 | 状態追加が頻繁なら enum 検討 | `orderStatus`/`inventoryStatus`/migrations |
| PM-004 | 2026-06-18 | RBAC を単一マトリクス（`rbac.ts`）で定義し、アプリ側ガードと RLS の二重防御 | front_staff から原価/利益/口座/権限/全顧客CSV を確実に遮断 | RLS のみ | ロール追加時 | `rbac.ts`, `adminNav.ts`, RLS 0004 |
| PM-005 | 2026-06-18 | 翻訳は `*_translations`（locale 行）に分離、コードへラベル直書きしない | 公開/管理とも i18n 一貫。将来翻訳追加に強い | jsonb 1列に全locale | — | migrations, `dictionaries/admin/*` |
| PM-006 | 2026-06-18 | OG 既定画像を `next/og` の動的PNG（`/api/og`）にし、`/api` 配下に置く | SVG はSNS非対応。`/og` は proxy が locale リダイレクトするため `/api` 除外を利用 | 静的PNGコミット / `/og` | 実ブランド画像確定時に差し替え | `src/app/api/og/route.tsx`, `seo.ts` |
| PM-007 | 2026-06-18 | 管理画面UI・実Supabaseクエリ・Auth ランタイムは本セッションで未実装とし、型/スキーマ/権限/i18n を先行 | 半完成UIで公開サイトを壊すリスク回避（§17 非該当のため mock/flag で吸収し継続） | 管理画面まで一気に実装 | 次セッションで実装 | 管理画面全般 |
| PM-008 | 2026-06-18 | プロジェクト管理文書を `docs/project-management/` に集約（正規） | spec の参照順に合わせ、Codex 引き継ぎを明確化 | ルート直下のみ | — | docs 構成 |
| PM-009 | 2026-06-18 | `@supabase/supabase-js` は本セッションで未導入 | 本番情報なしで依存追加・lock 変更を避け、adapter スタブで契約のみ確定 | 先に依存追加 | Supabase 実装着手時に追加 | 依存関係 |
| PM-010 | 2026-06-18 | 注文「再開」は cancelled→inquiry_received の限定遷移のみ許可 | orderStatus の前進機械は un-cancel を許さないため、再開は専用の限定操作として扱う | 任意状態へ戻す | 運用要件が出たら再検討 | commerceService.reopenOrder |
| PM-011 | 2026-06-18 | 書込は「service層=業務ルール / repository=永続不変条件」に分離 | 同じ業務ルールを mock/Supabase で再実装しないため。repository は契約として差し替え可能 | repository に業務ルールを埋める | — | commerceService / writeRepository |
| PM-012 | 2026-06-18 | 複数テーブル更新は DB function/RPC で原子実行 + idempotencyKey で冪等 | 在庫移動/予約/注文状態/監査の途中状態を残さない。二重実行で二重減算しない | アプリ側で逐次更新 | — | apply_inventory_movement(0005), 在庫サービス |
| PM-013 | 2026-06-18 | mock 書込は in-memory store（fixture 非破壊、reset/seed）。public read(fixture) とは別ストア | 開発・テスト用。source を書き換えない。Supabase 化で read/write 統合 | fixture を直接書換 / ファイル永続化 | Supabase 実装時に統合 | mockCommerceWriteRepository。**注意: 開発サーバー再起動で消える**（本番DB代替ではない） |
| PM-014 | 2026-06-18 | `cross-env` を devDependency に導入 | Windows/macOS/Linux で npm scripts の環境変数（ADMIN_ENABLED 等）を同一記法で設定するため | 各 OS で別記法 / .cmd のみ | 不要になれば削除 | package.json dev:* scripts |
| PM-015 | 2026-06-18 | 開発専用機能は `isDevToolsEnabled()`（非本番 かつ ADMIN 有効 かつ mock）で一元ガード | dev-check / 開発バー / mock reset / ロール確認 を本番で絶対に出さない（§14）。本番設定不足時に mock へ fallback しない | 各所で個別 if | — | devtools.ts, dev-check, /api/dev/*, DevModeBar |
| PM-016 | 2026-06-18 | 非技術者向け運用は「役割別 .cmd ランチャー + dev-check + verify スモーク」で提供 | PowerShell 入力なしで起動/確認/初期化。ロール切替は安全のため在ブラウザではなく役割別起動で実現（§6 の代替を採用） | 在ブラウザのロール切替（session 上書き） | 必要なら後で cookie ベース切替を追加 | START_*.cmd, scripts/*, dev-check |
| PM-017 | 2026-06-18 | サーバー停止は PID ファイル(.dev-server.pid)記録分のみ。ポート占有プロセスの無差別 kill をしない | 無関係プロセスを誤って終了しない安全策（要件明記） | ポートの占有者を kill | — | scripts/launch.mjs, stop.mjs |
| PM-018 | 2026-06-19 | 管理フォームは汎用 `AdminActionForm`（フィールド定義駆動）に統一 | スライスごとの client form 重複を排除し、確認/i18n通知/useActionState を共通化 | 画面ごとに個別フォーム | — | components/admin/AdminActionForm.tsx, 各管理画面 |
| PM-019 | 2026-06-19 | 編集可能設定はホワイトリスト（EDITABLE_SETTINGS）方式 | API鍵/service role/口座/RLS/migration を構造的に編集不可にする（§14）。サービスがリスト外キーを forbidden | 全キー編集可+個別禁止リスト | 設定追加時に定義を足す | settingsModels.ts, settingsService.ts |
| PM-020 | 2026-06-19 | 金額入力は UI で主要単位→service へ渡す前に最小通貨単位の整数へ変換 | 人間が「980.50」等で入力でき、内部は整数最小単位（PM-002）を維持 | UI で最小単位を直接入力 | — | payments/shipping actions, currencyMinorUnits |
| PM-022 | 2026-06-19 | 陶器個体の原価(cost)は service が cost:view 保持者にのみ返す（stripCost 投影）| front_staff/inventory に原価を出さない（§14）。read 自体は inventory:view_public で可 | cost を全ロールに返す | — | ceramicUnitService, ceramicUnitModels.stripCost |
| PM-023 | 2026-06-19 | 経費・利益分析は owner 限定（purchase:manage / profit:view）| 原価・採算の機微情報。expenses は RLS も owner | 全管理者に開放 | — | expenseService, profit ページ, RLS 0012 |
| PM-025 | 2026-06-19 | Phase 3 は interface+mock+adapter のみ。本番決済/送信/自動投稿はしない | 本番契約・実APIなしで安全に基盤を用意（§9・spec）。stripe/paypal/tw_provider/email は sandbox スケルトン | 本番連携を仮実装 | 本番契約後に adapter 実装 | cart/checkout/notifications/snsDraft |
| PM-026 | 2026-06-19 | メディア: private bucket（レシート/顧客/内部資料）は secrets:view=owner 限定。MIME/サイズ/寸法検証 + パス正規化でトラバーサル防止 | 内部資料を公開バケットへ出さない（§9）。public 画像は media:manage(editor可) | 全メディアを media:manage に開放 | Supabase Storage 実装時も維持 | mediaService, mediaModels |
| PM-027 | 2026-06-19 | SNS 下書きは承認状態のみ持ち、自動公開経路を作らない。生成は提供フィールドのみ（誇大表現なし） | 自動投稿事故・虚偽表現を防ぐ（人間承認フロー必須） | approved で自動投稿 | 本番SNS API adapter は将来・人間操作前提 | snsDraft, snsDraftService |
| PM-028 | 2026-06-19 | Supabase matcha_lots は org 列が無く products 埋め込み結合で organizationId 取得。adjustQuantity は read-modify-write+非負ガード（非原子） | matcha_lots(0001) に org 列が無い。原子性は単独操作前提で許容 | org 列追加 migration / 全件 DB function 化 | 高頻度競合が出れば apply_inventory_movement 同様の RPC 化 | supabaseMatchaLotRepository |
| PM-029 | 2026-06-19 | Supabase settings は site_settings.value(jsonb) に文字列保持、履歴は setting_history(0015) | 既存 site_settings を現在値に流用。履歴は別表で監査可能に | value を text 列に変更 | — | supabaseSettingsRepository, 0015 |
| PM-024 | 2026-06-19 | 利益分析は記録済みデータ（入金/仕入/配送/経費）からの概算。為替差損益・注文単位の厳密原価対応は未連携 | 実在しない厳密な財務対応を捏造しない。UI に概算である旨を明記 | 厳密な原価対応を仮実装 | 注文⇔仕入⇔入金の関連付けを将来実装 | profitAnalysis.ts, /admin/profit |
| PM-021 | 2026-06-19 | mock 管理 UI 言語は `ADMIN_DEV_LOCALE`(ja/zh-tw) で切替（dev専用） | 管理言語は本来 profiles.admin_locale。mock 固定 ja だと繁體中文 UI を人間確認できないため | URL locale を admin 言語に流用 | Supabase Auth では profiles.admin_locale | lib/admin/auth.ts（mock 分岐のみ）, .env.example |
| PM-014 | 2026-06-18 | `@supabase/ssr` 導入し Cookie ベース SSR セッション構成（client/server/middleware）。クライアントは関数内遅延生成 | 公式推奨の RSC/Server Action セッション。module-load で生成しない＝env 未設定でも起動可（PM-009 を更新） | `@supabase/supabase-js` のみで自前 Cookie 処理 | — | `src/lib/supabase/*`, `proxy.ts` |
| PM-015 | 2026-06-18 | Supabase read/write repository を実クエリで実装。実 DB 検証は `RUN_SUPABASE_CONTRACT=1`+env で skip 制御 | §4「実 Supabase がなくても止まらない」。コードは完成させ、実 DB 必須テストのみ skip | スタブのまま据え置き | 実 project 接続時に contract test 実行 | `repositories/supabase/*`, `tests/writeContract.supabase.test.ts` |
| PM-016 | 2026-06-18 | `getAdminSession` を `ADMIN_AUTH_MODE`(mock/supabase) で切替。未指定は `DATA_BACKEND` 追従。supabase は self-read RLS で `user_roles`/`profiles` 取得 | mock 開発を壊さず Supabase Auth を後付け。呼出側契約不変（async 化のみ） | 認証を常に Supabase 必須化 / 別フラグ無し | 本番認証要件が固まったら | `src/lib/admin/auth.ts` と全 admin 呼出 |
| PM-017 | 2026-06-18 | vitest で `server-only` を no-op スタブに alias | Step B が server.ts 経由で `server-only` を間接導入し jsdom で解決不可。サーバー境界の意味は本番ビルドで担保 | 各 repo を動的 import に全面改修 | — | `vitest.config.ts`, `tests/stubs/server-only.ts` |
| PM-018 | 2026-06-18 | 並行エージェントの Step B（repository）と本セッションの Step C（認証）を双方採用し、以後**単一エージェント**で作業 | 両者はファイル完全分離・衝突なし。診断でコミット損失/競合コピーなしを確認（I-014 Resolved） | 一方を破棄して再実装（無駄） | — | 全 Phase 2A コード、運用方針 |
| PM-019 | 2026-06-18 | 注文メモは provisional_orders に列追加（migration 0006）。別テーブル化しない | 1:1 の単純メモ。注文行と同じ RLS/論理削除に自然に追従。監査は audit_logs | customer_notes 別テーブル | 履歴要件が出れば別テーブル化 | 0006, order write repo |
| PM-020 | 2026-06-18 | 原価配賦 method はドメインで `purchase_value`、DB は `amount`。`to/fromDbMethod` で橋渡し | spec §3.D の語彙と既存 DB enum(0003) の差を、適用済み migration を書き換えずに吸収 | 0003 を書き換え / 名称を統一 | 次の schema 改訂時に統一検討 | costAllocation.ts, cost_allocations |
| PM-021 | 2026-06-18 | 抹茶ロットの FIFO/賞味期限は純ロジック（DB非依存）。on-hand 数量はドメイン入力で受ける | 物理数量は inventory_items が持つ。ロット順序/警告のみを純関数化しテスト容易に | matcha_lots に数量列を即追加 | I-015 で供給経路を確定 | matchaLot.ts |
| PM-022 | 2026-06-18 | 入金状態の値は DB enum(0003)準拠（unbilled/billed/...）。spec の not_requested/requested は unbilled/billed に対応 | 適用済み 0003 の CHECK を書き換えないため。永続値と一致 | 0003 を書き換えて改名 | 次の schema 改訂で統一検討 | paymentStatus.ts, payments.status |
| PM-023 | 2026-06-18 | 配送状態は純ロジックで先行。`shipments` の status 列は永続化時に追加 migration（0008+） | 0003 に status 列がない。状態機械の検証は列なしでも可能。永続化は後続で安全に追加 | 即 status 列追加 | 配送 repository 実装時（I-016） | shipmentStatus.ts |
| PM-024 | 2026-06-18 | 利益率は整数ベーシスポイント（bp）で決定的丸め。金額は整数最小単位のみ | 「金額に float を使わない」を維持しつつ比率を表現。Math.round で決定的 | float の比率を保持 | — | profit.ts |
| PM-025 | 2026-06-18 | 会計連携は export **interface + 冪等 mock** のみ。法定会計/税務帳簿は自作しない | spec §4 の境界。外部会計ソフトの責務を侵さない。二重計上を idempotencyKey で防止 | 自前で総勘定元帳/申告を実装 | 本番会計ソフト選定時に adapter 追加 | accountingExport.ts |
| PM-026 | 2026-06-18 | 調達ドメインは別 repository/service（ProcurementRepository）に分離 | 仕入/原価は機微・bounded context。CommerceWriteRepository を肥大化させない | CommerceWriteRepository へ追加 | — | repositories/*procurement*, procurementService |
| PM-027 | 2026-06-18 | 配送=FulfillmentRepository（member, order:update_status）/ 入金=PaymentRepository（owner, purchase:manage）を別 repository に分離 | 物流（member RLS）と finance（owner RLS）で責務・権限が異なる。巨大 repo を避ける | 1 つの fulfillment repo に統合 | — | fulfillment*/payment* repo+service |
| PM-028 | 2026-06-18 | 付帯費用の再配賦は purchase 単位で既存 cost_allocations を全置換 | 二重計上を防ぎ再計算を冪等に。method 変更も同経路 | 差分更新 | 配賦履歴が必要なら別テーブル | allocatePurchaseCosts (mock/supabase) |
