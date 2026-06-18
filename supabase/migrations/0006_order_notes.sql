-- 0006_order_notes.sql
-- 仮注文（provisional_orders）の顧客向けメモ / 内部メモを恒久化する。
-- これまで setOrderNotes は列が無く監査のみだった（mock は in-memory 保持）。本 migration で
-- DB に列を追加し、Supabase write repository が mock と同じ契約で永続化できるようにする。
--
-- 方針:
--   * 0001-0005 は変更しない（追加 migration）。適用済み migration は書き換えない規約に従う。
--   * RLS は provisional_orders の既存ポリシー（is_org_member, 0004）が新列にもそのまま適用される。
--     注文は組織メンバーのみ読み書き可。原価/利益のような機微列ではないため front_staff も可。
--   * 論理削除（deleted_at）との整合: 列はメタ情報であり deleted_at とは独立。論理削除済み注文の
--     メモは保持され、復元時もそのまま残る（注文本体の soft-delete 規約に追従）。
--   * 操作履歴: メモ更新は audit_logs に action='note_update' で記録される（アプリ層 writeAudit）。
--     列 notes_updated_by / notes_updated_at は「最後に誰がいつ更新したか」を注文行に保持する。

alter table provisional_orders
  add column if not exists customer_note text,
  add column if not exists internal_note text,
  add column if not exists notes_updated_by uuid references profiles(id),
  add column if not exists notes_updated_at timestamptz;

comment on column provisional_orders.customer_note is '顧客向けメモ（組織メンバー閲覧可）';
comment on column provisional_orders.internal_note is '内部メモ（組織メンバー閲覧可。原価/利益のような機微情報は入れない）';
comment on column provisional_orders.notes_updated_by is 'メモ最終更新者（profiles.id）';
comment on column provisional_orders.notes_updated_at is 'メモ最終更新日時';
