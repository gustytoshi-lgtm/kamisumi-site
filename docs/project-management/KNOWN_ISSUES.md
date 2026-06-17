# KNOWN_ISSUES

| ID | 深刻度 | 内容 | 再現方法 | 影響 | 暫定回避 | 恒久案 | 対応Phase | 状態 |
|---|---|---|---|---|---|---|---|---|
| I-001 | Medium | E2E（playwright）が timeout | `npm run test:e2e` | E2E自動検証が回らない | 主要動作は手動 curl/起動で確認済み | OneDrive外の作業コピーでE2E実行 or webServer起動待ち調整。timeoutを極端に伸ばさない | 2A | Open |
| I-002 | Medium | migration の実SQL妥当性が未検証 | 実 Postgres なし | スキーマ誤りが本番適用まで発見されない可能性 | `npm run db:validate`(静的) を実施 | Supabase/psql で `db reset`・`db lint` | 2A | Open |
| I-003 | Medium | OneDrive が `.next` をロックし build が EPERM | OneDrive同期中に `npm run build` | ビルド失敗（断続的） | `.next` 削除→再ビルド | OneDrive 同期から `.next`/`node_modules` を除外（同期設定は勝手に変えない＝人間判断） | 全般 | Mitigated |
| I-004 | Low | `npm audit` moderate 2件（postcss、Next.js経由） | `npm audit --audit-level=low` | 既知脆弱性。No fix available | `fix --force` は禁止のため未実行 | Next.js 更新時に再監査 | 全般 | Open |
| I-005 | Low | 商品ページの OG画像がプレースホルダSVGのまま | `/[locale]/products/*` の og:image | 商品個別OGがSNSで非表示 | サイト既定OGはPNG化済（`/api/og`） | 実商品写真をPNG/JPGで登録 | 仕上げ | Open |
| I-006 | Low | 320/390px のモバイル実機目視が未記録 | 実機/エミュレータ | 細かな表示崩れの見逃し | globals.css は760px対応済 | 実機確認して記録 | 仕上げ | Open |
| I-007 | Low | OG `og:image:alt` が "KAMISUMI | KAMISUMI" になる箇所 | Home の og meta | 軽微（重複表記） | — | Home の metadata title 重複を調整 | 仕上げ | Open |

深刻度: Critical / High / Medium / Low
