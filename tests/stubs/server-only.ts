// テスト環境用の `server-only` no-op スタブ。
// 本番/ビルドでは実 `server-only` がクライアントバンドルへの誤混入を検知して throw するが、
// vitest（jsdom）はそのマーカーを解決できないため、ここで空モジュールに alias する
// （vitest.config.ts の resolve.alias 参照）。サーバー専用境界の意味は本番ビルドで担保される。
export {};
