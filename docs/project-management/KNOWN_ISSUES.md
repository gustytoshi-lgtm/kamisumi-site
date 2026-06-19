# KNOWN_ISSUES

| ID | 深刻度 | 内容 | 再現方法 | 影響 | 暫定回避 | 恒久案 | 対応Phase | 状態 |
|---|---|---|---|---|---|---|---|---|
| I-001 | Medium | E2E（playwright）が timeout | `npm run test:e2e` | E2E自動検証が回らない | 主要動作は手動 curl/起動で確認済み | **`C:\dev` へ移設済（OneDrive 遅延要因は解消）→ 再実行で評価可**。残るは webServer起動待ち調整 | 2A | 移設で改善・要再評価 |
| I-002 | Medium | migration の実SQL妥当性が未検証 | 実 Postgres なし | スキーマ誤りが本番適用まで発見されない可能性 | `npm run db:validate`(静的) を実施 | Supabase/psql で `db reset`・`db lint` | 2A | Open |
| I-003 | Medium | OneDrive が `.next` をロックし build が EPERM | （旧）OneDrive同期中の `npm run build` | ビルド失敗（断続的） | `.next` 削除→再ビルド | **解消: session 17 で `C:\dev\sites\kamisumi-site` へ移設（OneDrive 配下から除外）** | 全般 | **Resolved**（移設） |
| I-004 | Low | `npm audit` moderate 2件（postcss、Next.js経由） | `npm audit --audit-level=low` | 既知脆弱性。No fix available | `fix --force` は禁止のため未実行 | Next.js 更新時に再監査 | 全般 | Open |
| I-005 | Low | 商品ページの OG画像がプレースホルダSVGのまま | `/[locale]/products/*` の og:image | 商品個別OGがSNSで非表示 | サイト既定OGはPNG化済（`/api/og`） | 実商品写真をPNG/JPGで登録 | 仕上げ | Open |
| I-006 | Low | 320/390px のモバイル実機目視が未記録 | 実機/エミュレータ | 細かな表示崩れの見逃し | globals.css は760px対応済 | 実機確認して記録 | 仕上げ | Open |
| I-007 | Low | OG `og:image:alt` が "KAMISUMI | KAMISUMI" になる箇所 | Home の og meta | 軽微（重複表記） | — | Home の metadata title 重複を調整 | 仕上げ | Open |
| I-008 | Low | 管理画面ページに `<title>`/metadata がない | `/[locale]/admin/*` | タブ表示が空 | — | admin 各ページに generateMetadata 追加 | 2A | **Resolved** (7968245) |
| I-009 | Low | 管理画面が公開レイアウト（Header/Footer）内にネスト | `/[locale]/admin` 表示 | 管理画面に公開ヘッダが出る | flag既定OFFで通常不可視 | route group で専用adminクローム分離（Phase 1 構成は壊さない） | 2A | **Resolved** (route group `(public)`/`(admin)` 分離) |
| I-010 | Low | 公開ページの `notFound()` がソフト404(200)になる場合あり | 一部の動的描画 | SEO上の soft-404 | 商品/記事は dynamicParams=false 済、admin は proxy で真404化済 | Next の挙動。残箇所は個別に routing/proxy で対応 | 仕上げ | Mitigated |
| I-011 | Medium | mock 書込ストアと public read(fixture) が別ストア | mock mode で書込しても公開サイトに反映されない | 開発時の体感差・再起動で消える | UI/ドキュメントに明記（dev-only）。admin は書込ストアを読む | Supabase 化で read/write 統合 | 2A | Open(by design) |
| I-012 | Medium | Supabase 書込/読取 repository の実 DB 検証が未 | `DATA_BACKEND=supabase` で呼出 | 実クエリは実装済みだが実 DB 未接続で未検証 | mock mode で開発継続 | 実装完了（write/read + RPC + エラー変換）。実 DB で contract test（`RUN_SUPABASE_CONTRACT=1`）+ read 一致確認が残（docs/SUPABASE_SETUP.md） | 2A | 実装済・検証待ち |
| I-013 | Low | 管理CRUDは商品ステータス変更のみ接続 | admin の他メニュー | 在庫/注文/買付/Journal は UI 書込未接続（service/テストは有） | service 直叩きは可。同パターンでフォーム追加 | actions.ts + client form を各操作へ拡張 | 2A | **Resolved**（全 CRUD 接続済, session 5） |
| I-014 | Medium | 同一 `main` への並行 worktree コミット（OneDrive 同期） | 並行タスク稼働時 | ref 競合でコミット損失の可能性 | 並行タスクを停止し単一作業者で進める | 1 ブランチ 1 作業者。worktree 作業は別ブランチで | 全般 | **Resolved**（session 8: 並行ライター停止・診断で損失/競合コピーなし確認・単一エージェント方針） |
| I-015 | Low | `matcha_lots` に明示的な on-hand 数量列がない | Phase 2B 抹茶在庫 | ロット別の物理数量を DB から直接取れない | — | quantity 列を追加 | 2B | **Resolved**（migration 0010 で quantity/updated_at/deleted_at 追加, session 14） |
| I-020 | Medium | Phase 2B/顧客基盤の Supabase repo は実装済だが実 DB 未検証 | `DATA_BACKEND=supabase` で呼出 | 実クエリ実装済（matcha/ceramic/expense/media/settings/customer portal）だが実 DB 接続での動作未確認 | mock mode で開発 | 実 DB へ migration 0001-0016 適用 + 各 *.supabase.test.ts contract test で mock と同挙動を確認 | 2B/3 | 実装済・検証待ち |
| I-016 | Low | `shipments` に status 列がない | Phase 2B 配送 | 配送状態を DB に永続化できない（純ロジックは実装済） | 状態機械 shipmentStatus.ts は列なしで検証可 | 配送 repository 実装時に status 列の追加 migration（0008+, PM-023） | 2B | **Resolved**（migration 0008 で status 列 + shipment_status_events 追加） |

| I-017 | Low | 業務設定（§8）管理UIは実装済だが公開サイト未反映 | `/admin/settings` | 設定値は mock/Supabase repository に保存・編集/履歴可だが、公開サイト（site.ts）へは未反映 | mock で編集・確認可 | 設定値を公開サイト読取へ接続 | 2B/運用 | UI/repo実装済・公開反映残 |
| I-018 | Low | 画像管理は mock 実装済・Supabase Storage 連携が残 | `/admin/media` | メタデータ管理は可（mock）。実ファイル保管（Storage）と商品画像への紐付けは未 | mock でメタ管理 | supabaseMediaRepository + Storage(public/private, 署名付きURL) を実装 | 2B/運用 | UI実装済・Storage残 |
| I-020b | Low | Phase 3 は interface+mock のみ（本番決済/送信/自動投稿なし） | cart/checkout/通知/SNS | 本番連携は未（設計上の境界） | mock/sandbox で開発・確認 | 本番契約後に adapter 実装 | 3 | Open(by design) |
| I-021 | Low | 顧客マイページは基盤のみで公開UI未実装 | `/account` 等 | customer_accounts/auth/repo/service はあるが、人間が使う公開画面はまだ無い | mock/service テストで確認 | `/[locale]/account` の公開UIとログイン/住所編集導線を追加 | 3 | Open |
| I-022 | High | `.git` ACL により stage/commit/push ができない | `git add ...` | `fatal: Unable to create 'C:/dev/sites/kamisumi-site/.git/index.lock': Permission denied` でドキュメント更新や実装変更をコミットできない | 作業内容は作業ツリーに保持。Git操作前に状態を再確認 | Deny ACL は現ユーザー `maomao-desk\tkats` ではなく別 SID(`S-1-5-21-...-1010570570`) 対象と判明。session 18 で `git add`/`commit` 成功を確認し 4 コミット作成 | 運用 | **Resolved**（現ユーザーで commit 可能, session 18） |
| I-019 | Low | 在ブラウザのロール切替は未実装（役割別ランチャーで代替） | 管理画面 | ロール変更は .cmd 再起動が必要 | START_KAMISUMI_{OWNER,FRONT_STAFF,INVENTORY}.cmd | 任意で cookie ベースの dev 専用ロール切替（PM-016） | 運用 | Open(by design) |

深刻度: Critical / High / Medium / Low
