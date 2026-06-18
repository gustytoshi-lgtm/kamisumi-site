-- 0009_payment_details.sql
-- Phase 2B: 入金（payments, 0003）に入金種別 / 予定金額 / 照合番号 / 入金日時を追加する。
-- 方針:
--   * 0001-0008 は変更しない（追加 migration）。
--   * RLS は payments_owner（0004）が owner に限定（front_staff は入金・会計情報を見ない）。
--   * 実銀行口座番号は保存しない。照合番号（matching_number）は振込照合用の任意文字列。
--   * 状態 CHECK（unbilled/.../refunded）は 0003 で定義済み（paymentStatus.ts と一致）。

alter table payments
  add column if not exists payment_type text,
  add column if not exists expected_amount_minor bigint,
  add column if not exists matching_number text,
  add column if not exists paid_at timestamptz;

comment on column payments.payment_type is '入金種別（bank_transfer/cash/other 等。実口座番号は持たない）';
comment on column payments.expected_amount_minor is '予定金額（最小通貨単位の整数）';
comment on column payments.matching_number is '振込照合番号（任意。実口座番号ではない）';
comment on column payments.paid_at is '入金日時（confirmed_at は確認日時とは別）';
