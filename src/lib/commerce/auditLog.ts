import type { AuditEntry } from "@/repositories/core/writeModels";

/**
 * 操作履歴（監査ログ）の絞り込み条件。すべて任意で、空文字・空白のみは未指定として扱う。
 * - actor / action / entityType: 完全一致（ファセット選択用）
 * - query: actorId / action / entityType / entityId / summary を対象にした部分一致（大小無視）
 * - from / to: `YYYY-MM-DD`。createdAt の日付部分との辞書順比較で範囲内（両端含む）
 */
export type AuditLogFilter = {
  actor?: string;
  action?: string;
  entityType?: string;
  query?: string;
  from?: string;
  to?: string;
};

/** createdAt 降順（新しい順）に安定ソートした新しい配列を返す。入力配列は変更しない。 */
export function sortAuditEntriesDesc(entries: AuditEntry[]): AuditEntry[] {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      if (a.entry.createdAt < b.entry.createdAt) return 1;
      if (a.entry.createdAt > b.entry.createdAt) return -1;
      return a.index - b.index;
    })
    .map(({ entry }) => entry);
}

/** ドロップダウン用の重複なしファセット（ロケール昇順）。 */
export function auditFilterFacets(entries: AuditEntry[]): {
  actors: string[];
  actions: string[];
  entityTypes: string[];
} {
  const actors = new Set<string>();
  const actions = new Set<string>();
  const entityTypes = new Set<string>();
  for (const entry of entries) {
    if (entry.actorId) actors.add(entry.actorId);
    if (entry.action) actions.add(entry.action);
    if (entry.entityType) entityTypes.add(entry.entityType);
  }
  const sorted = (set: Set<string>) => [...set].sort((a, b) => a.localeCompare(b));
  return { actors: sorted(actors), actions: sorted(actions), entityTypes: sorted(entityTypes) };
}

/** 監査ログを条件で絞り込む（純粋関数）。入力配列は変更しない。 */
export function filterAuditEntries(entries: AuditEntry[], filter: AuditLogFilter): AuditEntry[] {
  const actor = normalize(filter.actor);
  const action = normalize(filter.action);
  const entityType = normalize(filter.entityType);
  const query = normalize(filter.query)?.toLowerCase();
  const from = normalize(filter.from);
  const to = normalize(filter.to);

  return entries.filter((entry) => {
    if (actor && entry.actorId !== actor) return false;
    if (action && entry.action !== action) return false;
    if (entityType && entry.entityType !== entityType) return false;

    if (from || to) {
      const day = entry.createdAt.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
    }

    if (query) {
      const haystack = [entry.actorId, entry.action, entry.entityType, entry.entityId, entry.summary ?? ""]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    return true;
  });
}

/** 何らかの絞り込み条件が指定されているか（「該当なし」と「履歴ゼロ」を区別するため）。 */
export function hasActiveAuditFilter(filter: AuditLogFilter): boolean {
  return Boolean(
    normalize(filter.actor) ||
      normalize(filter.action) ||
      normalize(filter.entityType) ||
      normalize(filter.query) ||
      normalize(filter.from) ||
      normalize(filter.to),
  );
}

function normalize(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/** RFC4180 のセル: ダブルクォートで囲み内部の " を "" にエスケープ（カンマ/改行/引用符を安全化）。 */
function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/** 監査ログを CSV 文字列へ変換する（owner の記録出力用。ヘッダ + CRLF 区切り）。 */
export function auditEntriesToCsv(entries: AuditEntry[]): string {
  const header = ["createdAt", "actorId", "action", "entityType", "entityId", "summary"];
  const lines = [header.map(csvCell).join(",")];
  for (const entry of entries) {
    lines.push(
      [entry.createdAt, entry.actorId, entry.action, entry.entityType, entry.entityId, entry.summary ?? ""]
        .map(csvCell)
        .join(","),
    );
  }
  return lines.join("\r\n");
}
